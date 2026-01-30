import { getFirestore } from 'firebase/firestore';
import { getFirebaseApp } from '@/lib/firebaseClient';

export function getDb() {
  return getFirestore(getFirebaseApp());
}
