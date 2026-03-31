"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { Session, User } from "@supabase/supabase-js";
import { Child, Profile } from "../types";

interface AuthContextType {
    user: User | null;
    session: Session | null;
    userProfile: Profile | null;
    children: Child[];
    loading: boolean;
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
    
    // To prevent redundant fetches and race conditions
    const fetchInProgress = useRef<string | null>(null);

    const fetchUserProfile = useCallback(async (userId: string) => {
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
            } else {
                // Fallback to metadata if available
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user?.user_metadata) {
                    const metadata = session.user.user_metadata;
                    const fallbackProfile: Profile = {
                        id: userId,
                        nickname: metadata.name || metadata.nickname || session.user.email?.split('@')[0] || "User",
                        role: metadata.role || 'parent',
                        is_admin: metadata.is_admin || false,
                        phone: metadata.phone || '',
                        created_at: new Date().toISOString(),
                    };
                    setUserProfile(fallbackProfile);
                    return fallbackProfile;
                }
                setUserProfile(null);
                return null;
            }
        } catch (error) {
            console.error("Error fetching user profile:", error);
            setUserProfile(null);
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
        
        // Skip if same session already being processed
        if (fetchInProgress.current === userId && userId) return;
        fetchInProgress.current = userId || null;

        try {
            setSession(currentSession);
            setUser(currentSession?.user ?? null);

            if (userId) {
                // Fetch essential data in parallel
                await Promise.allSettled([
                    fetchUserProfile(userId),
                    fetchChildrenData(userId)
                ]);
            } else {
                setUserProfile(null);
                setChildren([]);
            }
        } catch (err) {
            console.error("Error syncing user data:", err);
        } finally {
            setLoading(false);
            fetchInProgress.current = null;
        }
    }, [fetchUserProfile, fetchChildrenData]);

    useEffect(() => {
        // Initial session check
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            await syncUserData(session);
        };
        
        init();

        // Listen for auth changes
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
                await syncUserData(session);
            } else if (event === 'SIGNED_OUT') {
                setSession(null);
                setUser(null);
                setUserProfile(null);
                setChildren([]);
                setLoading(false);
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
            setUser(null);
            setSession(null);
            setUserProfile(null);
            setChildren([]);
            if (typeof window !== 'undefined') {
                localStorage.removeItem('bookok-auth-token');
                sessionStorage.clear();
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
