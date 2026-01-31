import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireUserId } from '@/lib/auth';
import { googleConsentUrl } from '@/lib/googleCalendar';

export async function GET(req: Request) {
  try {
    const uid = await requireUserId(req);

    const state = crypto.randomBytes(24).toString('base64url');
    const url = googleConsentUrl(state);

    const res = NextResponse.json({ url });
    // HttpOnly cookie holding both state + uid so callback can save tokens for the right user.
    res.cookies.set('gc_oauth', Buffer.from(JSON.stringify({ state, uid }), 'utf8').toString('base64url'), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/api/integrations/googleCalendar/callback',
      maxAge: 10 * 60, // 10 minutes
    });

    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Failed to start OAuth' }, { status: 401 });
  }
}
