'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, GraduationCap, User, Pencil, Trash2, Plus, AlertTriangle } from 'lucide-react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { LoginForm } from '@/components/login-form';
import { StudentForm } from '@/components/student-form';
import { useLanguage, getT } from '@/lib/i18n/context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface StudentData {
  id: string;
  userId: string;
  fullName: string;
  className: string;
  parentPhone: string;
  parentEmail: string;
  gender: string;
  whatsapp: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UserData {
  id: string;
  email: string;
  name: string | null;
  student: StudentData | null;
}

export default function HomePage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [editing, setEditing] = useState(false);
  const { lang, dir } = useLanguage();
  const t = getT(lang);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setStudentData(data.user.student || null);
      }
    } catch {
      // Not authenticated
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleLogin = useCallback((loggedInUser: { id: string; email: string }) => {
    setUser(loggedInUser as UserData);
    setStudentData(null);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore
    }
    setUser(null);
    setStudentData(null);
    setEditing(false);
  }, []);

  const handleDataChange = useCallback(() => {
    setEditing(false);
    checkAuth();
  }, [checkAuth]);

  const handleDelete = useCallback(async () => {
    if (!window.confirm(t('form.deleteConfirm'))) return;

    try {
      const res = await fetch('/api/student', { method: 'DELETE' });
      if (res.ok) {
        setStudentData(null);
        setEditing(false);
        toast.success(t('form.deleteSuccess'));
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || t('form.submitError'));
      }
    } catch {
      toast.error(t('form.submitError'));
    }
  }, [t]);

  // Parse className "3/2" into grade and section display
  const parseClassName = (className: string): string => {
    const parts = className.split('/');
    const gradeKey = parts[0] || '1';
    const sectionKey = parts[1] || '1';
    return `${t(`grades.${gradeKey}`)} - ${t(`sections.${sectionKey}`)}`;
  };

  // ─── Loading State ───
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

  // ─── Not Authenticated → Login ───
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

  // ─── Authenticated → Dashboard ───
  return (
    <div dir={dir} className="min-h-screen flex flex-col bg-background">
      <Header isLoggedIn={true} onLogout={handleLogout} />
      <main className="flex-1 py-8 px-4">
        <div className="flex flex-col items-center gap-6">
          {/* Welcome Banner */}
          <div className="w-full max-w-2xl mx-auto px-4">
            <div className="flex items-center gap-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4">
              <GraduationCap className="size-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                  {lang === 'ar'
                    ? `أهلاً${user.name ? ` ${user.name}` : ''}!`
                    : `Welcome${user.name ? ` ${user.name}` : ''}!`}
                </p>
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          {/* ── Student Data Exists + Not Editing → Show Data Card ── */}
          {studentData && !editing && (
            <div className="w-full max-w-2xl mx-auto px-4">
              <Card className="shadow-lg">
                <CardContent className="p-6">
                  {/* Card Header */}
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                      <User className="size-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">{studentData.fullName}</h2>
                      <p className="text-sm text-muted-foreground">{parseClassName(studentData.className)}</p>
                    </div>
                  </div>

                  {/* Data Rows */}
                  <div className="space-y-4">
                    {/* Full Name */}
                    <div className="flex items-center justify-between py-2 border-b border-dashed">
                      <span className="text-sm font-medium text-muted-foreground">
                        {t('form.fullName')}
                      </span>
                      <span className="text-sm font-semibold">{studentData.fullName}</span>
                    </div>

                    {/* Grade / Section */}
                    <div className="flex items-center justify-between py-2 border-b border-dashed">
                      <span className="text-sm font-medium text-muted-foreground">
                        {t('form.grade')} / {t('form.section')}
                      </span>
                      <span className="text-sm font-semibold">{parseClassName(studentData.className)}</span>
                    </div>

                    {/* Gender */}
                    <div className="flex items-center justify-between py-2 border-b border-dashed">
                      <span className="text-sm font-medium text-muted-foreground">
                        {t('form.gender')}
                      </span>
                      <span className="text-sm font-semibold">
                        {studentData.gender === 'male' ? t('form.male') : t('form.female')}
                      </span>
                    </div>

                    {/* Parent Phone */}
                    <div className="flex items-center justify-between py-2 border-b border-dashed">
                      <span className="text-sm font-medium text-muted-foreground">
                        {t('form.parentPhone')}
                      </span>
                      <span className="text-sm font-semibold" dir="ltr">
                        {studentData.parentPhone}
                      </span>
                    </div>

                    {/* Parent Email */}
                    <div className="flex items-center justify-between py-2 border-b border-dashed">
                      <span className="text-sm font-medium text-muted-foreground">
                        {t('form.parentEmail')}
                      </span>
                      <span className="text-sm font-semibold" dir="ltr">
                        {studentData.parentEmail}
                      </span>
                    </div>

                    {/* WhatsApp */}
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        {t('form.whatsapp')}{' '}
                        <span className="text-xs text-muted-foreground/70">{t('form.optional')}</span>
                      </span>
                      <span className="text-sm font-semibold" dir="ltr">
                        {studentData.whatsapp || '—'}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-3 mt-6 pt-4 border-t sm:flex-row sm:justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setEditing(true)}
                      className="gap-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-400 dark:text-emerald-400 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300"
                    >
                      <Pencil className="size-4" />
                      {t('form.edit')}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      className="gap-2"
                    >
                      <Trash2 className="size-4" />
                      {t('form.delete')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Student Data Exists + Editing → Show Form ── */}
          {studentData && editing && (
            <StudentForm
              userId={user.id}
              existingData={studentData}
              onDataChange={handleDataChange}
            />
          )}

          {/* ── No Student Data + Not Editing → Show Empty State ── */}
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
                      <p className="text-sm text-muted-foreground max-w-sm">
                        {t('form.noDataDesc')}
                      </p>
                    </div>
                    <Button
                      onClick={() => setEditing(true)}
                      className="mt-2 gap-2 bg-emerald-600 text-white hover:bg-emerald-700 h-11 px-8"
                    >
                      <Plus className="size-4" />
                      {t('form.addData')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── No Student Data + Editing → Show Form ── */}
          {!studentData && editing && (
            <StudentForm
              userId={user.id}
              existingData={null}
              onDataChange={handleDataChange}
            />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
