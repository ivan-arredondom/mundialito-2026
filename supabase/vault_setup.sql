-- ─── Supabase Vault Setup ────────────────────────────────────────────────────
-- Run each statement in the Supabase SQL editor (one at a time).
-- Requires the Vault extension: Dashboard → Database → Extensions → Vault → Enable.
--
-- After running, confirm with:
--   select name from vault.decrypted_secrets;

-- BSD sports API token
select vault.create_secret(
  '20ed6b806cf31f8ac9b9b46825e993ee72187119',
  'bsd_api_key',
  'BSD sports API token for live scores'
);

-- football-data.org API key (fallback)
-- Replace <your-football-data-key> with the value from your .env.local
select vault.create_secret(
  '<your-football-data-key>',
  'football_data_api_key',
  'football-data.org API key (results sync fallback)'
);

-- BSD World Cup 2026 league ID (found via GET /api/v2/leagues/?name=world+cup)
select vault.create_secret(
  '27',
  'wc_league_id_bsd',
  'BSD league ID for World Cup 2026'
);

-- BSD World Cup 2026 season ID
select vault.create_secret(
  '188',
  'wc_season_id_bsd',
  'BSD season ID for World Cup 2026'
);

-- Edge function URL — used by pg_cron to call the sync-scores function
select vault.create_secret(
  'https://ksozjzzsivsopgnnczay.supabase.co/functions/v1/sync-scores',
  'edge_function_url',
  'sync-scores edge function URL'
);

-- Service role key — used by pg_cron to authenticate the edge function call
-- Replace <your-service-role-key> with the value from your .env.local
select vault.create_secret(
  '<your-service-role-key>',
  'supabase_service_role_key',
  'Supabase service role key (for pg_cron → edge function auth)'
);
