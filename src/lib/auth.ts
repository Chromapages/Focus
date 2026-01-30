import { verifyFirebaseIdToken } from '@/lib/firebaseAdmin';

function getBearerToken(req: Request) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1] || null;
}

export async function requireUserId(req: Request) {
  const token = getBearerToken(req);
  if (!token) throw new Error('UNAUTHENTICATED');
  const decoded = await verifyFirebaseIdToken(token);
  return decoded.uid;
}
