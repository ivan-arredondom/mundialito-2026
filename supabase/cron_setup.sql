-- ─── pg_cron + pg_net Setup ──────────────────────────────────────────────────
-- Run in the Supabase SQL editor AFTER running vault_setup.sql.
--
-- Prerequisites (Dashboard → Database → Extensions):
--   • pg_cron  — enable it
--   • pg_net   — enable it
--
-- This schedules the sync-scores edge function to run every 15 minutes.
-- The URL and auth token are pulled from Vault at runtime so no secrets
-- are hard-coded in this SQL file.

select cron.schedule(
  'sync-match-scores',     -- job name (must be unique)
  '*/15 * * * *',          -- every 15 minutes
  $$
  select net.http_post(
    url     := (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'edge_function_url'
    ),
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'supabase_service_role_key'
      )
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- Verify the job was created:
--   select * from cron.job;

-- To remove the job later:
--   select cron.unschedule('sync-match-scores');
