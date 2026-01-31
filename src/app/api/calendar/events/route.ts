import { NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth';
import { listUpcomingEvents } from '@/lib/googleCalendar';

export async function GET(req: Request) {
  try {
    const uid = await requireUserId(req);
    const url = new URL(req.url);
    const days = Math.max(1, Math.min(30, Number(url.searchParams.get('days') ?? '7') || 7));

    const events = await listUpcomingEvents(uid, days);
    return NextResponse.json({ events });
  } catch (e: any) {
    const msg = e?.message ?? 'Failed to load events';
    const status = msg === 'GOOGLE_CALENDAR_NOT_CONNECTED' ? 409 : msg === 'UNAUTHENTICATED' ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
