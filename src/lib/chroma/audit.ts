import { getAdminDb } from '@/lib/firebaseAdmin';
import type { ChromaAppId } from '@/lib/chroma/types';

export type ChromaAuditEvent = {
  userId?: string;
  mode: 'user' | 'service' | 'none';
  sourceApp?: ChromaAppId;
  action: string;
  commandId?: string;
  payload?: any;
  createdAt: string;
};

export async function writeChromaAudit(event: ChromaAuditEvent) {
  // Fire-and-forget friendly, but keep it awaited in routes for now.
  const db = getAdminDb();
  await db.collection('chroma_audit').add(event);
}
