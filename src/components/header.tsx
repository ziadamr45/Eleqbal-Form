'use client';

import Image from 'next/image';
import { useTheme } from 'next-themes';
import { Sun, Moon, Languages, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n/context';
import { useSyncExternalStore } from 'react';

interface HeaderProps {
  isLoggedIn: boolean;
  onLogout: () => void;
}

export function Header({ isLoggedIn, onLogout }: HeaderProps) {
  const { lang, setLang, t, dir } = useLanguage();
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const toggleLanguage = () => {
    setLang(lang === 'ar' ? 'en' : 'ar');
  };

  return (
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
          >
            <Languages className="size-4" />
            <span className="hidden sm:inline">
              {lang === 'ar' ? 'English' : 'عربي'}
            </span>
          </Button>

          {/* Theme Toggle */}
          {mounted && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="gap-1.5 text-sm font-medium"
            >
              {theme === 'dark' ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
              <span className="hidden sm:inline">
                {theme === 'dark'
                  ? (typeof t === 'string' ? '' : t.lightMode)
                  : (typeof t === 'string' ? '' : t.darkMode)}
              </span>
            </Button>
          )}

          {/* Logout */}
          {isLoggedIn && (
            <Button
              variant="outline"
              size="sm"
              onClick={onLogout}
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
  );
}
