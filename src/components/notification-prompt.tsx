'use client';

import { useEffect, useCallback, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useLanguage, getT } from '@/lib/i18n/context';
import { toast } from 'sonner';

const DISMISSED_KEY = 'notif_prompt_dismissed';
const REMIND_INTERVAL = 5 * 60 * 1000; // 5 minutes

function getDismissedAt(): number {
  try {
    return parseInt(localStorage.getItem(DISMISSED_KEY) || '0', 10) || 0;
  } catch {
    return 0;
  }
}

function setDismissedAt(ts: number) {
  try {
    localStorage.setItem(DISMISSED_KEY, ts.toString());
  } catch { /* ignore */ }
}

function canShow(): boolean {
  const perm = typeof Notification !== 'undefined' ? Notification.permission : 'denied';
  if (perm === 'granted') return false;

  const dismissedAt = getDismissedAt();
  if (dismissedAt === 0) return true;

  return Date.now() - dismissedAt >= REMIND_INTERVAL;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

interface NotificationPromptProps {
  visible: boolean;
}

export function NotificationPrompt({ visible }: NotificationPromptProps) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { lang } = useLanguage();
  const t = getT(lang);

  const handleEnable = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      toast.error(lang === 'ar' ? 'متصفحك لا يدعم الإشعارات' : 'Your browser does not support notifications');
      return;
    }

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      toast.error(lang === 'ar' ? 'خدمة الإشعارات غير متوفرة حالياً' : 'Notification service is currently unavailable');
      return;
    }

    try {
      const permission = await Notification.requestPermission();

      if (permission === 'denied') {
        toast.error(t('push.denied'));
        setDismissedAt(Date.now());
        return;
      }

      if (permission !== 'granted') return;

      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription }),
      });

      if (res.ok) {
        toast.success(t('push.enabled'));
        try { localStorage.removeItem(DISMISSED_KEY); } catch { /* ignore */ }
      } else {
        toast.error(lang === 'ar' ? 'فشل في تسجيل الإشعارات' : 'Failed to register notifications');
      }
    } catch (err) {
      console.warn('[Push] Enable failed:', err);
      toast.error(lang === 'ar' ? 'حدث خطأ أثناء تفعيل الإشعارات' : 'An error occurred while enabling notifications');
    }
  }, [lang, t]);

  const showToast = useCallback(() => {
    if (!visible || !canShow()) return;

    toast(lang === 'ar' ? t('push.title') : t('push.title'), {
      description: t('push.description'),
      duration: 15000,
      action: {
        label: (
          <span className="inline-flex items-center gap-1.5">
            <Bell className="size-3.5" />
            {t('push.enable')}
          </span>
        ) as unknown as string,
        onClick: () => {
          toast.dismiss();
          handleEnable();
        },
      },
      onDismiss: () => {
        setDismissedAt(Date.now());
      },
    });
  }, [visible, lang, t, handleEnable]);

  // Show toast on mount + poll every 5 minutes
  useEffect(() => {
    // Small delay so the page loads first
    const timeout = setTimeout(showToast, 2000);

    timerRef.current = setInterval(showToast, REMIND_INTERVAL);

    return () => {
      clearTimeout(timeout);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [showToast]);

  // This component no longer renders anything — it only triggers a toast
  return null;
}
