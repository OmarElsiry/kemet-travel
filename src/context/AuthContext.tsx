import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { ADMIN_PRIMARY_EMAIL, auth, googleProvider } from '../firebase';
import {
  checkIsSalesAdmin,
  ensureUserProfileDoc,
  updateUserProfileFields,
  type UserProfileRecord,
} from '../services/firestoreService';
import type { CurrencyCode } from '../utils/bookingLogic';

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfileRecord | null;
  isAuthReady: boolean;
  isAdmin: boolean;
  isOnline: boolean;
  authActionPending: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signInWithGoogle: () => Promise<boolean>;
  signInWithEmail: (email: string, password: string) => Promise<boolean>;
  registerWithEmail: (params: {
    name: string;
    email: string;
    password: string;
  }) => Promise<{ ok: boolean; needsVerification: boolean }>;
  sendResetEmail: (email: string) => Promise<boolean>;
  resendVerificationEmail: () => Promise<boolean>;
  refreshVerificationStatus: () => Promise<boolean>;
  updateProfileDetails: (updates: {
    displayName: string;
    phone: string;
    preferredCurrency: CurrencyCode;
  }) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapFirebaseAuthError(error: unknown): string {
  const code = (error as { code?: string })?.code || '';
  switch (code) {
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not yet enabled in Firebase Console Authentication > Sign-in method. Please continue with Google Sign-In or enable Email/Password in Firebase Console.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email address or password. Please check your credentials or use Forgot Password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please sign in or reset your password.';
    case 'auth/weak-password':
      return 'Please choose a stronger password (at least 6 characters).';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed before completing.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the sign-in popup. Please allow popups for this site and try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment before trying again.';
    case 'auth/network-request-failed':
      return 'Network connection error. Please check your internet connection and retry.';
    default:
      return error instanceof Error
        ? error.message
        : 'Authentication could not be completed. Please try again.';
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfileRecord | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authActionPending, setAuthActionPending] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const syncVerifiedUser = useCallback(async (user: User | null) => {
    if (!user) {
      setProfile(null);
      setIsAdmin(false);
      return;
    }

    if (!user.emailVerified) {
      setProfile({
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'Guest',
        phone: '',
        preferredCurrency: 'EGP',
        role: 'customer',
        createdAtIso: new Date().toISOString(),
        updatedAtIso: new Date().toISOString(),
      });
      setIsAdmin(false);
      return;
    }

    try {
      const [loadedProfile, adminDocExists] = await Promise.all([
        ensureUserProfileDoc({
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || user.email?.split('@')[0] || 'Guest',
        }),
        checkIsSalesAdmin(user.uid),
      ]);
      setProfile(loadedProfile);
      const primaryMatch =
        user.email?.toLowerCase() === ADMIN_PRIMARY_EMAIL.toLowerCase() && user.emailVerified;
      setIsAdmin(primaryMatch || adminDocExists || loadedProfile?.role === 'sales');
    } catch (err) {
      console.warn('Profile sync warning:', err);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      await syncVerifiedUser(user);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, [syncVerifiedUser]);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const signInWithGoogle = useCallback(async (): Promise<boolean> => {
    setAuthError(null);
    setAuthActionPending(true);
    try {
      await signInWithPopup(auth, googleProvider);
      return true;
    } catch (error) {
      setAuthError(mapFirebaseAuthError(error));
      return false;
    } finally {
      setAuthActionPending(false);
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string): Promise<boolean> => {
    setAuthError(null);
    setAuthActionPending(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      return true;
    } catch (error) {
      setAuthError(mapFirebaseAuthError(error));
      return false;
    } finally {
      setAuthActionPending(false);
    }
  }, []);

  const registerWithEmail = useCallback(
    async (params: {
      name: string;
      email: string;
      password: string;
    }): Promise<{ ok: boolean; needsVerification: boolean }> => {
      setAuthError(null);
      setAuthActionPending(true);
      try {
        const cred = await createUserWithEmailAndPassword(
          auth,
          params.email.trim(),
          params.password,
        );
        await updateProfile(cred.user, { displayName: params.name.trim() });
        await sendEmailVerification(cred.user);
        setFirebaseUser(cred.user);
        await syncVerifiedUser(cred.user);
        return { ok: true, needsVerification: !cred.user.emailVerified };
      } catch (error) {
        setAuthError(mapFirebaseAuthError(error));
        return { ok: false, needsVerification: false };
      } finally {
        setAuthActionPending(false);
      }
    },
    [syncVerifiedUser],
  );

  const sendResetEmail = useCallback(async (email: string): Promise<boolean> => {
    setAuthError(null);
    setAuthActionPending(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return true;
    } catch (error) {
      setAuthError(mapFirebaseAuthError(error));
      return false;
    } finally {
      setAuthActionPending(false);
    }
  }, []);

  const resendVerificationEmail = useCallback(async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    setAuthError(null);
    setAuthActionPending(true);
    try {
      await sendEmailVerification(auth.currentUser);
      return true;
    } catch (error) {
      setAuthError(mapFirebaseAuthError(error));
      return false;
    } finally {
      setAuthActionPending(false);
    }
  }, []);

  const refreshVerificationStatus = useCallback(async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    setAuthError(null);
    setAuthActionPending(true);
    try {
      await reload(auth.currentUser);
      const refreshed = auth.currentUser;
      setFirebaseUser(refreshed);
      await syncVerifiedUser(refreshed);
      return Boolean(refreshed?.emailVerified);
    } catch (error) {
      setAuthError(mapFirebaseAuthError(error));
      return false;
    } finally {
      setAuthActionPending(false);
    }
  }, [syncVerifiedUser]);

  const updateProfileDetails = useCallback(
    async (updates: {
      displayName: string;
      phone: string;
      preferredCurrency: CurrencyCode;
    }): Promise<boolean> => {
      if (!auth.currentUser || !auth.currentUser.emailVerified) {
        setAuthError('Please verify your email address before updating your profile.');
        return false;
      }
      setAuthError(null);
      setAuthActionPending(true);
      try {
        await updateUserProfileFields(auth.currentUser.uid, updates);
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                displayName: updates.displayName.trim(),
                phone: updates.phone.trim(),
                preferredCurrency: updates.preferredCurrency,
                updatedAtIso: new Date().toISOString(),
              }
            : null,
        );
        return true;
      } catch (error) {
        setAuthError(mapFirebaseAuthError(error));
        return false;
      } finally {
        setAuthActionPending(false);
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    setAuthError(null);
    await signOut(auth);
    setProfile(null);
    setIsAdmin(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        isAuthReady,
        isAdmin,
        isOnline,
        authActionPending,
        authError,
        clearAuthError,
        signInWithGoogle,
        signInWithEmail,
        registerWithEmail,
        sendResetEmail,
        resendVerificationEmail,
        refreshVerificationStatus,
        updateProfileDetails,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
