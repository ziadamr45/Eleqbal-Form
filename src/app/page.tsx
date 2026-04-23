'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, GraduationCap } from 'lucide-react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { LoginForm } from '@/components/login-form';
import { StudentForm } from '@/components/student-form';
import { useLanguage, getT } from '@/lib/i18n/context';

interface UserData {
  id: string;
  email: string;
  student: {
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
  } | null;
}

export default function HomePage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState<UserData['student'] | null>(null);
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
  }, []);

  const handleDataChange = useCallback(() => {
    // Re-fetch student data after update
    checkAuth();
  }, [checkAuth]);

  // Loading state
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

  // Not authenticated - show login
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

  // Authenticated - show student form
  return (
    <div dir={dir} className="min-h-screen flex flex-col bg-background">
      <Header isLoggedIn={true} onLogout={handleLogout} />
      <main className="flex-1 py-8 px-4">
        <div className="flex flex-col items-center gap-6">
          {/* Welcome banner */}
          <div className="w-full max-w-2xl mx-auto px-4">
            <div className="flex items-center gap-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4">
              <GraduationCap className="size-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                  {lang === 'ar' ? `مرحباً!` : 'Welcome!'}
                </p>
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          <StudentForm
            userId={user.id}
            existingData={studentData}
            onDataChange={handleDataChange}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
