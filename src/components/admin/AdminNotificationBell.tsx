'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Bell, X, CheckCheck } from 'lucide-react';
import { useLanguage, getT } from '@/lib/i18n/context';
import { Button } from '@/components/ui/button';

interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function AdminNotificationBell() {
  const { lang, dir } = useLanguage();
  const t = getT(lang);
  const isRTL = dir === 'rtl';
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0, right: 0 });

  const fetchNotifs = async () => {
    try {
      const res = await fetch('/api/admin/admin-notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnread(data.unreadCount || 0);
      }
    } catch { /* ignore */ }
  };

  // Calculate fixed position based on button's location
  const updatePanelPosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const panelWidth = window.innerWidth >= 640 ? 384 : 320; // sm:w-96 = 384px, w-80 = 320px
    const gap = 8;
    const topPos = rect.bottom + gap;

    if (isRTL) {
      // RTL: position using `right` — align panel's right edge to button's right edge
      const rightPos = window.innerWidth - rect.right;
      const maxRight = window.innerWidth - panelWidth - gap;
      const clampedRight = Math.min(Math.max(rightPos, gap), maxRight);
      setPanelPos({ top: topPos, left: 0, right: clampedRight });
    } else {
      // LTR: position using `left` — align panel's left edge to button's left edge
      let leftPos = rect.left;
      leftPos = Math.min(leftPos, window.innerWidth - panelWidth - gap);
      leftPos = Math.max(leftPos, gap);
      setPanelPos({ top: topPos, left: leftPos, right: 0 });
    }
  }, [isRTL]);

  useEffect(() => { fetchNotifs(); }, []);

  useEffect(() => {
    if (open) {
      updatePanelPosition();
      window.addEventListener('resize', updatePanelPosition);
    }
    return () => window.removeEventListener('resize', updatePanelPosition);
  }, [open, updatePanelPosition]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const markAllRead = async () => {
    try {
      await fetch('/api/admin/admin-notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnread(0);
    } catch { /* ignore */ }
  };

  const formatTime = (dateStr: string) => {
    const now = Date.now();
    const diff = now - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return t('admin.justNow');
    if (minutes < 60) return t('admin.minutesAgo').replace('{n}', String(minutes));
    if (hours < 24) return t('admin.hoursAgo').replace('{n}', String(hours));
    return t('admin.daysAgo').replace('{n}', String(days));
  };

  const getIcon = (type: string) => {
    if (type === 'new_student') return '🆕';
    if (type === 'student_update') return '✏️';
    return '📢';
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => { setOpen(!open); if (!open) fetchNotifs(); }}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
        title={t('admin.adminNotifications')}
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className={`absolute -top-0.5 ${isRTL ? '-left-0.5' : '-right-0.5'} flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold`}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="fixed w-80 sm:w-96 bg-card border rounded-xl shadow-xl z-[100] overflow-hidden"
          style={isRTL
            ? { top: panelPos.top, right: panelPos.right }
            : { top: panelPos.top, left: panelPos.left }
          }
        >
          <div className="flex items-center justify-between p-3 border-b bg-muted/30">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Bell className="size-4 text-emerald-600" />
              {t('admin.adminNotifications')}
            </h3>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllRead} className="h-7 text-xs gap-1 text-emerald-600 hover:text-emerald-700">
                  <CheckCheck className="size-3" /> {t('admin.markAllRead')}
                </Button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-muted">
                <X className="size-3.5" />
              </button>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-muted-foreground">
                <Bell className="size-8 opacity-20 mb-2" />
                <p className="text-sm">{t('admin.noNotifications')}</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`flex items-start gap-2.5 px-3 py-2.5 border-b last:border-0 transition-colors ${!n.isRead ? 'bg-emerald-50/50 dark:bg-emerald-950/10' : ''}`}
                >
                  <span className="text-base shrink-0 mt-0.5">{getIcon(n.type)}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${!n.isRead ? 'font-semibold' : 'font-medium'}`}>{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{formatTime(n.createdAt)}</p>
                  </div>
                  {!n.isRead && (
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
