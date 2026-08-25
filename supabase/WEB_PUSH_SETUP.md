# Web Push setup

Simpan secret berikut di Supabase Edge Functions Secrets. Jangan pernah menyimpan `VAPID_PRIVATE_KEY` atau `PUSH_CRON_SECRET` di kode frontend.

```text
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@your-domain.example
PUSH_CRON_SECRET=...
```

Tambahkan `VAPID_PUBLIC_KEY` yang sama sebagai `VITE_PUSH_VAPID_PUBLIC_KEY` pada environment frontend saat build.

Setelah fungsi `send-push-reminders` dideploy, simpan URL project dan `PUSH_CRON_SECRET` ke Vault. Lalu buat cron job setiap menit melalui SQL Editor:

```sql
select vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'push_project_url');
select vault.create_secret('YOUR_RANDOM_PUSH_CRON_SECRET', 'push_cron_secret');

select cron.schedule(
  'send-push-reminders-every-minute',
  '* * * * *',
  $$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'push_project_url') || '/functions/v1/send-push-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'push_cron_secret')
      ),
      body := '{}'::jsonb
    );
  $$
);
```

Terakhir, deploy migration dan Edge Function:

```bash
supabase db push
supabase functions deploy send-push-reminders --no-verify-jwt
```
