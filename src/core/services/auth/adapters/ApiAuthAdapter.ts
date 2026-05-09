import type { IAuthProvider } from '../IAuthProvider';

export class ApiAuthAdapter implements IAuthProvider {
  constructor(private readonly baseUrl: string) {}

  async authenticate(existingId: string | null): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: existingId }),
    });
    if (!res.ok) throw new Error(`Auth failed: ${res.status}`);
    const data = await res.json();
    return data.playerId;
  }
}
