-- Superadmin visibility into email delivery, and a cross-tenant way to create
-- a one-time password-reset link so a locked-out customer can be rescued even
-- when SMTP is not configured yet.
--
-- The mail stats are metadata only (counts, subjects, recipients, last error).
-- The reset-link function returns the one-time token to the caller so it can
-- be delivered by hand (text, call, chat) when email delivery is broken.

create function superadmin_mail_status()
  returns table (
    pending       bigint,
    failed        bigint,
    sent_24h      bigint,
    oldest_pending_at timestamptz,
    pending_alert  bigint,
    pending_weekly bigint,
    pending_invite bigint,
    pending_reset  bigint,
    mail_last_ok_at  timestamptz,
    mail_last_err_at timestamptz,
    mail_last_error  text
  )
  language sql stable security definer set search_path = public as $$
    select
      (select count(*) from outbox where sent_at is null),
      (select count(*) from outbox where sent_at is null and last_error is not null and last_error <> ''),
      (select count(*) from outbox where sent_at > now() - interval '24 hours'),
      (select min(created_at) from outbox where sent_at is null),
      (select count(*) from outbox where sent_at is null and kind = 'alert'),
      (select count(*) from outbox where sent_at is null and kind = 'weekly'),
      (select count(*) from outbox where sent_at is null and kind = 'invite'),
      (select count(*) from outbox where sent_at is null and kind = 'reset'),
      (select last_ok_at  from job_runs where job = 'mail_send'),
      (select last_err_at from job_runs where job = 'mail_send'),
      (select last_error  from job_runs where job = 'mail_send')
  $$;

create function superadmin_outbox_recent(p_limit int default 50)
  returns table (
    id          bigint,
    kind        text,
    to_email    text,
    subject     text,
    attempts    integer,
    last_error  text,
    created_at  timestamptz,
    next_try_at timestamptz,
    msp_id      uuid,
    msp_name    text
  )
  language sql stable security definer set search_path = public as $$
    select o.id, o.kind, o.to_email, o.subject, o.attempts, o.last_error,
           o.created_at, o.next_try_at, o.msp_id, m.name
    from outbox o join msps m on m.id = o.msp_id
    where o.sent_at is null
    order by o.created_at
    limit greatest(1, least(coalesce(p_limit, 50), 500))
  $$;

-- Looks up a user by email across every tenant (there can only be one; the
-- users table has a unique index on email). Returns the id and company so the
-- rescue flow can audit who changed what.
create function superadmin_user_by_email(p_email text)
  returns table (user_id uuid, msp_id uuid, email text, msp_name text, name text)
  language sql stable security definer set search_path = public as $$
    select u.id, u.msp_id, u.email, m.name, u.name
    from users u join msps m on m.id = u.msp_id
    where u.email = lower(p_email)
  $$;

-- Creates a one-time password reset link for a specific user, cross-tenant,
-- bypassing the outbox so a superadmin can deliver it by hand. Supersedes any
-- earlier reset for that user. Returns the stored id and the time the link
-- expires; the random half of the token stays only in the caller's URL.
create function superadmin_create_reset(p_user_id uuid, p_msp_id uuid, p_token_hash bytea, p_minutes int)
  returns table (reset_id uuid, expires_at timestamptz)
  language plpgsql volatile security definer set search_path = public as $$
  declare r record;
  begin
    delete from password_resets where user_id = p_user_id;
    insert into password_resets (msp_id, user_id, token_hash, expires_at)
      values (p_msp_id, p_user_id, p_token_hash, now() + make_interval(mins => greatest(5, least(coalesce(p_minutes, 60), 1440))))
      returning id, password_resets.expires_at into r;
    return query select r.id, r.expires_at;
  end $$;

do $$
declare fn text;
begin
  foreach fn in array array[
    'superadmin_mail_status()',
    'superadmin_outbox_recent(int)',
    'superadmin_user_by_email(text)',
    'superadmin_create_reset(uuid, uuid, bytea, int)'
  ] loop
    execute format('revoke all on function %s from public', fn);
    execute format('grant execute on function %s to zinloop_app', fn);
  end loop;
end $$;
