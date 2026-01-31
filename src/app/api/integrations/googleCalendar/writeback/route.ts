import { NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth';
import { getIntegrationRef } from '@/lib/googleCalendar';

export async function POST(req: Request) {
  try {
    const uid = await requireUserId(req);
    const body = (await req.json().catch(() => null)) as any;
    const enabled = Boolean(body?.enabled);

    const ref = await getIntegrationRef(uid);
    await ref.set({ writeBackEnabled: enabled, updatedAt: Date.now() }, { merge: true });
    return NextResponse.json({ ok: true, writeBackEnabled: enabled });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Unauthorized' }, { status: 401 });
  }
}
