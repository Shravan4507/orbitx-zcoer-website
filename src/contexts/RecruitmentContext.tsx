import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase/config';

interface RecruitmentContextType {
    isRecruitmentOpen: boolean;
    isLoading: boolean;
    toggleRecruitment: () => Promise<void>;
}

const RecruitmentContext = createContext<RecruitmentContextType | undefined>(undefined);

export function RecruitmentProvider({ children }: { children: ReactNode }) {
    const [isRecruitmentOpen, setIsRecruitmentOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Listen to recruitment status from Firestore
    useEffect(() => {
        const unsubscribe = onSnapshot(
            doc(db, 'settings', 'recruitment'),
            (docSnap) => {
                if (docSnap.exists()) {
                    setIsRecruitmentOpen(docSnap.data().isOpen ?? false);
                } else {
                    // Document doesn't exist, default to closed
                    setIsRecruitmentOpen(false);
                }
                setIsLoading(false);
            },
            (error) => {
                console.error('Error fetching recruitment status:', error);
                setIsRecruitmentOpen(false);
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    // Toggle recruitment status (for admins)
    const toggleRecruitment = async () => {
        try {
            await setDoc(doc(db, 'settings', 'recruitment'), {
                isOpen: !isRecruitmentOpen,
                updatedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error toggling recruitment:', error);
            throw error;
        }
    };

    return (
        <RecruitmentContext.Provider value={{ isRecruitmentOpen, isLoading, toggleRecruitment }}>
            {children}
        </RecruitmentContext.Provider>
    );
}

export function useRecruitment() {
    const context = useContext(RecruitmentContext);
    if (context === undefined) {
        throw new Error('useRecruitment must be used within a RecruitmentProvider');
    }
    return context;
}
