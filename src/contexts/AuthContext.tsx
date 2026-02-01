// Auth Context - Global authentication state management
import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthChange, getCurrentUserProfile, logoutUser, syncGooglePhoto } from '@/services/firebase/auth';
import type { UserProfile, AdminProfile, AdminPermission } from '@/types/user';

interface AuthContextType {
    user: FirebaseUser | null;
    profile: UserProfile | AdminProfile | null;
    loading: boolean;
    isAuthenticated: boolean;
    isAdmin: boolean;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    hasPermission: (permission: AdminPermission) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [profile, setProfile] = useState<UserProfile | AdminProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthChange(async (firebaseUser) => {
            setUser(firebaseUser);

            if (firebaseUser) {
                try {
                    // Sync Google photo if user has one (runs in background)
                    if (firebaseUser.photoURL) {
                        syncGooglePhoto().catch(console.error);
                    }

                    const userProfile = await getCurrentUserProfile();

                    // If user has Google photo but profile doesn't have avatar, add it
                    if (userProfile && firebaseUser.photoURL && !userProfile.avatar) {
                        userProfile.avatar = firebaseUser.photoURL;
                    }

                    setProfile(userProfile);
                } catch (error) {
                    console.error('Error fetching user profile:', error);
                    setProfile(null);
                }
            } else {
                setProfile(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const logout = async () => {
        try {
            await logoutUser();
            setUser(null);
            setProfile(null);
        } catch (error) {
            console.error('Error logging out:', error);
            throw error;
        }
    };

    const refreshProfile = async () => {
        if (user) {
            try {
                const userProfile = await getCurrentUserProfile();
                setProfile(userProfile);
            } catch (error) {
                console.error('Error refreshing profile:', error);
            }
        }
    };

    // User is authenticated only if they have both Firebase Auth AND a Firestore profile
    const isAuthenticated = !!user && !!profile;

    // Check if user is an admin (has team field which only admins have)
    const isAdmin = useMemo(() => {
        return !!(profile && 'team' in profile && profile.team);
    }, [profile]);

    // Check if admin has specific permission
    const hasPermission = useCallback((permission: AdminPermission): boolean => {
        if (!isAdmin || !profile) return false;
        const adminProfile = profile as AdminProfile;
        return adminProfile.permissions?.includes(permission) || false;
    }, [isAdmin, profile]);

    const value: AuthContextType = {
        user,
        profile,
        loading,
        isAuthenticated,
        isAdmin,
        logout,
        refreshProfile,
        hasPermission
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
