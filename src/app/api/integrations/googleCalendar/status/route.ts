import { NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth';
import { getIntegrationRef } from '@/lib/googleCalendar';

export async function GET(req: Request) {
  try {
    const uid = await requireUserId(req);
    const ref = await getIntegrationRef(uid);
    const snap = await ref.get();

    if (!snap.exists) return NextResponse.json({ connected: false, writeBackEnabled: false });
    const data = snap.data() as any;

    return NextResponse.json({
      connected: true,
      writeBackEnabled: Boolean(data.writeBackEnabled),
      connectedAt: data.connectedAt ?? null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Unauthorized' }, { status: 401 });
  }
}
