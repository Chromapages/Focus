import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Task, UserProfile, DailySchedule, PartnerSchedule } from '../types';

interface AppData {
  tasks: Task[];
  userProfile: UserProfile;
  schedule: DailySchedule | null;
  partnerSchedule: PartnerSchedule;
  savedThemeId: string;
  lastUpdated: number;
}

// LocalStorage key helper
const LS_KEY_PREFIX = 'focus_forge_data_';

export const loadUserData = async (userId: string): Promise<Partial<AppData> | null> => {
  // 1. Try Firebase if available
  if (db) {
    try {
      const docRef = doc(db, "users", userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data() as Partial<AppData>;
      }
    } catch (error) {
      console.error("Error loading from Firestore, trying local:", error);
    }
  }

  // 2. Fallback to LocalStorage
  try {
    const localData = localStorage.getItem(`${LS_KEY_PREFIX}${userId}`);
    if (localData) {
      console.log("Loaded data from LocalStorage");
      return JSON.parse(localData) as Partial<AppData>;
    }
  } catch (e) {
    console.error("Error loading local data", e);
  }

  return null;
};

export const saveUserData = async (userId: string, data: Partial<AppData>) => {
  const payload = {
    ...data,
    lastUpdated: Date.now()
  };

  // 1. Try Firebase if available
  if (db) {
    try {
      const docRef = doc(db, "users", userId);
      // setDoc with merge: true creates/updates
      await setDoc(docRef, payload, { merge: true });
      console.log("Progress saved to Firestore");
      return; 
    } catch (error) {
      console.error("Error saving to Firestore, falling back to local:", error);
    }
  }

  // 2. Fallback to LocalStorage
  try {
    localStorage.setItem(`${LS_KEY_PREFIX}${userId}`, JSON.stringify(payload));
    console.log("Progress saved to LocalStorage");
  } catch (e) {
    console.error("Error saving to LocalStorage", e);
  }
};