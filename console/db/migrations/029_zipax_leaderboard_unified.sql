-- Reconcile the facet and agent leaderboard contracts after the merge.
-- Keep all opt-in/privacy gates; apply every filter before ranking and LIMIT.
-- FORCE RLS also applies to the ordinary migration owner. Allow its
-- SECURITY DEFINER lookups to read these two tables, following 002_accounts.
-- The runtime app role retains tenant RLS and only receives function EXECUTE.
do $$ begin
  execute format('create policy owner_public_lookup on zipax_profile_prefs for select to %I using (true)', current_user);
  execute format('create policy owner_public_lookup on zipax_profile_scores for select to %I using (true)', current_user);
end $$;
drop function if exists zipax_public_leaderboard(integer, integer, text);
drop function if exists zipax_public_leaderboard(integer, integer, text[], text);
drop function if exists zipax_public_leaderboard(integer, integer, text[], text, text);
create function zipax_public_leaderboard(
  window_days integer default 30,
  max_rows    integer default 200,
  filter_countries text[] default null,
  filter_specialty text default null,
  only_tool text default ''
)
  returns table (
    msp_id            uuid,
    client_id         uuid,
    user_hash         text,
    display_name      text,
    public_slug       text,
    public_dims       text[],
    show_display_name boolean,
    show_mean_score   boolean,
    show_sessions     boolean,
    dim_scores        jsonb,
    mean_score        integer,
    sessions_counted  integer,
    primary_tool      text,
    tool_sessions     jsonb,
    country text,
    specialty text
  )
  language sql
  security definer
  stable
  as $$
    with
      capped as (
        select greatest(1, least(window_days, 365)) as days,
               greatest(1, least(max_rows, 500))    as rows,
               nullif(lower(trim(only_tool)), '')   as tool_filter
      ),
      prefs as (
        select msp_id, client_id, user_hash, display_name, public_slug, public_dims,
               show_display_name, show_mean_score, show_sessions, country, specialty
          from zipax_profile_prefs
          where public_slug is not null
            and leaderboard_opt_in = true
            and (filter_countries is null or country = any(filter_countries))
            and (filter_specialty is null or specialty = filter_specialty)
            and array_length(public_dims, 1) is not null
            and array_length(public_dims, 1) > 0
      ),
      -- Per-tool session counts in the window. Used to pick the primary
      -- tool and expose the full map to the UI. Filtered by only_tool so
      -- a filtered view ranks on the sessions that match the filter.
      tools as (
        select s.msp_id, s.user_hash, s.tool, sum(s.sessions)::bigint as sessions
          from zipax_profile_scores s, capped
          where s.bucket_day >= (current_date - make_interval(days => capped.days))
            and (capped.tool_filter is null or s.tool = capped.tool_filter)
          group by s.msp_id, s.user_hash, s.tool
      ),
      tool_pick as (
        select msp_id, user_hash,
               coalesce(jsonb_object_agg(tool, sessions), '{}'::jsonb)       as tool_sessions,
               (array_agg(tool order by sessions desc, tool asc))[1]         as primary_tool
          from tools
          group by msp_id, user_hash
      ),
      scores as (
        select s.msp_id, s.user_hash, s.dimension,
               avg(s.score)::numeric as score,
               sum(s.sessions)       as sessions
          from zipax_profile_scores s, capped
          where s.bucket_day >= (current_date - make_interval(days => capped.days))
            and (capped.tool_filter is null or s.tool = capped.tool_filter)
          group by s.msp_id, s.user_hash, s.dimension
      ),
      per_user as (
        select p.msp_id, p.client_id, p.user_hash, p.display_name, p.public_slug, p.public_dims,
               p.show_display_name, p.show_mean_score, p.show_sessions, p.country, p.specialty,
               (
                 select coalesce(jsonb_object_agg(sc.dimension, round(sc.score)::int), '{}'::jsonb)
                   from scores sc
                   where sc.msp_id = p.msp_id and sc.user_hash = p.user_hash
                     and sc.dimension = any(p.public_dims)
               ) as dim_scores,
               coalesce(
                 (
                   select round(avg(sc.score))::int
                     from scores sc
                     where sc.msp_id = p.msp_id and sc.user_hash = p.user_hash
                       and sc.dimension = any(p.public_dims)
                 ),
                 0
               ) as mean_score,
               coalesce(
                 (
                   select sum(sc.sessions)::int
                     from scores sc
                     where sc.msp_id = p.msp_id and sc.user_hash = p.user_hash
                       and sc.dimension = any(p.public_dims)
                 ),
                 0
               ) as sessions_counted,
               tp.primary_tool,
               coalesce(tp.tool_sessions, '{}'::jsonb) as tool_sessions
          from prefs p
          left join tool_pick tp on tp.msp_id = p.msp_id and tp.user_hash = p.user_hash
      )
    select msp_id, client_id, user_hash, display_name, public_slug, public_dims,
           show_display_name, show_mean_score, show_sessions,
           dim_scores, mean_score, sessions_counted,
           primary_tool, tool_sessions, country, specialty
      from per_user, capped
      where sessions_counted > 0
      order by mean_score desc, sessions_counted desc, user_hash asc
      limit (select rows from capped);
  $$;
revoke all on function zipax_public_leaderboard(integer, integer, text[], text, text) from public;
grant execute on function zipax_public_leaderboard(integer, integer, text[], text, text) to zinloop_app;


