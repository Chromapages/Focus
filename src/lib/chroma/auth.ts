import { requireUserId } from '@/lib/auth';

function safeEq(a: string, b: string) {
  // Constant-ish time compare to avoid trivial timing leaks.
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export async function requireChromaUserId(req: Request) {
  return requireUserId(req);
}

export function requireChromaServiceKey(req: Request) {
  const expected = process.env.CHROMA_SHARED_KEY;
  if (!expected) throw new Error('CHROMA_SHARED_KEY_NOT_CONFIGURED');

  const got = req.headers.get('x-chroma-key') || '';
  if (!got || !safeEq(got, expected)) throw new Error('UNAUTHENTICATED');
  return true;
}

export function getChromaAuthMode(req: Request): 'user' | 'service' | 'none' {
  const hasBearer = !!(req.headers.get('authorization') || req.headers.get('Authorization'));
  const hasServiceKey = !!req.headers.get('x-chroma-key');
  if (hasBearer) return 'user';
  if (hasServiceKey) return 'service';
  return 'none';
}
