import { decryptString, encryptString, type EncryptedStringV1 } from '@/lib/encryption';
import { getAdminDb } from '@/lib/firebaseAdmin';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

export type GoogleCalendarIntegrationDoc = {
  connectedAt: number;
  // encrypted tokens (server-only)
  accessTokenEnc?: EncryptedStringV1;
  refreshTokenEnc?: EncryptedStringV1;
  expiryDateMs?: number; // ms epoch
  scope?: string;
  tokenType?: string;
  writeBackEnabled?: boolean;
  updatedAt?: number;
};

function requiredEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name}_NOT_SET`);
  return v;
}

export function getGoogleOAuthConfig() {
  return {
    clientId: requiredEnv('GOOGLE_CLIENT_ID'),
    clientSecret: requiredEnv('GOOGLE_CLIENT_SECRET'),
    redirectUri: requiredEnv('GOOGLE_REDIRECT_URI'),
  };
}

export function googleConsentUrl(state: string) {
  const { clientId, redirectUri } = getGoogleOAuthConfig();
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set(
    'scope',
    [
      'https://www.googleapis.com/auth/calendar.readonly',
      // Needed for optional write-back (creating due-date events)
      'https://www.googleapis.com/auth/calendar.events',
    ].join(' ')
  );
  url.searchParams.set('state', state);
  return url.toString();
}

export async function exchangeCodeForTokens(code: string) {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig();

  const body = new URLSearchParams();
  body.set('code', code);
  body.set('client_id', clientId);
  body.set('client_secret', clientSecret);
  body.set('redirect_uri', redirectUri);
  body.set('grant_type', 'authorization_code');

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const json = (await res.json()) as any;
  if (!res.ok) throw new Error(`GOOGLE_TOKEN_EXCHANGE_FAILED: ${JSON.stringify(json)}`);

  return {
    access_token: String(json.access_token ?? ''),
    refresh_token: json.refresh_token == null ? undefined : String(json.refresh_token),
    expires_in: Number(json.expires_in ?? 0),
    scope: json.scope == null ? undefined : String(json.scope),
    token_type: json.token_type == null ? undefined : String(json.token_type),
  };
}

export async function refreshAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = getGoogleOAuthConfig();

  const body = new URLSearchParams();
  body.set('client_id', clientId);
  body.set('client_secret', clientSecret);
  body.set('refresh_token', refreshToken);
  body.set('grant_type', 'refresh_token');

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const json = (await res.json()) as any;
  if (!res.ok) throw new Error(`GOOGLE_TOKEN_REFRESH_FAILED: ${JSON.stringify(json)}`);

  return {
    access_token: String(json.access_token ?? ''),
    expires_in: Number(json.expires_in ?? 0),
    scope: json.scope == null ? undefined : String(json.scope),
    token_type: json.token_type == null ? undefined : String(json.token_type),
  };
}

export async function getIntegrationRef(uid: string) {
  const db = getAdminDb();
  return db.doc(`users/${uid}/integrations/googleCalendar`);
}

export async function loadGoogleTokens(uid: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiryDateMs?: number;
  writeBackEnabled: boolean;
}> {
  const ref = await getIntegrationRef(uid);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('GOOGLE_CALENDAR_NOT_CONNECTED');
  const data = snap.data() as GoogleCalendarIntegrationDoc;

  const refreshTokenEnc = data.refreshTokenEnc;
  if (!refreshTokenEnc) throw new Error('GOOGLE_REFRESH_TOKEN_MISSING');

  const refreshToken = decryptString(refreshTokenEnc);
  const accessToken = data.accessTokenEnc ? decryptString(data.accessTokenEnc) : '';

  return {
    accessToken,
    refreshToken,
    expiryDateMs: data.expiryDateMs,
    writeBackEnabled: Boolean(data.writeBackEnabled),
  };
}

export async function ensureValidAccessToken(uid: string) {
  const ref = await getIntegrationRef(uid);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('GOOGLE_CALENDAR_NOT_CONNECTED');
  const data = snap.data() as GoogleCalendarIntegrationDoc;

  const refreshTokenEnc = data.refreshTokenEnc;
  if (!refreshTokenEnc) throw new Error('GOOGLE_REFRESH_TOKEN_MISSING');
  const refreshToken = decryptString(refreshTokenEnc);

  const now = Date.now();
  const expiresAt = data.expiryDateMs ?? 0;
  const hasAccess = Boolean(data.accessTokenEnc);

  // Refresh ~2 minutes early.
  if (!hasAccess || expiresAt - 2 * 60_000 <= now) {
    const refreshed = await refreshAccessToken(refreshToken);
    const nextExpiry = now + refreshed.expires_in * 1000;

    await ref.set(
      {
        accessTokenEnc: encryptString(refreshed.access_token),
        expiryDateMs: nextExpiry,
        updatedAt: Date.now(),
      } satisfies Partial<GoogleCalendarIntegrationDoc>,
      { merge: true }
    );

    return { accessToken: refreshed.access_token, refreshToken };
  }

  const accessToken = data.accessTokenEnc ? decryptString(data.accessTokenEnc) : '';
  return { accessToken, refreshToken };
}

export async function listUpcomingEvents(uid: string, days: number) {
  const { accessToken } = await ensureValidAccessToken(uid);

  const timeMin = new Date().toISOString();
  const timeMax = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
  url.searchParams.set('timeMin', timeMin);
  url.searchParams.set('timeMax', timeMax);
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('maxResults', '50');

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const json = (await res.json()) as any;
  if (!res.ok) throw new Error(`GOOGLE_CALENDAR_EVENTS_FAILED: ${JSON.stringify(json)}`);

  const items = Array.isArray(json.items) ? json.items : [];
  return items.map((e: any) => ({
    id: String(e.id ?? ''),
    title: String(e.summary ?? '(No title)'),
    start: String(e.start?.dateTime ?? e.start?.date ?? ''),
    end: String(e.end?.dateTime ?? e.end?.date ?? ''),
    htmlLink: e.htmlLink == null ? undefined : String(e.htmlLink),
  }));
}

export async function createAllDayEvent(uid: string, title: string, dateISO: string) {
  const { accessToken } = await ensureValidAccessToken(uid);

  // For all-day events, Google expects end.date to be the day AFTER (exclusive).
  const startDate = dateISO.slice(0, 10);
  const endDate = new Date(`${startDate}T00:00:00Z`);
  endDate.setUTCDate(endDate.getUTCDate() + 1);
  const endDateStr = endDate.toISOString().slice(0, 10);

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: title,
      start: { date: startDate },
      end: { date: endDateStr },
    }),
  });
  const json = (await res.json()) as any;
  if (!res.ok) throw new Error(`GOOGLE_CALENDAR_CREATE_EVENT_FAILED: ${JSON.stringify(json)}`);
  return { id: String(json.id ?? '') };
}
