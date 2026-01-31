import { NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth';
import { getIntegrationRef } from '@/lib/googleCalendar';

export async function POST(req: Request) {
  try {
    const uid = await requireUserId(req);
    const ref = await getIntegrationRef(uid);
    await ref.delete();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Unauthorized' }, { status: 401 });
  }
}
