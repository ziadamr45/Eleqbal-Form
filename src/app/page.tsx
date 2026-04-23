'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, GraduationCap, User, Pencil, Trash2, Plus, AlertTriangle, Bell, X, Check, Megaphone } from 'lucide-react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { LoginForm } from '@/components/login-form';
import { StudentForm } from '@/components/student-form';
import { NotificationPrompt } from '@/components/notification-prompt';
import { useLanguage, getT } from '@/lib/i18n/context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface StudentData {
  id: string; userId: string; fullName: string; className: string;
  parentPhone: string; parentEmail: string; gender: string;
  whatsapp: string | null; createdAt: string; updatedAt: string;
}

interface UserData {
  id: string; email: string; name: string | null; role: string; student: StudentData | null;
}

interface NotificationItem {
  id: string; title: string; message: string; isRead: boolean;
  sentToAll: boolean; createdAt: string; adminName: string | null;
}

export default function HomePage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [editing, setEditing] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const { lang, dir } = useLanguage();
  const t = getT(lang);

  // Notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setStudentData(data.user.student || null);
      }
    } catch { /* Not authenticated */ }
    finally { setLoading(false); }
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch { /* ignore */ }
  }, []);

  // Mark as read
  const markRead = async (notifId: string) => {
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: notifId }),
      });
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* ignore */ }
  };

  // Mark all as read
  const markAllRead = async () => {
    try {
      await Promise.all(notifications.filter(n => !n.isRead).map(n => markRead(n.id)));
    } catch { /* ignore */ }
  };

  useEffect(() => { checkAuth(); }, [checkAuth]);

  useEffect(() => {
    if (user) fetchNotifications();
    const interval = setInterval(() => {
      if (user) fetchNotifications();
    }, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  // Close notification panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Register Service Worker & Push Notifications ──
  const registerPush = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return;

    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

      // Check existing subscription
      const existingSub = await registration.pushManager.getSubscription();
      if (existingSub) {
        setPushEnabled(true);
        return;
      }

      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

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

      if (res.ok) setPushEnabled(true);
    } catch (err) {
      console.warn('[Push] Registration failed:', err);
    }
  }, []);

  // Register push when user logs in as student
  useEffect(() => {
    if (user?.role === 'student') registerPush();
  }, [user, registerPush]);

  // Helper: convert VAPID key to Uint8Array
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const handleLogin = useCallback(() => { checkAuth(); }, [checkAuth]);
  const handleLogout = useCallback(async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch { /* Ignore */ }
    setUser(null); setStudentData(null); setEditing(false);
  }, []);
  const handleDataChange = useCallback(() => { setEditing(false); checkAuth(); }, [checkAuth]);
  const handleDelete = useCallback(async () => {
    if (!window.confirm(t('form.deleteConfirm'))) return;
    try {
      const res = await fetch('/api/student', { method: 'DELETE' });
      if (res.ok) { setStudentData(null); setEditing(false); toast.success(t('form.deleteSuccess')); }
      else { const data = await res.json().catch(() => ({})); toast.error(data.error || t('form.submitError')); }
    } catch { toast.error(t('form.submitError')); }
  }, [t]);

  const parseClassName = (className: string): string => {
    const parts = className.split('/');
    return `${t(`grades.${parts[0] || '1'}`)} - ${t(`sections.${parts[1] || '1'}`)}`;
  };

  // ─── Loading ───
  if (loading) {
    return (
      <div dir={dir} className="min-h-screen flex flex-col bg-background">
        <Header isLoggedIn={false} onLogout={handleLogout} />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="size-8 animate-spin text-emerald-600" />
            <p className="text-muted-foreground">{t('loading')}</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ─── Not Authenticated ───
  if (!user) {
    return (
      <div dir={dir} className="min-h-screen flex flex-col bg-background">
        <Header isLoggedIn={false} onLogout={handleLogout} />
        <main className="flex-1 flex items-center justify-center py-8 px-4">
          <LoginForm onLogin={handleLogin} />
        </main>
        <Footer />
      </div>
    );
  }

  // ─── Authenticated ───
  return (
    <div dir={dir} className="min-h-screen flex flex-col bg-background">
      <Header isLoggedIn={true} isAdmin={user.role === 'admin'} onLogout={handleLogout} />

      {/* Notification Bell (floating for students) */}
      {user.role === 'student' && (
        <div ref={notifRef} className="fixed top-16 left-4 z-50 sm:top-16 sm:left-auto sm:right-4">
          {/* Bell Button */}
          <button onClick={() => setNotifOpen(!notifOpen)}
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-card border shadow-lg hover:bg-muted transition-colors">
            <Bell className={`size-5 ${pushEnabled ? 'text-emerald-600' : 'text-foreground'}`} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Panel */}
          {notifOpen && (
            <div className={`absolute ${isRTL(dir) ? 'left-0' : 'right-0'} top-12 mt-1 w-80 sm:w-96 max-h-[70vh] rounded-xl bg-card border shadow-xl overflow-hidden z-50`}>
              <div className="flex items-center justify-between p-3 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                  <Bell className="size-4 text-emerald-600" />
                  <span className="font-semibold text-sm">{lang === 'ar' ? 'الإشعارات' : 'Notifications'}</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs text-emerald-600 hover:underline">
                      {lang === 'ar' ? 'قراءة الكل' : 'Read all'}
                    </button>
                  )}
                  <button onClick={() => setNotifOpen(false)} className="p-1 rounded-md hover:bg-muted">
                    <X className="size-3.5" />
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto max-h-[60vh]">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center py-10 text-muted-foreground">
                    <Bell className="size-8 opacity-20 mb-2" />
                    <p className="text-sm">{lang === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <button key={n.id} onClick={() => { if (!n.isRead) markRead(n.id); }}
                      className={`w-full text-start p-3 border-b last:border-0 transition-colors hover:bg-muted/50 ${!n.isRead ? 'bg-emerald-50/50 dark:bg-emerald-950/10' : ''}`}>
                      <div className="flex items-start gap-2">
                        {!n.isRead && <div className="mt-1.5 h-2 w-2 rounded-full bg-emerald-500 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!n.isRead ? 'font-semibold' : 'font-medium'}`}>{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {new Date(n.createdAt).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <main className="flex-1 py-8 px-4">
        <div className="flex flex-col items-center gap-6">
          {/* Welcome Banner */}
          <div className="w-full max-w-2xl mx-auto px-4">
            <div className="flex items-center gap-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4">
              <GraduationCap className="size-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                  {lang === 'ar' ? `أهلاً${user.name ? ` ${user.name}` : ''}!` : `Welcome${user.name ? ` ${user.name}` : ''}!`}
                </p>
                <p className="text-sm text-emerald-700 dark:text-emerald-300">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Unread notifications banner */}
          {unreadCount > 0 && (
            <div className="w-full max-w-2xl mx-auto px-4">
              <button onClick={() => setNotifOpen(true)}
                className="flex items-center gap-3 w-full rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-start hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors">
                <Megaphone className="size-5 text-amber-600 shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  {lang === 'ar'
                    ? `لديك ${unreadCount} إشعار${unreadCount > 2 ? 'ات جديدة' : unreadCount > 1 ? ' إشعار جديد' : ' جديد'}`
                    : `You have ${unreadCount} new notification${unreadCount > 1 ? 's' : ''}`}
                </p>
              </button>
            </div>
          )}

          {/* Student Data Card */}
          {studentData && !editing && (
            <div className="w-full max-w-2xl mx-auto px-4">
              <Card className="shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                      <User className="size-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">{studentData.fullName}</h2>
                      <p className="text-sm text-muted-foreground">{parseClassName(studentData.className)}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {[
                      [t('form.fullName'), studentData.fullName],
                      [`${t('form.grade')} / ${t('form.section')}`, parseClassName(studentData.className)],
                      [t('form.gender'), studentData.gender === 'male' ? t('form.male') : t('form.female')],
                      [t('form.parentPhone'), studentData.parentPhone],
                      [t('form.parentEmail'), studentData.parentEmail],
                      [`${t('form.whatsapp')} ${t('form.optional')}`, studentData.whatsapp || '—'],
                    ].map(([label, value]) => (
                      <div key={label as string} className="flex items-center justify-between py-2 border-b border-dashed last:border-0">
                        <span className="text-sm font-medium text-muted-foreground">{label}</span>
                        <span className="text-sm font-semibold" dir={['010', '011', '012', '015'].some(p => (value as string).startsWith(p)) ? 'ltr' : dir}>{value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-3 mt-6 pt-4 border-t sm:flex-row sm:justify-end">
                    <Button variant="outline" onClick={() => setEditing(true)} className="gap-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50">
                      <Pencil className="size-4" /> {t('form.edit')}
                    </Button>
                    <Button variant="destructive" onClick={handleDelete} className="gap-2">
                      <Trash2 className="size-4" /> {t('form.delete')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {studentData && editing && (
            <StudentForm userId={user.id} existingData={studentData} onDataChange={handleDataChange} />
          )}

          {!studentData && !editing && (
            <div className="w-full max-w-2xl mx-auto px-4">
              <Card className="shadow-lg">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center gap-4 py-8">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                      <AlertTriangle className="size-8 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-lg font-semibold">{t('form.noData')}</h2>
                      <p className="text-sm text-muted-foreground max-w-sm">{t('form.noDataDesc')}</p>
                    </div>
                    <Button onClick={() => setEditing(true)} className="mt-2 gap-2 bg-emerald-600 text-white hover:bg-emerald-700 h-11 px-8">
                      <Plus className="size-4" /> {t('form.addData')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {!studentData && editing && (
            <StudentForm userId={user.id} existingData={null} onDataChange={handleDataChange} />
          )}
        </div>
      </main>
      {/* Notification Permission Prompt - Students Only */}
      {user.role === 'student' && (
        <NotificationPrompt visible={true} />
      )}

      <Footer />
    </div>
  );
}

function isRTL(dir: string) { return dir === 'rtl'; }
