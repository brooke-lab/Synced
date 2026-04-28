import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  couple: any | null;
  partner: any | null;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, couple: null, partner: null });

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [couple, setCouple] = useState<any | null>(null);
  const [partner, setPartner] = useState<any | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setCouple(null);
        setPartner(null);
        setLoading(false);
        return;
      }

      // Listen to user profile for coupleId
      const userDocRef = doc(db, 'users', u.uid);
      const unsubUser = onSnapshot(userDocRef, (snap) => {
        const userData = snap.data();
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
