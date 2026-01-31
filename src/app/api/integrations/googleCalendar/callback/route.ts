import { NextResponse } from 'next/server';
import { exchangeCodeForTokens, getIntegrationRef } from '@/lib/googleCalendar';
import { encryptString } from '@/lib/encryption';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  const cookieStore = await cookies();
  const cookieVal = cookieStore.get('gc_oauth')?.value;
  const cookieJson = cookieVal ? JSON.parse(Buffer.from(cookieVal, 'base64url').toString('utf8')) : null;
  const expectedState = cookieJson?.state as string | undefined;
  const uid = cookieJson?.uid as string | undefined;

  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });
  if (!state || !expectedState || state !== expectedState || !uid) {
    return NextResponse.json({ error: 'Invalid state' }, { status: 400 });
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const now = Date.now();
    const expiryDateMs = now + tokens.expires_in * 1000;

    const ref = await getIntegrationRef(uid);

    // If refresh_token is omitted (repeat auth), keep the old one.
    const payload: any = {
      connectedAt: now,
      accessTokenEnc: encryptString(tokens.access_token),
      expiryDateMs,
      scope: tokens.scope,
      tokenType: tokens.token_type,
      updatedAt: now,
    };
    if (tokens.refresh_token) payload.refreshTokenEnc = encryptString(tokens.refresh_token);

    await ref.set(payload, { merge: true });

    const res = NextResponse.redirect(new URL('/settings?googleCalendar=connected', req.url));
    res.cookies.set('gc_oauth', '', { httpOnly: true, path: '/api/integrations/googleCalendar/callback', maxAge: 0 });
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'OAuth callback failed' }, { status: 500 });
  }
}
