"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@shared/lib/supabase";
import { Session, User } from "@supabase/supabase-js";
import { Child, Profile } from "@shared/types";

interface AuthContextType {
    user: User | null;
    session: Session | null;
    userProfile: Profile | null;
    children: Child[];
    loading: boolean;
    isInitialized: boolean;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    refreshChildren: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children: providerChildren }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [userProfile, setUserProfile] = useState<Profile | null>(null);
    const [children, setChildren] = useState<Child[]>([]);
    const [loading, setLoading] = useState(true);
    const [isInitialized, setIsInitialized] = useState(false);
    
    // To prevent redundant fetches and race conditions
    const fetchInProgress = useRef<string | null>(null);
    const inactivityTimer = useRef<NodeJS.Timeout | null>(null);
    const INACTIVITY_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

    const getProfileFromMetadata = (user: User): Profile => {
        const metadata = user.user_metadata || {};
        const nickname = metadata.name || metadata.nickname || metadata.full_name || user.email?.split('@')[0] || "User";
        return {
            id: user.id,
            nickname: nickname,
            role: (metadata.role as Profile["role"]) || 'user',
            is_admin: metadata.is_admin || false,
            phone: metadata.phone || '',
            created_at: user.created_at || new Date().toISOString()
        };
    };

    const fetchUserProfile = useCallback(async (userId: string, currentUser?: User) => {
        try {
            // Retry logic for profile fetching (needed after new signup for trigger latency)
            let data = null;
            let retries = 0;
            const maxRetries = 3;

            while (retries < maxRetries) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .maybeSingle();
                
                if (profile) {
                    data = profile;
                    break;
                }
                
                // If not found, wait a bit and retry
                retries++;
                if (retries < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * retries));
                }
            }

            if (data) {
                setUserProfile(data);
                return data;
            } else if (currentUser) {
                // Initial fallback from metadata while waiting/retrying
                const fallback = getProfileFromMetadata(currentUser);
                setUserProfile(p => p || fallback);

                // We attempt to UPSERT a new profile so that foreign key constraints don't fail
                const metadata = currentUser.user_metadata || {};
                const nickname = metadata.name || metadata.nickname || metadata.full_name || currentUser.email?.split('@')[0] || "User";
                
                const newProfile = {
                    id: userId,
                    nickname: nickname,
                    role: metadata.role || 'user',
                    is_admin: metadata.is_admin || false,
                    phone: metadata.phone || '',
                };

                console.log("Upserting missing profile for user:", userId);
                const { data: upsertedData, error: upsertError } = await supabase
                    .from('profiles')
                    .upsert([newProfile], { onConflict: 'id' })
                    .select()
                    .maybeSingle();

                if (upsertError) {
                    console.error('Profile upsert error:', upsertError);
                    return newProfile;
                }
                return upsertedData || newProfile;
            }
            
            return null;
        } catch (error) {
            console.error("Error fetching user profile:", error);
            return null;
        }
    }, []);

    const fetchChildrenData = useCallback(async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('children')
                .select('*, birthdate')
                .eq('parent_id', userId);
            
            if (error) throw error;
            
            if (data) {
                const childrenWithAge = data.map((child: Child) => {
                    const birthYear = child.birthdate ? new Date(child.birthdate).getFullYear() : 0;
                    const currentYear = new Date().getFullYear();
                    const age = birthYear > 0 ? currentYear - birthYear : 0;
                    return { ...child, age };
                });
                setChildren(childrenWithAge);
                return childrenWithAge;
            }
            setChildren([]);
            return [];
        } catch (error) {
            console.error("Error fetching children:", error);
            setChildren([]);
            return [];
        }
    }, []);

    const syncUserData = useCallback(async (currentSession: Session | null) => {
        const userId = currentSession?.user?.id;
        
        if (fetchInProgress.current === userId && userId) {
            setLoading(false);
            return;
        }
        fetchInProgress.current = userId || null;

        try {
            setSession(currentSession);
            const currentUser = currentSession?.user ?? null;
            setUser(currentUser);

            if (userId && currentUser) {
                // 세션이 확인되면 즉시 초기화 완료 상태로 변경하여 UI를 표시
                setLoading(false);
                setIsInitialized(true);
                
                // 프로필과 자녀 데이터는 백그라운드에서 동기화
                const profile = await fetchUserProfile(userId, currentUser);
                setUserProfile(profile);
                await fetchChildrenData(userId);
            } else {
                setUserProfile(null);
                setChildren([]);
                setLoading(false);
                setIsInitialized(true);
            }
        } catch (err) {
            console.error("Error syncing user data:", err);
            if (currentSession?.user) setUser(currentSession.user);
            setLoading(false);
            setIsInitialized(true);
        } finally {
            fetchInProgress.current = null;
        }
    }, [fetchUserProfile, fetchChildrenData]);

    const signOut = useCallback(async () => {
        // Clear timer if any
        if (inactivityTimer.current) {
            clearTimeout(inactivityTimer.current);
            inactivityTimer.current = null;
        }

        // 1. Clear local UI state immediately for responsive feel
        setUser(null);
        setSession(null);
        setUserProfile(null);
        setChildren([]);
        setLoading(false);
        setIsInitialized(true);

        // 2. Clear all possible storage keys immediately
        if (typeof window !== 'undefined') {
            const keysToRemove = [
                'bookok-auth-token',
                'supabase.auth.token',
                'sb-holaqlorkluptvrcfwtu-auth-token', // Specific project ref key just in case
            ];
            
            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
                sessionStorage.removeItem(key);
            });
        }

        try {
            // 3. Attempt server-side sign out (with timeout to prevent hanging)
            const signOutPromise = supabase.auth.signOut();
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error("SignOut timeout")), 3000)
            );
            
            await Promise.race([signOutPromise, timeoutPromise]);
            console.log("Successfully signed out from Supabase");
        } catch (error) {
            console.warn("Supabase signOut error (handled):", error);
        }
    }, []);

    // Auto Logout Logic
    const resetInactivityTimer = useCallback(() => {
        if (inactivityTimer.current) {
            clearTimeout(inactivityTimer.current);
        }
        
        if (user) {
            inactivityTimer.current = setTimeout(() => {
                console.log("Auto logging out due to inactivity");
                signOut();
            }, INACTIVITY_TIMEOUT);
        }
    }, [user, signOut]);

    useEffect(() => {
        if (user) {
            const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
            
            const handleActivity = () => {
                resetInactivityTimer();
            };

            events.forEach(event => {
                window.addEventListener(event, handleActivity);
            });

            resetInactivityTimer();

            return () => {
                events.forEach(event => {
                    window.removeEventListener(event, handleActivity);
                });
                if (inactivityTimer.current) {
                    clearTimeout(inactivityTimer.current);
                }
            };
        }
    }, [user, resetInactivityTimer]);

    useEffect(() => {
        // Failsafe: force initialization after 5s to prevent infinite loading
        const failsafeTimer = setTimeout(() => {
            setLoading(false);
            setIsInitialized(true);
        }, 5000);

        // Initial session check
        const init = async () => {
            try {
                // Use getUser() for more reliable check on initialization
                const { data: { user: initialUser } } = await supabase.auth.getUser();
                if (initialUser) {
                    const { data: { session: initialSession } } = await supabase.auth.getSession();
                    await syncUserData(initialSession);
                } else {
                    // No user found, finalize initialization
                    setLoading(false);
                    setIsInitialized(true);
                }
            } catch (e) {
                console.error("Initial auth check failed:", e);
                setLoading(false);
                setIsInitialized(true);
            } finally {
                clearTimeout(failsafeTimer);
            }
        };
        
        init();

        // Listen for auth changes
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
            console.log("Auth event:", event);
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
                setLoading(true);
                await syncUserData(currentSession);
            } else if (event === 'SIGNED_OUT') {
                await syncUserData(null);
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [syncUserData]);


    const refreshProfile = async () => {
        if (user) await fetchUserProfile(user.id);
    };

    const refreshChildren = async () => {
        if (user) await fetchChildrenData(user.id);
    };

    return (
        <AuthContext.Provider value={{ 
            user, 
            session, 
            userProfile, 
            children, 
            loading, 
            isInitialized,
            signOut, 
            refreshProfile, 
            refreshChildren 
        }}>
            {providerChildren}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
