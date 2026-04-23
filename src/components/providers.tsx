'use client';

import { ThemeProvider } from 'next-themes';
import { LanguageProvider } from '@/lib/i18n/context';
import { useEffect } from 'react';

function ThemeTransition({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const html = document.documentElement;
    let timeout: ReturnType<typeof setTimeout>;

    const observer = new MutationObserver(() => {
      clearTimeout(timeout);
      html.classList.add('transitioning');
      timeout = setTimeout(() => {
        html.classList.remove('transitioning');
      }, 350);
    });

    // Watch for class changes (dark mode toggle)
    observer.observe(html, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, []);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ThemeTransition>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </ThemeTransition>
    </ThemeProvider>
  );
}
