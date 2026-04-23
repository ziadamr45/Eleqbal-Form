'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, GraduationCap, User, Pencil, Trash2, Plus, AlertTriangle, Bell, X, Check, Megaphone, Hand } from 'lucide-react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { LoginForm } from '@/components/login-form';
import { StudentForm } from '@/components/student-form';
import { NotificationPrompt } from '@/components/notification-prompt';
import { useLanguage, getT } from '@/lib/i18n/context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
};

const stagger = {
  initial: {},
  animate: { transition: { staggerChildren: 0.08 } },
};

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
    }, 30000);
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
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      const existingSub = await registration.pushManager.getSubscription();
      if (existingSub) { setPushEnabled(true); return; }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

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

  useEffect(() => {
    if (user?.role === 'student') registerPush();
  }, [user, registerPush]);

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
    if (!className) return lang === 'ar' ? 'غير محدد' : 'N/A';
    const parts = className.split('/');
    const g = parts[0] || '';
    const s = parts[1] || '';
    if (!g && !s) return lang === 'ar' ? 'غير محدد' : 'N/A';
    const gradeLabel = g ? t(`grades.${g}`) : (lang === 'ar' ? 'غير محدد' : 'N/A');
    const sectionLabel = s ? t(`sections.${s}`) : (lang === 'ar' ? 'غير محدد' : 'N/A');
    return `${gradeLabel} - ${sectionLabel}`;
  };

  // Personalized greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return lang === 'ar' ? 'صباح الخير' : 'Good morning';
    if (hour < 17) return lang === 'ar' ? 'مساء الخير' : 'Good afternoon';
    return lang === 'ar' ? 'مساء الخير' : 'Good evening';
  }, [lang]);

  // ─── Loading Skeleton ───
  if (loading) {
    return (
      <div dir={dir} className="min-h-screen flex flex-col premium-bg">
        {/* Premium Background Layers */}
        <div className="bg-glow bg-glow-center" />
        <div className="bg-glow bg-glow-accent" />
        <div className="bg-grain" />
        <Header isLoggedIn={false} onLogout={handleLogout} />
        <main className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md mx-auto px-4 space-y-4">
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-60 w-full rounded-xl" />
            <Skeleton className="h-4 w-32 mx-auto" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ─── Not Authenticated ───
  if (!user) {
    return (
      <div dir={dir} className="min-h-screen flex flex-col premium-bg">
        {/* Premium Background Layers */}
        <div className="bg-glow bg-glow-center" />
        <div className="bg-glow bg-glow-accent" />
        <div className="bg-grain" />
        <Header isLoggedIn={false} onLogout={handleLogout} />
        <main className="flex-1 flex items-center justify-center py-8 px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <LoginForm onLogin={handleLogin} />
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  // ─── Authenticated ───
  return (
    <div dir={dir} className="min-h-screen flex flex-col premium-bg">
      {/* Premium Background Layers */}
      <div className="bg-glow bg-glow-center" />
      <div className="bg-glow bg-glow-accent" />
      <div className="bg-grain" />
      <Header isLoggedIn={true} isAdmin={user.role === 'admin'} onLogout={handleLogout} />

      {/* Notification Bell (floating for students) */}
      {user.role === 'student' && (
        <div ref={notifRef} className="notif-bell fixed top-16 right-3 z-50 sm:right-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-all duration-200 active:scale-95 hover:shadow-xl"
            style={{ background: 'rgba(5,150,105,0.9)', backdropFilter: 'blur(8px)' }}>
            <Bell className="size-5 text-white" />
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                className="absolute -top-0.5 -right-0.5 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-background"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </motion.button>

          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 top-12 mt-1 w-80 sm:w-96 max-h-[70vh] rounded-xl bg-card border shadow-xl overflow-hidden z-50"
              >
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
                    <AnimatePresence>
                      {notifications.map((n, idx) => (
                        <motion.button
                          key={n.id}
                          initial={{ opacity: 0, x: dir === 'rtl' ? 10 : -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          onClick={() => { if (!n.isRead) markRead(n.id); }}
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
                        </motion.button>
                      ))}
                    </AnimatePresence>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <main className="flex-1 py-8 px-4">
        <motion.div
          className="flex flex-col items-center gap-6"
          variants={stagger}
          initial="initial"
          animate="animate"
        >
          {/* Welcome Banner - Personalized */}
          <motion.div {...fadeUp} className="w-full max-w-2xl mx-auto px-4">
            <div className="flex items-center gap-3 rounded-xl bg-gradient-to-l from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-white shrink-0 shadow-md">
                <Hand className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100 truncate">
                  {greeting}{user.name ? ` ${user.name}` : ''} 👋
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 truncate">{user.email}</p>
              </div>
            </div>
          </motion.div>

          {/* Unread notifications banner */}
          {unreadCount > 0 && (
            <motion.div {...fadeUp} className="w-full max-w-2xl mx-auto px-4">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setNotifOpen(true)}
                className="flex items-center gap-3 w-full rounded-xl bg-gradient-to-l from-amber-50 to-amber-100/50 dark:from-amber-950/40 dark:to-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-start hover:from-amber-100 hover:to-amber-50 dark:hover:from-amber-950/50 dark:hover:to-amber-900/30 transition-all"
              >
                <Megaphone className="size-5 text-amber-600 shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  {lang === 'ar'
                    ? `لديك ${unreadCount} إشعار${unreadCount > 2 ? 'ات جديدة' : unreadCount > 1 ? ' إشعار جديد' : ' جديد'}`
                    : `You have ${unreadCount} new notification${unreadCount > 1 ? 's' : ''}`}
                </p>
              </motion.button>
            </motion.div>
          )}

          {/* Student Data Card */}
          <AnimatePresence mode="wait">
            {studentData && !editing && (
              <motion.div
                key="view"
                {...fadeUp}
                className="w-full max-w-2xl mx-auto px-4"
              >
                <Card className="shadow-lg overflow-hidden">
                  <CardContent className="p-6">
                    <motion.div
                      className="flex items-center gap-3 mb-6 pb-4 border-b"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                        <User className="size-6 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold">{studentData.fullName}</h2>
                        <p className="text-sm text-muted-foreground">{parseClassName(studentData.className)}</p>
                      </div>
                    </motion.div>
                    <div className="space-y-4">
                      {[
                        [t('form.fullName'), studentData.fullName],
                        [`${t('form.grade')} / ${t('form.section')}`, parseClassName(studentData.className)],
                        [t('form.gender'), studentData.gender === 'male' ? t('form.male') : t('form.female')],
                        [t('form.parentPhone'), studentData.parentPhone],
                        [t('form.parentEmail'), studentData.parentEmail],
                        [`${t('form.whatsapp')} ${t('form.optional')}`, studentData.whatsapp || '—'],
                      ].map(([label, value], idx) => (
                        <motion.div
                          key={label as string}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15 + idx * 0.04 }}
                          className="flex items-center justify-between py-2 border-b border-dashed last:border-0"
                        >
                          <span className="text-sm font-medium text-muted-foreground">{label}</span>
                          <span className="text-sm font-semibold" dir={['010', '011', '012', '015'].some(p => (value as string).startsWith(p)) ? 'ltr' : dir}>{value}</span>
                        </motion.div>
                      ))}
                    </div>
                    <motion.div
                      className="flex flex-col gap-3 mt-6 pt-4 border-t sm:flex-row sm:justify-end"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button variant="outline" onClick={() => setEditing(true)} className="gap-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 w-full sm:w-auto">
                          <Pencil className="size-4" /> {t('form.edit')}
                        </Button>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button variant="destructive" onClick={handleDelete} className="gap-2 w-full sm:w-auto">
                          <Trash2 className="size-4" /> {t('form.delete')}
                        </Button>
                      </motion.div>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {studentData && editing && (
              <motion.div key="edit" {...fadeUp} className="w-full max-w-2xl mx-auto px-4">
                <StudentForm key={studentData.id + '-' + editing} userId={user.id} existingData={studentData} onDataChange={handleDataChange} />
              </motion.div>
            )}

            {!studentData && !editing && (
              <motion.div {...fadeUp} className="w-full max-w-2xl mx-auto px-4">
                <Card className="shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center gap-4 py-8">
                      <motion.div
                        className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30"
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                      >
                        <AlertTriangle className="size-8 text-amber-600 dark:text-amber-400" />
                      </motion.div>
                      <div className="space-y-1">
                        <h2 className="text-lg font-semibold">{t('form.noData')}</h2>
                        <p className="text-sm text-muted-foreground max-w-sm">{t('form.noDataDesc')}</p>
                      </div>
                      <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                        <Button onClick={() => setEditing(true)} className="mt-2 gap-2 bg-emerald-600 text-white hover:bg-emerald-700 h-11 px-8 shadow-lg shadow-emerald-600/20">
                          <Plus className="size-4" /> {t('form.addData')}
                        </Button>
                      </motion.div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {!studentData && editing && (
              <motion.div key="create" {...fadeUp} className="w-full max-w-2xl mx-auto px-4">
                <StudentForm userId={user.id} existingData={null} onDataChange={handleDataChange} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>
      {/* Notification Permission Prompt - Students Only */}
      {user.role === 'student' && (
        <NotificationPrompt visible={true} />
      )}

      <Footer />
    </div>
  );
}

