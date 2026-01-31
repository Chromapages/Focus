import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUserId } from '@/lib/auth';

const ActionItemSchema = z.object({
  title: z.string().min(1),
  dueDateISO: z.string().min(1).optional().nullable(),
  priority: z.enum(['low', 'med', 'high']).optional().nullable(),
});

const MeetingExtractSchema = z.object({
  summary: z.string().min(1),
  decisions: z.array(z.string()).default([]),
  actionItems: z.array(ActionItemSchema).default([]),
  followUps: z.array(z.string()).default([]),
});

function requiredEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name}_NOT_SET`);
  return v;
}

function extractJson(text: string) {
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) throw new Error('MODEL_RETURNED_NO_JSON');
  return text.slice(first, last + 1);
}

export async function POST(req: Request) {
  try {
    await requireUserId(req);

    const body = (await req.json()) as any;
    const transcript = String(body?.transcript ?? '').trim();
    if (!transcript) return NextResponse.json({ error: 'Missing transcript' }, { status: 400 });

    const apiKey = requiredEnv('GEMINI_API_KEY');
    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

    const prompt = `You are an expert meeting note taker.

Return ONLY valid JSON matching this schema:
{
  "summary": string,
  "decisions": string[],
  "actionItems": {"title": string, "dueDateISO"?: string, "priority"?: "low"|"med"|"high"}[],
  "followUps": string[]
}

Rules:
- If no decisions/action items/follow ups, return empty arrays.
- dueDateISO should be ISO date or datetime (e.g. 2026-01-31 or 2026-01-31T17:00:00Z) when clearly stated; otherwise omit.
- Keep action item titles short and imperative.

Transcript:
${transcript}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    const json = (await res.json()) as any;
    if (!res.ok) return NextResponse.json({ error: 'Gemini failed', details: json }, { status: 500 });

    const text =
      json?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? '').join('') ??
      json?.candidates?.[0]?.content?.parts?.[0]?.text ??
      '';

    const parsedRaw = JSON.parse(extractJson(String(text)));
    const parsed = MeetingExtractSchema.parse(parsedRaw);

    return NextResponse.json({ meeting: parsed });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Failed to process transcript' }, { status: 500 });
  }
}
