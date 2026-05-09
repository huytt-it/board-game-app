export interface IAuthProvider {
  authenticate(existingId: string | null): Promise<string>;
}
