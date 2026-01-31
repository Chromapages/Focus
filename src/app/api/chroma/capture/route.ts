import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getChromaAuthMode, requireChromaServiceKey, requireChromaUserId } from '@/lib/chroma/auth';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { writeChromaAudit } from '@/lib/chroma/audit';

const BodySchema = z.object({
  text: z.string().min(1).max(4000),
  sourceApp: z.string().optional(),
  url: z.string().url().optional(),
  tags: z.array(z.string().min(1).max(40)).max(12).optional(),
});

export async function POST(req: Request) {
  const mode = getChromaAuthMode(req);
  try {
    let userId: string | undefined;
    if (mode === 'user') userId = await requireChromaUserId(req);
    else if (mode === 'service') requireChromaServiceKey(req);
    else throw new Error('UNAUTHENTICATED');

    const body = BodySchema.parse(await req.json());

    const db = getAdminDb();
    const doc = {
      userId: userId || null,
      mode,
      sourceApp: body.sourceApp || null,
      text: body.text,
      url: body.url || null,
      tags: body.tags || [],
      createdAt: new Date().toISOString(),
    };

    const ref = await db.collection('chroma_captures').add(doc);

    await writeChromaAudit({
      userId,
      mode,
      sourceApp: (body.sourceApp as any) || undefined,
      action: 'quick_capture:create',
      payload: { captureId: ref.id },
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, id: ref.id });
  } catch (e: any) {
    const msg = e?.message || 'Failed';
    const status = msg === 'UNAUTHENTICATED' ? 401 : msg === 'CHROMA_SHARED_KEY_NOT_CONFIGURED' ? 500 : 400;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
