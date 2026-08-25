import { describe, expect, it } from 'vitest';
import { deliveryKey, getJakartaSchedule } from '../../supabase/functions/_shared/push-reminder';

describe('push reminder schedule', () => {
  it('uses Asia/Jakarta date and time', () => {
    expect(getJakartaSchedule(new Date('2026-08-25T16:05:00.000Z'))).toEqual({
      date: '2026-08-25',
      time: '23:05',
    });
  });

  it('keeps delivery identity unique per case, device, and schedule', () => {
    const first = deliveryKey('kasus-1', 'https://push.example/device-a', '2026-08-25', '09:00');
    const same = deliveryKey('kasus-1', 'https://push.example/device-a', '2026-08-25', '09:00');
    const changedTime = deliveryKey('kasus-1', 'https://push.example/device-a', '2026-08-25', '09:01');

    expect(first).toBe(same);
    expect(first).not.toBe(changedTime);
  });
});
