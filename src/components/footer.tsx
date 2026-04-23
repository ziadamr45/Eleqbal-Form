'use client';

import { useLanguage } from '@/lib/i18n/context';

export function Footer() {
  const { lang } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t py-4 text-center">
      <p className="text-sm text-muted-foreground">
        {lang === 'ar' ? 'رقمنة ' : 'Digitized by '}
        <a
          href="https://wa.me/qr/D73EAFLRVZCQE1"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          {lang === 'ar' ? 'مستر عمرو صبحي' : 'Mr. Amr Sobhy'}
        </a>
        {' '}&copy; {currentYear}
      </p>
    </footer>
  );
}
