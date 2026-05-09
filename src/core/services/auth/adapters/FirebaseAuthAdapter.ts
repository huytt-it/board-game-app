import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirebaseAuth } from '@core/services/firebase/config';
import type { IAuthProvider } from '../IAuthProvider';

export class FirebaseAuthAdapter implements IAuthProvider {
  authenticate(_existingId: string | null): Promise<string> {
    return new Promise((resolve, reject) => {
      const auth = getFirebaseAuth();
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        unsubscribe();
        try {
          if (user) {
            resolve(user.uid);
          } else {
            const cred = await signInAnonymously(auth);
            resolve(cred.user.uid);
          }
        } catch (err) {
          reject(err);
        }
      });
    });
  }
}
