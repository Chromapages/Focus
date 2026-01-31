import { NextResponse } from 'next/server';
import { z } from 'zod';
import * as admin from 'firebase-admin';
import { requireUserId } from '@/lib/auth';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { createAllDayEvent, loadGoogleTokens } from '@/lib/googleCalendar';

const ActionItemSchema = z.object({
  title: z.string().min(1),
  dueDateISO: z.string().optional().nullable(),
  priority: z.enum(['low', 'med', 'high']).optional().nullable(),
});

const MeetingSchema = z.object({
  summary: z.string().min(1),
  decisions: z.array(z.string()).default([]),
  actionItems: z.array(ActionItemSchema).default([]),
  followUps: z.array(z.string()).default([]),
});

function toNoteBody(meeting: z.infer<typeof MeetingSchema>) {
  const lines: string[] = [];
  lines.push('## Summary');
  lines.push(meeting.summary.trim());
  lines.push('');

  lines.push('## Decisions');
  if (meeting.decisions.length) lines.push(...meeting.decisions.map((d) => `- ${d}`));
  else lines.push('- (none)');
  lines.push('');

  lines.push('## Action items');
  if (meeting.actionItems.length)
    lines.push(
      ...meeting.actionItems.map((a) =>
        `- ${a.title}${a.dueDateISO ? ` (due ${String(a.dueDateISO).slice(0, 10)})` : ''}${a.priority ? ` [${a.priority}]` : ''}`
      )
    );
  else lines.push('- (none)');
  lines.push('');

  lines.push('## Follow ups');
  if (meeting.followUps.length) lines.push(...meeting.followUps.map((f) => `- ${f}`));
  else lines.push('- (none)');

  return lines.join('\n');
}

function dueISOToMs(dueDateISO: string) {
  // Accept YYYY-MM-DD or full ISO. For date-only, use local noon to avoid TZ edge.
  if (/^\d{4}-\d{2}-\d{2}$/.test(dueDateISO)) {
    const d = new Date(`${dueDateISO}T12:00:00`);
    return d.getTime();
  }
  return new Date(dueDateISO).getTime();
}

export async function POST(req: Request) {
  try {
    const uid = await requireUserId(req);
    const body = (await req.json()) as any;

    const meeting = MeetingSchema.parse(body?.meeting);
    const writeBack = Boolean(body?.writeBack);

    const db = getAdminDb();
    const now = Date.now();

    const noteRef = await db.collection(`users/${uid}/notes`).add({
      title: `Meeting • ${new Date(now).toLocaleDateString()}`,
      body: toNoteBody(meeting),
      createdAt: now,
      updatedAt: now,
      createdAtServer: admin.firestore.FieldValue.serverTimestamp(),
      source: 'meetingTranscript',
    });

    const createdTaskIds: string[] = [];
    for (const a of meeting.actionItems) {
      const dueAt = a.dueDateISO ? dueISOToMs(a.dueDateISO) : null;
      const taskRef = await db.collection(`users/${uid}/tasks`).add({
        title: a.title,
        createdAt: now,
        status: 'open',
        priority: a.priority ?? null,
        dueAt,
        createdAtServer: admin.firestore.FieldValue.serverTimestamp(),
        sourceNoteId: noteRef.id,
        source: 'meetingTranscript',
      });
      createdTaskIds.push(taskRef.id);

      if (writeBack && a.dueDateISO) {
        // Only attempt if calendar is connected.
        try {
          await loadGoogleTokens(uid);
          await createAllDayEvent(uid, a.title, a.dueDateISO);
        } catch {
          // Ignore write-back errors (MVP); note/tasks are already created.
        }
      }
    }

    return NextResponse.json({ ok: true, noteId: noteRef.id, taskIds: createdTaskIds });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Failed to finalize meeting' }, { status: 500 });
  }
}
