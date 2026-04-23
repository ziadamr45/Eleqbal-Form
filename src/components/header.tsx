'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { Sun, Moon, Globe, LogOut, Shield, TriangleAlert, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useLanguage } from '@/lib/i18n/context';
import { useSyncExternalStore } from 'react';

interface HeaderProps {
  isLoggedIn: boolean;
  isAdmin?: boolean;
  onLogout: () => void;
}

export function Header({ isLoggedIn, isAdmin, onLogout }: HeaderProps) {
  const { lang, setLang, t, dir } = useLanguage();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // Use resolvedTheme to get actual "dark" or "light" (not "system")
  const isDark = resolvedTheme === 'dark';

  const cycleTheme = () => {
    const themes = ['light', 'dark', 'system'] as const;
    const currentIdx = themes.indexOf(theme as 'light' | 'dark' | 'system');
    const next = themes[(currentIdx + 1) % 3];
    setTheme(next);
  };

  const themeIcon = theme === 'system'
    ? <Monitor className="size-4" />
    : isDark
      ? <Moon className="size-4" />
      : <Sun className="size-4" />;

  const themeTitle = theme === 'system'
    ? (lang === 'ar' ? 'تلقائي' : 'Auto')
    : isDark
      ? (typeof t === 'string' ? '' : t.lightMode)
      : (typeof t === 'string' ? '' : t.darkMode);

  const toggleLanguage = () => {
    setLang(lang === 'ar' ? 'en' : 'ar');
  };

  const handleLogout = () => {
    setShowLogoutConfirm(false);
    onLogout();
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4 md:px-6">
          {/* Logo + App Name */}
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-full border shadow-sm">
              <Image
                src="/school-logo.jpg"
                alt="School Logo"
                fill
                className="object-cover"
                priority
              />
            </div>
            <h1 className="text-base font-bold tracking-tight md:text-lg">
              {typeof t === 'string' ? t : t.appName}
            </h1>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Language Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="gap-1.5 text-sm font-medium"
              title={lang === 'ar' ? 'English' : 'عربي'}
            >
              <Globe className="size-4" />
              <span className="hidden sm:inline">
                {lang === 'ar' ? 'English' : 'عربي'}
              </span>
            </Button>

            {/* Theme Toggle - cycles light → dark → system */}
            {mounted && (
              <Button
                variant="ghost"
                size="sm"
                onClick={cycleTheme}
                className="gap-1.5 text-sm font-medium"
                title={themeTitle}
              >
                {themeIcon}
              </Button>
            )}

            {/* Admin Button */}
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = '/admin'}
                className="gap-1.5 text-sm font-medium text-emerald-600 border-emerald-600 hover:bg-emerald-50"
              >
                <Shield className="size-4" />
                <span className="hidden sm:inline">
                  {typeof t === 'string' ? '' : (lang === 'ar' ? 'لوحة التحكم' : 'Admin')}
                </span>
              </Button>
            )}

            {/* Logout */}
            {isLoggedIn && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLogoutConfirm(true)}
                className="gap-1.5 text-sm font-medium text-destructive hover:text-destructive"
              >
                <LogOut className="size-4" />
                <span className="hidden sm:inline">
                  {typeof t === 'string' ? '' : t.logout}
                </span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <TriangleAlert className="size-5 text-amber-500" />
              {lang === 'ar' ? 'تسجيل الخروج' : 'Logout'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {lang === 'ar' ? 'هل أنت متأكد من تسجيل الخروج من حسابك؟' : 'Are you sure you want to logout from your account?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>{lang === 'ar' ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-destructive text-white hover:bg-destructive/90">
              <LogOut className="size-4" />
              {lang === 'ar' ? 'خروج' : 'Logout'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
