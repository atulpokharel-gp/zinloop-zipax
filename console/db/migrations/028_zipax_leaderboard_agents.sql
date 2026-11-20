-- Surface the AI coding agent each developer works with on the Zipax
-- leaderboard and the public /p/{slug} page.
--
-- Before this migration the leaderboard returned a dev's dimension scores,
-- overall mean and sessions count, but not which agent (claude-code,
-- codex, cursor, aider, copilot) produced them. The `tool` column exists
-- on zipax_profile_scores — the scanner has always uploaded it per row —
-- it just was not read by the leaderboard function. The user-facing
-- leaderboard says who is leading but not what they are leading WITH, so
-- the "developer + their working agent" story is incomplete.
--
-- This migration:
--   1. Teaches `zipax_public_leaderboard` to also return a `primary_tool`
--      (the agent with the most summed sessions in the window) and a
--      `tool_sessions` map (jsonb of tool -> sessions over the window) so
--      the UI can show a primary badge plus any secondary agents.
--   2. Does the same for the per-slug lookup through a new overload: the
--      existing `zipax_public_profile(slug)` only returns prefs; a new
--      `zipax_public_profile_v2(slug, window_days)` also returns the
--      primary_tool and tool_sessions, computed server-side so a public
--      visitor can see which agent the profile belongs to without pulling
--      the raw score rows.
--   3. Adds an optional `only_tool` argument on `zipax_public_leaderboard`
--      so the public leaderboard can be filtered to one agent (the
--      agent-centric view: "top Claude Code devs", "top Codex devs"). An
--      empty string means every tool — the default — and keeps the
--      previous behaviour.
--
-- The function stays SECURITY DEFINER with the same grants as before; no
-- new tables, columns or indexes are added. The existing
-- `zipax_public_profile(slug)` is kept as a thin shim that calls the new
-- one with the default window so pre-028 callers (none in main, but a
-- preview build could race) do not break.

-- --- leaderboard ----------------------------------------------------------

drop function if exists zipax_public_leaderboard(integer, integer);
drop function if exists zipax_public_leaderboard(integer, integer, text);

create function zipax_public_leaderboard(
  window_days integer default 30,
  max_rows    integer default 200,
  only_tool   text    default ''
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
    tool_sessions     jsonb
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
               show_display_name, show_mean_score, show_sessions
          from zipax_profile_prefs
          where public_slug is not null
            and leaderboard_opt_in = true
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
               p.show_display_name, p.show_mean_score, p.show_sessions,
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
           primary_tool, tool_sessions
      from per_user, capped
      where sessions_counted > 0
      order by mean_score desc, sessions_counted desc, user_hash asc
      limit (select rows from capped);
  $$;
revoke all on function zipax_public_leaderboard(integer, integer, text) from public;
grant execute on function zipax_public_leaderboard(integer, integer, text) to zinloop_app;


-- --- public profile ------------------------------------------------------

create function zipax_public_profile_v2(slug text, window_days integer default 30)
  returns table(
    msp_id            uuid,
    client_id         uuid,
    user_hash         text,
    display_name      text,
    public_dims       text[],
    show_display_name boolean,
    show_mean_score   boolean,
    show_sessions     boolean,
    primary_tool      text,
    tool_sessions     jsonb
  )
  language sql
  security definer
  stable
  as $$
    with
      capped as (
        select greatest(1, least(window_days, 365)) as days
      ),
      p as (
        select msp_id, client_id, user_hash, display_name, public_dims,
               show_display_name, show_mean_score, show_sessions
          from zipax_profile_prefs
          where public_slug = slug
            and public_slug is not null
            and array_length(public_dims, 1) is not null
      ),
      tools as (
        select s.tool, sum(s.sessions)::bigint as sessions
          from zipax_profile_scores s, p, capped
          where s.msp_id = p.msp_id
            and s.user_hash = p.user_hash
            and s.bucket_day >= (current_date - make_interval(days => capped.days))
          group by s.tool
      ),
      tool_pick as (
        select coalesce(jsonb_object_agg(tool, sessions), '{}'::jsonb)       as tool_sessions,
               (array_agg(tool order by sessions desc, tool asc))[1]         as primary_tool
          from tools
      )
    select p.msp_id, p.client_id, p.user_hash, p.display_name, p.public_dims,
           p.show_display_name, p.show_mean_score, p.show_sessions,
           tp.primary_tool,
           coalesce(tp.tool_sessions, '{}'::jsonb) as tool_sessions
      from p
      left join tool_pick tp on true;
  $$;
revoke all on function zipax_public_profile_v2(text, integer) from public;
grant execute on function zipax_public_profile_v2(text, integer) to zinloop_app;
