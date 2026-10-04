import { signInAnonymously, type User } from 'firebase/auth';
import { getFirebaseAuth } from './config';

// Memoised so that React StrictMode double-mounts and several components
// calling useAuth() at once share ONE sign-in. Without this each of them can
// see `currentUser === null` and create its own anonymous account (junk users).
let pending: Promise<User> | null = null;

/**
 * Resolves once Firebase Auth has restored the persisted session (or created
 * a new anonymous one). Firestore only attaches the ID token after this, so
 * nothing that reads/writes Firestore under `request.auth != null` rules may
 * run before it resolves.
 */
export function ensureAnonymousUser(): Promise<User> {
  if (!pending) {
    const auth = getFirebaseAuth();
    pending = auth
      .authStateReady()
      .then(async () => auth.currentUser ?? (await signInAnonymously(auth)).user);
    // Allow a retry on the next call if sign-in failed.
    pending.catch(() => {
      pending = null;
    });
  }
  return pending;
}
