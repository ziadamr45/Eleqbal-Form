'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Mail, ShieldCheck, ArrowLeft, RefreshCw, UserPlus, LogIn } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp';
import { useLanguage, getT } from '@/lib/i18n/context';

interface LoginFormProps {
  onLogin: (user: { id: string; email: string; name: string | null }) => void;
}

const OTP_STATE_KEY = 'otp_pending';
const OTP_EMAIL_KEY = 'otp_email';
const OTP_TIME_KEY = 'otp_time';
const OTP_MODE_KEY = 'otp_mode';
const OTP_NAME_KEY = 'otp_name';

type Mode = 'login' | 'register';

export function LoginForm({ onLogin }: LoginFormProps) {
  const { lang, dir } = useLanguage();
  const t = getT(lang);

  const [mode, setMode] = useState<Mode>('login');
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [fadeState, setFadeState] = useState<'in' | 'out'>('in');
  const [restored, setRestored] = useState(false);

  // Restore OTP state from localStorage on mount
  useEffect(() => {
    try {
      const pending = localStorage.getItem(OTP_STATE_KEY);
      const savedEmail = localStorage.getItem(OTP_EMAIL_KEY);
      const savedTime = localStorage.getItem(OTP_TIME_KEY);
      const savedMode = localStorage.getItem(OTP_MODE_KEY) as Mode | null;
      const savedName = localStorage.getItem(OTP_NAME_KEY);

      if (pending === 'true' && savedEmail) {
        setEmail(savedEmail);
        setStep(2);
        setFadeState('in');

        if (savedMode === 'login' || savedMode === 'register') {
          setMode(savedMode);
        }
        if (savedName) {
          setName(savedName);
        }

        // Calculate remaining resend cooldown
        if (savedTime) {
          const elapsed = Math.floor((Date.now() - parseInt(savedTime)) / 1000);
          const remaining = Math.max(0, 60 - elapsed);
          setResendTimer(remaining);
        }
        setRestored(true);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Resend countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const transitionTo = useCallback((nextStep: 1 | 2) => {
    setFadeState('out');
    setTimeout(() => {
      setStep(nextStep);
      setFadeState('in');
    }, 150);
  }, []);

  const saveOtpState = useCallback((emailValue: string, modeValue: Mode, nameValue?: string) => {
    try {
      localStorage.setItem(OTP_STATE_KEY, 'true');
      localStorage.setItem(OTP_EMAIL_KEY, emailValue);
      localStorage.setItem(OTP_TIME_KEY, Date.now().toString());
      localStorage.setItem(OTP_MODE_KEY, modeValue);
      if (nameValue) {
        localStorage.setItem(OTP_NAME_KEY, nameValue);
      } else {
        localStorage.removeItem(OTP_NAME_KEY);
      }
    } catch {
      // Ignore
    }
  }, []);

  const clearOtpState = useCallback(() => {
    try {
      localStorage.removeItem(OTP_STATE_KEY);
      localStorage.removeItem(OTP_EMAIL_KEY);
      localStorage.removeItem(OTP_TIME_KEY);
      localStorage.removeItem(OTP_MODE_KEY);
      localStorage.removeItem(OTP_NAME_KEY);
    } catch {
      // Ignore
    }
  }, []);

  const validateEmail = (emailValue: string): boolean => {
    if (!emailValue.trim()) {
      setError(t('login.emailRequired'));
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue)) {
      setError(t('login.emailInvalid'));
      return false;
    }
    return true;
  };

  const handleSendOtp = async () => {
    setError('');

    if (mode === 'register') {
      if (!name.trim()) {
        setError(t('login.nameRequired'));
        return;
      }
    }

    if (!validateEmail(email)) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setResendTimer(60);
        saveOtpState(email, mode, mode === 'register' ? name : undefined);
        transitionTo(2);
      } else {
        setError(t('login.otpError'));
      }
    } catch {
      setError(t('login.otpError'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError('');
    if (!otp || otp.length !== 6) {
      setError(t('login.otpLength'));
      return;
    }

    setLoading(true);
    try {
      const body: { email: string; code: string; name?: string } = {
        email,
        code: otp,
      };

      if (mode === 'register') {
        body.name = name;
      }

      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        clearOtpState();
        onLogin({
          id: data.user.id,
          email: data.user.email,
          name: data.user.name ?? null,
        });
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || t('login.verifyError'));
      }
    } catch {
      setError(t('login.verifyError'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setResendTimer(60);
        saveOtpState(email, mode, mode === 'register' ? name : undefined);
        setOtp('');
      } else {
        setError(t('login.resendError'));
      }
    } catch {
      setError(t('login.resendError'));
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setError('');
    setOtp('');
    clearOtpState();
    transitionTo(1);
  };

  const handleTabSwitch = (newMode: Mode) => {
    if (newMode === mode) return;
    setMode(newMode);
    setStep(1);
    setFadeState('in');
    setError('');
    setOtp('');
    clearOtpState();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (step === 1) {
        handleSendOtp();
      } else if (step === 2 && otp.length === 6) {
        handleVerify();
      }
    }
  };

  const isLogin = mode === 'login';

  return (
    <div dir={dir} className="flex w-full max-w-md items-center justify-center px-4">
      <Card
        className={`w-full transition-all duration-150 ${
          fadeState === 'in'
            ? 'translate-y-0 opacity-100'
            : 'translate-y-1 opacity-0'
        }`}
      >
        {/* Tabs */}
        <div className="flex gap-2 p-4 pb-0">
          <button
            type="button"
            onClick={() => handleTabSwitch('login')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
              isLogin
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <LogIn className="size-4" />
            {t('login.loginTab')}
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch('register')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
              !isLogin
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <UserPlus className="size-4" />
            {t('login.registerTab')}
          </button>
        </div>

        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            {step === 1 ? (
              <Mail className="size-7 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <ShieldCheck className="size-7 text-emerald-600 dark:text-emerald-400" />
            )}
          </div>
          <CardTitle className="text-xl">
            {step === 1
              ? t(isLogin ? 'login.title' : 'login.registerTab')
              : t('login.otpTitle')}
          </CardTitle>
          <CardDescription className="text-sm">
            {step === 1
              ? t('login.subtitle')
              : t('login.otpSubtitle')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Step 1: Input fields */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Name field — register mode only */}
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name">{t('login.name')}</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder={t('login.namePlaceholder')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                    className="h-11"
                    autoComplete="name"
                  />
                </div>
              )}

              {/* Email field */}
              <div className="space-y-2">
                <Label htmlFor="email">{t('login.emailLabel')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('login.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  className="h-11"
                  dir="ltr"
                  autoComplete="email"
                />
              </div>
            </div>
          )}

          {/* Step 2: OTP verification */}
          {step === 2 && (
            <div className="flex flex-col items-center gap-6">
              <div dir="ltr">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={setOtp}
                  disabled={loading}
                  onComplete={handleVerify}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <p className="text-sm text-muted-foreground">{email}</p>

              {/* Restored state hint */}
              {restored && (
                <p className="rounded-md bg-amber-50 px-3 py-1.5 text-xs text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
                  {lang === 'ar'
                    ? '📍 أدخل كود التحقق الذي تم إرساله إلى بريدك الإلكتروني'
                    : '📍 Enter the verification code sent to your email'}
                </p>
              )}
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
              {error}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          {step === 1 && (
            <Button
              onClick={handleSendOtp}
              disabled={loading || !email.trim()}
              className="h-11 w-full bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t('login.sending')}
                </>
              ) : (
                t('login.sendOtp')
              )}
            </Button>
          )}

          {step === 2 && (
            <>
              <Button
                onClick={handleVerify}
                disabled={loading || otp.length !== 6}
                className="h-11 w-full bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {t('login.verifying')}
                  </>
                ) : (
                  t('login.verify')
                )}
              </Button>

              <div className="flex w-full items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="gap-1.5"
                >
                  {dir === 'rtl' ? (
                    <ArrowLeft className="size-4 rotate-180" />
                  ) : (
                    <ArrowLeft className="size-4" />
                  )}
                  {t('login.back')}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResend}
                  disabled={resendTimer > 0 || loading}
                  className="gap-1.5 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                >
                  <RefreshCw
                    className={`size-4 ${loading ? 'animate-spin' : ''}`}
                  />
                  {resendTimer > 0
                    ? `${t('login.resendIn')} ${resendTimer} ${t('login.seconds')}`
                    : t('login.resend')}
                </Button>
              </div>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
