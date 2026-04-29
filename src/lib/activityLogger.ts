import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export type ActivityType = 'music' | 'gallery' | 'goal' | 'plan' | 'reflection' | 'status' | 'movie' | 'nickname';

export async function logActivity(
  coupleId: string, 
  userId: string, 
  type: ActivityType, 
  content: string, 
  metadata: any = {}
) {
  if (!coupleId) return;
  
  try {
    const activitiesRef = collection(db, 'couples', coupleId, 'activities');
    await addDoc(activitiesRef, {
      type,
      userId,
      content,
      metadata,
      likedBy: [],
      replies: [],
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}
