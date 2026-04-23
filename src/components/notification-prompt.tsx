'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, BellRing, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  const [show, setShow] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [slideIn, setSlideIn] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { lang } = useLanguage();
  const t = getT(lang);

  // Check if we should show the prompt
  const checkShow = useCallback(() => {
    if (visible && canShow()) {
      setShow(true);
      // Animate in
      requestAnimationFrame(() => setSlideIn(true));
    } else {
      setSlideIn(false);
      setTimeout(() => setShow(false), 200);
    }
  }, [visible]);

  // Initial check + 5-min polling
  useEffect(() => {
    checkShow();

    // Poll every 5 minutes to re-show if dismissed
    timerRef.current = setInterval(checkShow, REMIND_INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [checkShow]);

  // Also re-check every 30 seconds for more responsiveness
  useEffect(() => {
    const shortPoll = setInterval(checkShow, 30000);
    return () => clearInterval(shortPoll);
  }, [checkShow]);

  const handleEnable = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      toast.error(lang === 'ar' ? 'متصفحك لا يدعم الإشعارات' : 'Your browser does not support notifications');
      return;
    }

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      toast.error(lang === 'ar' ? 'خدمة الإشعارات غير متوفرة حالياً' : 'Notification service is currently unavailable');
      return;
    }

    setEnabling(true);

    try {
      // Request permission first
      const permission = await Notification.requestPermission();

      if (permission === 'denied') {
        toast.error(t('push.denied'));
        // Dismiss for 5 minutes
        setDismissedAt(Date.now());
        setSlideIn(false);
        setTimeout(() => setShow(false), 200);
        setEnabling(false);
        return;
      }

      if (permission !== 'granted') {
        setEnabling(false);
        return;
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      // Send subscription to server
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription }),
      });

      if (res.ok) {
        toast.success(t('push.enabled'));
        // Remove dismissed state since we succeeded
        try { localStorage.removeItem(DISMISSED_KEY); } catch { /* ignore */ }
        setSlideIn(false);
        setTimeout(() => setShow(false), 200);
      } else {
        toast.error(lang === 'ar' ? 'فشل في تسجيل الإشعارات' : 'Failed to register notifications');
      }
    } catch (err) {
      console.warn('[Push] Enable failed:', err);
      toast.error(lang === 'ar' ? 'حدث خطأ أثناء تفعيل الإشعارات' : 'An error occurred while enabling notifications');
    } finally {
      setEnabling(false);
    }
  };

  const handleDismiss = () => {
    setDismissedAt(Date.now());
    setSlideIn(false);
    setTimeout(() => setShow(false), 200);
  };

  if (!show) return null;

  return (
    <div
      className={`fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-[60] transition-all duration-300 ease-out ${
        slideIn ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
      }`}
    >
      <div className="rounded-xl border bg-card p-4 shadow-2xl ring-1 ring-emerald-500/20">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
            <BellRing className="size-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">{t('push.title')}</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {t('push.description')}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="shrink-0 p-1 rounded-md hover:bg-muted transition-colors"
          >
            <X className="size-4 text-muted-foreground" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3">
          <Button
            size="sm"
            onClick={handleEnable}
            disabled={enabling}
            className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 h-9 px-4 text-xs font-medium"
          >
            {enabling ? (
              <>
                <div className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {lang === 'ar' ? 'جاري التفعيل...' : 'Enabling...'}
              </>
            ) : (
              <>
                <Bell className="size-3.5" />
                {t('push.enable')}
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-xs text-muted-foreground hover:text-foreground h-9"
          >
            {t('push.dismiss')}
          </Button>
        </div>
      </div>
    </div>
  );
}
