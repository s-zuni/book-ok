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

    const getProfileFromMetadata = (user: User): Profile => {
        const metadata = user.user_metadata || {};
        const nickname = metadata.name || metadata.nickname || metadata.full_name || user.email?.split('@')[0] || "User";
        return {
            id: user.id,
            nickname: nickname,
            role: (metadata.role as any) || 'parent',
            is_admin: metadata.is_admin || false,
            phone: metadata.phone || '',
            created_at: user.created_at || new Date().toISOString()
        };
    };

    const fetchUserProfile = useCallback(async (userId: string, currentUser?: User) => {
        try {
            // Retry logic for profile fetching (needed after new signup for trigger latency)
            let data = null;
            let error = null;
            let retries = 0;
            const maxRetries = 3;

            while (retries < maxRetries) {
                const { data: profile, error: fetchError } = await supabase
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
                    role: metadata.role || 'parent',
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
                const childrenWithAge = data.map((child: any) => {
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
                setSession(null);
                setUser(null);
                setUserProfile(null);
                setChildren([]);
                setLoading(false);
                setIsInitialized(true);
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [syncUserData]);

    const signOut = async () => {
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error("Error during signOut:", error);
        } finally {
            // Force clear all states regardless of Supabase response
            setUser(null);
            setSession(null);
            setUserProfile(null);
            setChildren([]);
            if (typeof window !== 'undefined') {
                localStorage.removeItem('bookok-auth-token');
                // Remove specific keys instead of clear() to avoid breaking Next.js hydration state
                localStorage.removeItem('supabase.auth.token'); 
                sessionStorage.removeItem('bookok-auth-token');
            }
        }
    };

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
