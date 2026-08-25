// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

type PushSubscriptionRecord = {
  endpoint: string;
  subscription: webpush.PushSubscription;
};

function getSecretKey() {
  const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}') as Record<string, string>;
  return secretKeys.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
}

function jakartaNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date()).reduce<Record<string, string>>((result, part) => {
    result[part.type] = part.value;
    return result;
  }, {});
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

function notificationPayload(studentName: string, category: string) {
  return JSON.stringify({
    title: 'Pengingat Jurnal Guru',
    body: `Waktu pemanggilan ${studentName} (${category})`,
    url: '/',
  });
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (request.headers.get('x-cron-secret') !== Deno.env.get('PUSH_CRON_SECRET')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const secretKey = getSecretKey();
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const vapidSubject = Deno.env.get('VAPID_SUBJECT');
  if (!secretKey || !vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return Response.json({ error: 'Push notification secrets are not configured.' }, { status: 500 });
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, secretKey);
  const { date, time } = jakartaNow();
  const { data: cases, error: casesError } = await supabase
    .from('kasus_records')
    .select('id, student_name, category, user_id')
    .eq('tanggal_pemanggilan', date)
    .eq('waktu_pemanggilan', time)
    .neq('status', 'selesai');
  if (casesError) return Response.json({ error: casesError.message }, { status: 500 });

  let sent = 0;
  for (const kasus of cases || []) {
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('push_subscriptions')
      .select('endpoint, subscription')
      .eq('user_id', kasus.user_id);
    if (subscriptionsError) continue;

    for (const item of (subscriptions || []) as PushSubscriptionRecord[]) {
      const { data: existing } = await supabase
        .from('push_notification_deliveries')
        .select('id')
        .eq('kasus_id', kasus.id)
        .eq('endpoint', item.endpoint)
        .eq('scheduled_date', date)
        .eq('scheduled_time', time)
        .maybeSingle();
      if (existing) continue;

      try {
        await webpush.sendNotification(item.subscription, notificationPayload(kasus.student_name, kasus.category), { TTL: 60 });
        const { error: deliveryError } = await supabase.from('push_notification_deliveries').insert({
          kasus_id: kasus.id, endpoint: item.endpoint, scheduled_date: date, scheduled_time: time,
        });
        if (!deliveryError) sent += 1;
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', item.endpoint).eq('user_id', kasus.user_id);
        }
      }
    }
  }

  return Response.json({ date, time, sent });
});
