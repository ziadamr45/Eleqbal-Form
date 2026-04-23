'use client';

import { useLanguage } from '@/lib/i18n/context';

export function Footer() {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();

  const credits = typeof t === 'string' ? '' : t.credits;

  return (
    <footer className="mt-auto border-t py-4 text-center">
      <p className="text-sm text-muted-foreground">
        {credits} &copy; {currentYear}
      </p>
    </footer>
  );
}
