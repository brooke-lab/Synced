import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
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

      try {
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

        const unsubUser = onSnapshot(userDocRef, async (snap) => {
          const userData = snap.data();
          if (!userData) return;

          // Merge metadata from auth
          setUser({ ...u, ...userData });
          
          if (userData.coupleId) {
            // Listen to couple data
            const coupleDocRef = doc(db, 'couples', userData.coupleId);
            onSnapshot(coupleDocRef, (coupleSnap) => {
              const coupleData = coupleSnap.data();
              if (coupleData) {
                setCouple({ id: coupleSnap.id, ...coupleData });

                // Find partner
                const partnerId = coupleData.members.find((m: string) => m !== u.uid && m !== 'PARTNER_WAITING');
                if (partnerId) {
                  onSnapshot(doc(db, 'users', partnerId), (partnerSnap) => {
                    if (partnerSnap.exists()) {
                      setPartner({ id: partnerSnap.id, ...partnerSnap.data() });
                    }
                  });
                } else {
                  setPartner(null);
                }
              }
              setLoading(false);
            }, (err) => {
              console.error("Couple snapshot error:", err);
              setLoading(false);
            });
          } else {
            // Initialize solo space if missing
            const soloId = `solo_${u.uid}`;
            const soloRef = doc(db, 'couples', soloId);
            try {
              const soloSnap = await getDoc(soloRef);
              if (!soloSnap.exists()) {
                await setDoc(soloRef, {
                  members: [u.uid],
                  invitationCode: u.uid.substring(0, 6).toUpperCase(),
                  createdAt: serverTimestamp(),
                  theme: 'default',
                  quoteOfTheDay: {
                    text: "Love is composed of a single soul inhabiting two bodies.",
                    author: "Aristotle"
                  }
                });
              }
              await updateDoc(userDocRef, { coupleId: soloId, role: 'owner' });
            } catch (err) {
              console.error("Solo initialization error:", err);
            }
            setPartner(null);
            setLoading(false);
          }
        }, (err) => {
          console.error("User snapshot error:", err);
          setLoading(false);
        });

        return () => unsubUser();
      } catch (err) {
        console.error("Auth initialization error:", err);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, couple, partner }}>
      {children}
    </AuthContext.Provider>
  );
}
