'use client';

import { getFirebaseAuth } from '@/lib/firebaseClient';

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const auth = getFirebaseAuth();
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Not signed in');

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);

  return fetch(input, { ...init, headers });
}
