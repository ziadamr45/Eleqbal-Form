'use client';

import { useEffect, useCallback, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useLanguage, getT } from '@/lib/i18n/context';
import { toast } from 'sonner';

const DISMISSED_KEY = 'notif_prompt_dismissed';
const REMIND_INTERVAL = 5 * 60 * 1000; // 5 minutes
const PUSH_REGISTERED_KEY = 'push_registered';

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

// Try to register for push notifications (runs silently after permission is granted)
async function tryRegisterPush(): Promise<boolean> {
  try {
    // Check if already registered
    const alreadyRegistered = localStorage.getItem(PUSH_REGISTERED_KEY) === 'true';
    if (alreadyRegistered) return true;

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false;
    }

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return false;

    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    const existingSub = await registration.pushManager.getSubscription();
    if (existingSub) {
      localStorage.setItem(PUSH_REGISTERED_KEY, 'true');
      return true;
    }

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
      localStorage.setItem(PUSH_REGISTERED_KEY, 'true');
      return true;
    }
    return false;
  } catch (err) {
    console.warn('[Push] Registration failed:', err);
    return false;
  }
}

interface NotificationPromptProps {
  visible: boolean;
}

export function NotificationPrompt({ visible }: NotificationPromptProps) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasRequestedRef = useRef(false);

  const { lang } = useLanguage();
  const t = getT(lang);

  // Request notification permission from the browser
  const requestPermission = useCallback(async () => {
    if (hasRequestedRef.current) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'default') return;

    hasRequestedRef.current = true;

    try {
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        // Permission granted - try to register for push in the background
        const pushOk = await tryRegisterPush();
        if (pushOk) {
          toast.success(t('push.enabled'));
        }
        try { localStorage.removeItem(DISMISSED_KEY); } catch { /* ignore */ }
      } else if (permission === 'denied') {
        toast.error(t('push.denied'));
        setDismissedAt(Date.now());
      }
      // If 'default' (user dismissed the dialog without choosing), do nothing - will retry later
      else {
        hasRequestedRef.current = false;
      }
    } catch {
      hasRequestedRef.current = false;
    }
  }, [t]);

  const showToast = useCallback(() => {
    if (!visible || !canShow()) return;

    toast(lang === 'ar' ? t('push.title') : t('push.title'), {
      description: t('push.description'),
      duration: 10000,
      action: {
        label: (
          <span className="inline-flex items-center gap-1.5">
            <Bell className="size-3.5" />
            {t('push.enable')}
          </span>
        ) as unknown as string,
        onClick: () => {
          toast.dismiss();
          requestPermission();
        },
      },
      onDismiss: () => {
        setDismissedAt(Date.now());
      },
    });
  }, [visible, lang, t, requestPermission]);

  // Show toast reminder + auto-trigger browser permission dialog on first visit
  useEffect(() => {
    if (!visible) return;

    // Check current permission state
    const perm = typeof Notification !== 'undefined' ? Notification.permission : 'denied';
    if (perm === 'granted') {
      // Already granted, try push registration silently
      tryRegisterPush();
      return;
    }
    if (perm === 'denied') return;

    // Permission is 'default' - show toast and auto-trigger permission dialog
    const toastTimeout = setTimeout(showToast, 2000);
    // Auto-trigger the browser's native permission dialog after a short delay
    const autoTimeout = setTimeout(requestPermission, 4000);

    timerRef.current = setInterval(() => {
      if (canShow()) showToast();
    }, REMIND_INTERVAL);

    return () => {
      clearTimeout(toastTimeout);
      clearTimeout(autoTimeout);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [visible, showToast, requestPermission]);

  // This component no longer renders anything — it only triggers a toast
  return null;
}
