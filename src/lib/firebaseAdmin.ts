import * as admin from 'firebase-admin';

function getPrivateKey() {
  const key = process.env.FIREBASE_PRIVATE_KEY;
  if (!key) return undefined;
  return key.replace(/\\n/g, '\n');
}

export function getFirebaseAdminApp() {
  if (admin.apps.length) return admin.app();

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = getPrivateKey();

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('FIREBASE_ADMIN_NOT_CONFIGURED');
  }

  return admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

export async function verifyFirebaseIdToken(idToken: string) {
  const app = getFirebaseAdminApp();
  return admin.auth(app).verifyIdToken(idToken);
}
