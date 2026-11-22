-- Zipax public-leaderboard facets: self-declared country + specialty.
--
-- The public leaderboard at zipax.zinloop.com gains three filters: region,
-- country, and specialty ("task"). Country and specialty are opt-in fields the
-- developer sets on their own profile in /zipax/settings; region is a country
-- grouping computed in the app (so no separate stored column). The scanner
-- never collects location — both fields stay empty until the developer picks
-- them, and an empty value simply means "unfiltered / not shown".
--
-- Region filtering is done by the app expanding a chosen region into the set of
-- country codes it contains and passing them as filter_countries. That keeps
-- the (long, churny) country->region table in one place in TypeScript instead
-- of duplicated in SQL.

alter table zipax_profile_prefs
  add column if not exists country   text not null default ''
    check (country = '' or country ~ '^[a-z]{2}$'),
  add column if not exists specialty text not null default ''
    check (length(specialty) <= 32);

-- Recreate the cross-tenant leaderboard with country + specialty in the output
-- and optional server-side filters. Based on the migration-018 definition
-- (which added the show_* toggles and the leaderboard_opt_in gate); this keeps
-- all of that and adds the two facet columns plus two filter params.
drop function if exists zipax_public_leaderboard(integer, integer);

create function zipax_public_leaderboard(
    window_days integer default 30,
    max_rows integer default 200,
    filter_countries text[] default null,
    filter_specialty text default null
  )
  returns table (
    msp_id uuid,
    client_id uuid,
    user_hash text,
    display_name text,
    public_slug text,
    public_dims text[],
    show_display_name boolean,
    show_mean_score boolean,
    show_sessions boolean,
    country text,
    specialty text,
    dim_scores jsonb,
    mean_score integer,
    sessions_counted integer
  )
  language sql
  security definer
  stable
  as $$
    with
      capped as (
        select greatest(1, least(window_days, 365)) as days,
               greatest(1, least(max_rows, 500))    as rows
      ),
      prefs as (
        select msp_id, client_id, user_hash, display_name, public_slug, public_dims,
               show_display_name, show_mean_score, show_sessions, country, specialty
          from zipax_profile_prefs
          where public_slug is not null
            and leaderboard_opt_in = true
            and array_length(public_dims, 1) is not null
            and array_length(public_dims, 1) > 0
            -- Optional facet filters. Null means "no filter". An empty-string
            -- country/specialty row is excluded whenever a filter is active,
            -- because '' is never a member of filter_countries and never
            -- equals a real filter_specialty.
            and (filter_countries is null or country = any(filter_countries))
            and (filter_specialty is null or specialty = filter_specialty)
      ),
      scores as (
        select s.msp_id, s.user_hash, s.dimension,
               avg(s.score)::numeric as score,
               sum(s.sessions)       as sessions
          from zipax_profile_scores s, capped
          where s.bucket_day >= (current_date - make_interval(days => capped.days))
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
               ) as sessions_counted
          from prefs p
      )
    select msp_id, client_id, user_hash, display_name, public_slug, public_dims,
           show_display_name, show_mean_score, show_sessions, country, specialty,
           dim_scores, mean_score, sessions_counted
      from per_user, capped
      where sessions_counted > 0
      order by mean_score desc, sessions_counted desc, user_hash asc
      limit (select rows from capped);
  $$;
revoke all on function zipax_public_leaderboard(integer, integer, text[], text) from public;
grant execute on function zipax_public_leaderboard(integer, integer, text[], text) to zinloop_app;
