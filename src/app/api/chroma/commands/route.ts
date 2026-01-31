import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getChromaAuthMode, requireChromaServiceKey, requireChromaUserId } from '@/lib/chroma/auth';
import { writeChromaAudit } from '@/lib/chroma/audit';
import type { ChromaCommandEnvelope } from '@/lib/chroma/types';

const EnvelopeSchema: z.ZodType<ChromaCommandEnvelope> = z.object({
  id: z.string().min(8),
  name: z.string().min(1),
  sourceApp: z.string().min(1),
  issuedAt: z.string().min(10),
  userId: z.string().optional(),
  payload: z.unknown(),
});

export async function POST(req: Request) {
  const mode = getChromaAuthMode(req);
  try {
    let userId: string | undefined;
    if (mode === 'user') userId = await requireChromaUserId(req);
    else if (mode === 'service') requireChromaServiceKey(req);
    else throw new Error('UNAUTHENTICATED');

    const json = await req.json();
    const cmd = EnvelopeSchema.parse(json);

    // Scaffold only: accept the command, audit it, and return a no-op result.
    await writeChromaAudit({
      userId: userId || cmd.userId,
      mode,
      sourceApp: cmd.sourceApp,
      action: `command:${cmd.name}`,
      commandId: cmd.id,
      payload: cmd.payload,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      commandId: cmd.id,
      handledBy: 'focus',
      result: { status: 'accepted' },
    });
  } catch (e: any) {
    const msg = e?.message || 'Failed';
    const status = msg === 'UNAUTHENTICATED' ? 401 : msg === 'CHROMA_SHARED_KEY_NOT_CONFIGURED' ? 500 : 400;

    // Best-effort audit of failures without leaking secrets.
    try {
      await writeChromaAudit({
        mode,
        action: 'command:error',
        payload: { error: msg },
        createdAt: new Date().toISOString(),
      });
    } catch {
      // ignore
    }

    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
