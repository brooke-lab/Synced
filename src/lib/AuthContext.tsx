import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

interface AuthContextType {
  user: any | null; // This will be the Firestore profile merged with Auth metadata
  loading: boolean;
  couple: any | null;
  partner: any | null;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, couple: null, partner: null });

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [couple, setCouple] = useState<any | null>(null);
  const [partner, setPartner] = useState<any | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null);
        setCouple(null);
        setPartner(null);
        setLoading(false);
        return;
      }

      // Listen to user profile for coupleId
      const userDocRef = doc(db, 'users', u.uid);
      
      // Ensure user document exists with basic info
      const userSnap = await getDoc(userDocRef);
      if (!userSnap.exists()) {
        await setDoc(userDocRef, {
          uid: u.uid,
          email: u.email,
          displayName: u.displayName || 'User',
          photoURL: u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`,
          role: 'member', // Default to member, link creator will be owner
          nicknames: {},
          createdAt: serverTimestamp()
        });
      }

      const unsubUser = onSnapshot(userDocRef, (snap) => {
        const userData = snap.data();
        // Merge metadata from auth
        setUser({ ...u, ...userData });
        
        if (userData?.coupleId) {
          // Listen to couple data
          const coupleDocRef = doc(db, 'couples', userData.coupleId);
          onSnapshot(coupleDocRef, (coupleSnap) => {
            const coupleData = coupleSnap.data();
            setCouple({ id: coupleSnap.id, ...coupleData });

            // Find partner
            const partnerId = coupleData?.members.find((m: string) => m !== u.uid);
            if (partnerId) {
              onSnapshot(doc(db, 'users', partnerId), (partnerSnap) => {
                setPartner({ id: partnerSnap.id, ...partnerSnap.data() });
              });
            }
          });
        } else {
          setCouple(null);
          setPartner(null);
        }
        setLoading(false);
      });

      return () => unsubUser();
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, couple, partner }}>
      {children}
    </AuthContext.Provider>
  );
}
