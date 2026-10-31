-- Zipax leaderboard: public profile now lists you by default (opt-out).
--
-- Migration 018 made the leaderboard opt-IN: leaderboard_opt_in defaulted to
-- false, so publishing a /p/{slug} profile left you off /leaderboard unless you
-- ticked a separate box. The product rule is now the reverse: having a public
-- profile puts you on the leaderboard, and the box is an opt-OUT. People who
-- want a shareable /p/{slug} link without being listed untick it.
--
-- Two changes, both narrow:
--   1. Flip the column default to true so new publishes are listed.
--   2. Backfill every already-published profile (slug set, non-empty dim
--      allow-list) to listed, so current profiles appear now. We can't tell a
--      deliberate pre-022 opt-out from a never-touched default in the data, so
--      all published rows are switched on; anyone who wants out unticks the box.
--
-- The zipax_public_leaderboard() function already filters on
-- leaderboard_opt_in = true, which is exactly the opt-out gate we keep. No
-- function change is needed.

alter table zipax_profile_prefs
  alter column leaderboard_opt_in set default true;

update zipax_profile_prefs
   set leaderboard_opt_in = true
 where public_slug is not null
   and array_length(public_dims, 1) is not null
   and array_length(public_dims, 1) > 0
   and leaderboard_opt_in = false;
