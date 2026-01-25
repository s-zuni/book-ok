"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Session, User } from "@supabase/supabase-js";
import { Child } from "../types";

interface AuthContextType {
    user: User | null;
    session: Session | null;
    userProfile: any | null;
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
    const [userProfile, setUserProfile] = useState<any | null>(null);
    const [children, setChildren] = useState<Child[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                setSession(session);
                setUser(session?.user ?? null);
                if (session?.user) {
                    // Fetch in parallel for performance, with timeout safeguard
                    const fetchData = Promise.allSettled([
                        fetchUserProfile(session.user.id),
                        fetchChildren(session.user.id)
                    ]);

                    const timeout = new Promise((_, reject) => setTimeout(() => reject("Timeout"), 5000));

                    await Promise.race([fetchData, timeout]);
                } else if (session?.user?.user_metadata) {
                    setUserProfile({
                        nickname: session.user.user_metadata.name,
                        ...session.user.user_metadata
                    });
                }
            } catch (error) {
                console.error("Auth initialization error:", error);
            } finally {
                setLoading(false);
            }
        };

        initAuth();

        const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
            try {
                setSession(session);
                setUser(session?.user ?? null);
                if (session?.user) {
                    // Fetch in parallel for performance, with timeout safeguard
                    const fetchData = Promise.allSettled([
                        fetchUserProfile(session.user.id),
                        fetchChildren(session.user.id)
                    ]);

                    const timeout = new Promise((_, reject) => setTimeout(() => reject("Timeout"), 5000));

                    await Promise.race([fetchData, timeout]);
                } else if (session?.user?.user_metadata) {
                    setUserProfile({
                        nickname: session.user.user_metadata.name,
                        ...session.user.user_metadata
                    });
                } else {
                    // Fallback to metadata if profile fetch fails or while loading
                    if (session?.user?.user_metadata) {
                        setUserProfile({
                            nickname: session.user.user_metadata.name,
                            ...session.user.user_metadata
                        });
                    } else {
                        setUserProfile(null);
                    }
                    setChildren([]);
                }
            } catch (error) {
                console.error("Auth state change error:", error);
            } finally {
                setLoading(false);
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const fetchUserProfile = async (userId: string) => {
        const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
        setUserProfile(data);
    };

    const fetchChildren = async (userId: string) => {
        const { data } = await supabase.from('children').select('*, birthdate').eq('parent_id', userId);
        if (data) {
            const childrenWithAge = data.map((child: any) => {
                const birthYear = new Date(child.birthdate).getFullYear();
                const currentYear = new Date().getFullYear();
                const age = currentYear - birthYear;
                return { ...child, age };
            });
            setChildren(childrenWithAge);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const refreshProfile = async () => {
        if (user) {
            await fetchUserProfile(user.id);
        }
    };

    const refreshChildren = async () => {
        if (user) {
            await fetchChildren(user.id);
        }
    };

    return (
        <AuthContext.Provider value={{ user, session, userProfile, children, loading, signOut, refreshProfile, refreshChildren }}>
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
