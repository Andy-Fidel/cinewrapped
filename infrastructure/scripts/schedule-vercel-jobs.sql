-- Apply after the production API passes readiness and unauthorized-job checks.
-- Enable pg_cron and pg_net in Supabase before running this script.
-- Store cinewrapped_api_url (https://<production-api>.vercel.app) and
-- cinewrapped_cron_secret (the API's CRON_SECRET) in Supabase Vault first.
-- Secrets must never be embedded in this file or in cron.job.command.

SELECT cron.schedule('cinewrapped-outbox', '* * * * *', $job$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cinewrapped_api_url') || '/api/v1/internal/jobs/run',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cinewrapped_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  )
  WHERE EXISTS (
    SELECT 1 FROM public.outbox_events
    WHERE "attemptCount" < 10 AND (
      (status IN ('PENDING', 'FAILED') AND "availableAt" <= NOW())
      OR (status = 'PROCESSING' AND "lockedAt" < NOW() - INTERVAL '10 minutes')
    )
  );
$job$);

SELECT cron.schedule('cinewrapped-cache-cleanup', '0 * * * *', $job$
  DELETE FROM cinewrapped_internal.cache_entries WHERE expires_at <= NOW();
  DELETE FROM cinewrapped_internal.rate_limits WHERE expires_at <= NOW();
  -- Imported library records remain; remove only completed/cancelled job payload copies.
  DELETE FROM public.outbox_events WHERE "aggregateType" = 'data-import'
    AND status = 'PUBLISHED' AND "publishedAt" < NOW() - INTERVAL '7 days';
  DELETE FROM public.outbox_events WHERE "aggregateType" = 'notification'
    AND status = 'PUBLISHED' AND "publishedAt" < NOW() - INTERVAL '30 days';
$job$);
