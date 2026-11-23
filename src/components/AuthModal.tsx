import { ArrowLeft, CheckCircle2, Lock, Mail, RefreshCw, ShieldAlert, User, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export type AuthModalMode = 'login' | 'register' | 'reset';

interface AuthModalProps {
  open: boolean;
  initialMode?: AuthModalMode;
  contextBanner?: string | null;
  onClose: () => void;
  onAuthenticated?: () => void;
}

export function AuthModal({
  open,
  initialMode = 'login',
  contextBanner = null,
  onClose,
  onAuthenticated,
}: AuthModalProps) {
  const {
    firebaseUser,
    authActionPending,
    authError,
    clearAuthError,
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    sendResetEmail,
    resendVerificationEmail,
    refreshVerificationStatus,
  } = useAuth();

  const [mode, setMode] = useState<AuthModalMode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setLocalError(null);
    setStatusMessage(null);
    clearAuthError();
    window.requestAnimationFrame(() => firstInputRef.current?.focus());

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, initialMode, onClose, clearAuthError]);

  if (!open) return null;

  const isUnverifiedSignedIn = Boolean(firebaseUser && !firebaseUser.emailVerified);

  const switchMode = (nextMode: AuthModalMode) => {
    setMode(nextMode);
    setLocalError(null);
    setStatusMessage(null);
    clearAuthError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authActionPending) return;
    setLocalError(null);
    setStatusMessage(null);

    const trimmedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setLocalError('Please enter a valid email address.');
      return;
    }

    if (mode === 'reset') {
      const sent = await sendResetEmail(trimmedEmail);
      if (sent) {
        setStatusMessage(`Password reset instructions sent to ${trimmedEmail}.`);
      }
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }

    if (mode === 'register') {
      if (name.trim().length < 2) {
        setLocalError('Please enter your full name (at least 2 characters).');
        return;
      }
      const res = await registerWithEmail({
        name: name.trim(),
        email: trimmedEmail,
        password,
      });
      if (res.ok) {
        if (res.needsVerification) {
          setStatusMessage(
            `Verification link sent to ${trimmedEmail}. Please verify your email inbox, then click Check Verification below to unlock bookings.`,
          );
        } else {
          onAuthenticated?.();
          onClose();
        }
      }
      return;
    }

    const ok = await signInWithEmail(trimmedEmail, password);
    if (ok) {
      onAuthenticated?.();
      onClose();
    }
  };

  const handleGoogle = async () => {
    if (authActionPending) return;
    setLocalError(null);
    setStatusMessage(null);
    const ok = await signInWithGoogle();
    if (ok) {
      onAuthenticated?.();
      onClose();
    }
  };

  const displayError = localError || authError;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Kemet Travel Account Sign In"
      className="fixed inset-0 z-[85] flex items-center justify-center bg-[#1d1a1c]/55 p-4"
      onClick={onClose}
    >
      <div
        className="animate-popover-drop max-h-[92vh] w-full max-w-[460px] overflow-y-auto rounded-[22px] bg-[#fdf0e7] p-6 text-[#1d1a1c] shadow-2xl sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11.5px] font-medium uppercase tracking-[0.12em] text-[#8a7f83]">
              Kemet Travel Account
            </p>
            <h2 className="mt-1 font-display-serif text-[28px] leading-tight sm:text-[32px]">
              {isUnverifiedSignedIn
                ? 'Verify Your Email'
                : mode === 'register'
                  ? 'Create Your Account'
                  : mode === 'reset'
                    ? 'Reset Password'
                    : 'Welcome Back'}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close authentication modal"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#1d1a1c]/15 bg-white hover:bg-[#1d1a1c] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d1a1c]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {contextBanner && (
          <div className="mt-4 rounded-[12px] border border-[#f39419]/30 bg-white/85 px-4 py-3 text-[13px] leading-relaxed text-[#5c5156]">
            {contextBanner}
          </div>
        )}

        {isUnverifiedSignedIn ? (
          <div className="mt-5 space-y-4 rounded-[16px] bg-white p-5">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#f39419]" />
              <div className="text-[13.5px] leading-relaxed text-[#5c5156]">
                Signed in as <strong className="text-[#1d1a1c]">{firebaseUser?.email}</strong>. To
                protect booking records and customer privacy, please click the verification link in
                your inbox before submitting reservations.
              </div>
            </div>

            {statusMessage && (
              <div className="rounded-[10px] bg-[#eaf6ef] px-3 py-2 text-[13px] text-[#1f7a4c]">
                {statusMessage}
              </div>
            )}
            {displayError && (
              <div className="rounded-[10px] bg-[#fdecef] px-3 py-2 text-[13px] text-[#b3323e]">
                {displayError}
              </div>
            )}

            <div className="flex flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                disabled={authActionPending}
                onClick={async () => {
                  const verified = await refreshVerificationStatus();
                  if (verified) {
                    onAuthenticated?.();
                    onClose();
                  } else {
                    setStatusMessage(
                      'Email is still unverified. Refresh after clicking the link in your email.',
                    );
                  }
                }}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#1d1a1c] px-4 py-2.5 text-[13.5px] font-medium text-white disabled:opacity-60"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                I Verified — Continue
              </button>
              <button
                type="button"
                disabled={authActionPending}
                onClick={async () => {
                  const sent = await resendVerificationEmail();
                  if (sent) {
                    setStatusMessage('Verification email resent.');
                  }
                }}
                className="rounded-full border border-[#1d1a1c]/20 px-4 py-2.5 text-[13.5px] font-medium text-[#1d1a1c] hover:bg-[#fdf0e7] disabled:opacity-60"
              >
                Resend Link
              </button>
            </div>
          </div>
        ) : (
          <>
            {mode === 'reset' ? (
              <div className="mt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="inline-flex items-center gap-1.5 rounded-[8px] px-1 py-1 text-[13px] font-medium text-[#5c5156] transition-colors hover:text-[#1d1a1c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d1a1c]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to Sign In</span>
                </button>
              </div>
            ) : (
              /* Mode Switcher: Sign In & Create Account */
              <div
                role="tablist"
                aria-label="Account authentication mode"
                className="mt-5 grid grid-cols-2 gap-1 rounded-[12px] bg-[#1d1a1c]/8 p-1"
              >
                {(
                  [
                    { id: 'login', label: 'Sign In' },
                    { id: 'register', label: 'Create Account' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={mode === tab.id}
                    onClick={() => switchMode(tab.id)}
                    className={`rounded-[9px] px-3 py-2 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#1d1a1c] ${
                      mode === tab.id
                        ? 'bg-white text-[#1d1a1c] shadow-sm'
                        : 'text-[#5c5156] hover:text-[#1d1a1c]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {mode === 'reset' && (
              <p className="mt-2.5 text-[13px] leading-relaxed text-[#5c5156]">
                Enter the email address associated with your Kemet Travel account and we will send
                you password reset instructions.
              </p>
            )}

            {statusMessage && (
              <div
                role="status"
                className="mt-4 flex items-start gap-2 rounded-[12px] border border-[#249c60]/30 bg-white px-4 py-3 text-[13px] text-[#1f7a4c]"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}

            {displayError && (
              <div
                role="alert"
                className="mt-4 rounded-[12px] border border-[#b3323e]/25 bg-white px-4 py-3 text-[13px] leading-relaxed text-[#b3323e]"
              >
                {displayError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5" noValidate>
              {mode === 'register' && (
                <div>
                  <label className="block text-[12.5px] font-medium text-[#5c5156]">
                    Full Name
                    <div className="relative mt-1.5">
                      <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a7f83]" />
                      <input
                        ref={firstInputRef}
                        type="text"
                        required
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nadia Mansour"
                        className="w-full rounded-[12px] border border-[#1d1a1c]/15 bg-white py-2.5 pl-10 pr-4 text-[14.5px] text-[#1d1a1c]"
                      />
                    </div>
                  </label>
                </div>
              )}

              <div>
                <label className="block text-[12.5px] font-medium text-[#5c5156]">
                  Email Address
                  <div className="relative mt-1.5">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a7f83]" />
                    <input
                      ref={mode !== 'register' ? firstInputRef : undefined}
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-[12px] border border-[#1d1a1c]/15 bg-white py-2.5 pl-10 pr-4 text-[14.5px] text-[#1d1a1c]"
                    />
                  </div>
                </label>
              </div>

              {mode !== 'reset' && (
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="auth-password-input"
                      className="text-[12.5px] font-medium text-[#5c5156]"
                    >
                      Password
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => switchMode('reset')}
                        className="rounded-[4px] text-[12px] font-medium text-[#9a4b00] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d1a1c]"
                      >
                        Forgot your password?
                      </button>
                    )}
                  </div>
                  <div className="relative mt-1.5">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a7f83]" />
                    <input
                      id="auth-password-input"
                      type="password"
                      required
                      minLength={6}
                      autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full rounded-[12px] border border-[#1d1a1c]/15 bg-white py-2.5 pl-10 pr-4 text-[14.5px] text-[#1d1a1c]"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={authActionPending}
                className="h-12 w-full rounded-full font-urbanist text-[15px] font-semibold text-white transition-all hover:brightness-95 disabled:opacity-60"
                style={{ backgroundColor: '#b85c00' }}
              >
                {authActionPending
                  ? 'Processing...'
                  : mode === 'register'
                    ? 'Create Account'
                    : mode === 'reset'
                      ? 'Send Password Reset Link'
                      : 'Sign In'}
              </button>
            </form>

            <div className="my-4 flex items-center gap-3">
              <div className="h-[1px] flex-1 bg-[#1d1a1c]/12" />
              <span className="text-[12px] uppercase tracking-[0.08em] text-[#8a7f83]">or</span>
              <div className="h-[1px] flex-1 bg-[#1d1a1c]/12" />
            </div>

            <button
              type="button"
              disabled={authActionPending}
              onClick={handleGoogle}
              className="flex h-11 w-full items-center justify-center gap-2.5 rounded-full border border-[#1d1a1c]/20 bg-white text-[14px] font-medium text-[#1d1a1c] transition-colors hover:bg-[#fbe7da]/60 disabled:opacity-60"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
