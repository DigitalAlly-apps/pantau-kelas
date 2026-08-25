import { supabase } from '@/lib/supabase';

function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from(raw, char => char.charCodeAt(0));
}

export async function enablePushNotifications(userId: string) {
  const vapidPublicKey = import.meta.env.VITE_PUSH_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) throw new Error('Notifikasi belum dikonfigurasi oleh pengelola aplikasi.');
  if (!supabase) throw new Error('Supabase belum terhubung.');
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    throw new Error('Perangkat atau browser ini belum mendukung notifikasi push.');
  }

  if (await Notification.requestPermission() !== 'granted') {
    throw new Error('Izin notifikasi belum diberikan.');
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint: subscription.endpoint,
    subscription: subscription.toJSON(),
  }, { onConflict: 'user_id,endpoint' });
  if (error) throw error;
}
