"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@shared/lib/supabase";
import { Session, User } from "@supabase/supabase-js";
import { Child, Profile } from "@shared/types";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor, PluginListenerHandle } from "@capacitor/core";

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
    syncUser: (session: Session | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children: providerChildren }: { children: React.ReactNode }) {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [userProfile, setUserProfile] = useState<Profile | null>(null);
    const [children, setChildren] = useState<Child[]>([]);
    const [loading, setLoading] = useState(true);
    const [isInitialized, setIsInitialized] = useState(false);
    
    // To prevent redundant fetches and race conditions
    const fetchInProgress = useRef<string | null>(null);
    const inactivityTimer = useRef<NodeJS.Timeout | null>(null);
    const isInitRef = useRef(false);
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

    const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, fallbackValue: T): Promise<T> => {
        return Promise.race([
            promise,
            new Promise<T>((resolve) => setTimeout(() => resolve(fallbackValue), timeoutMs))
        ]);
    };

    const fetchUserProfile = useCallback(async (userId: string, currentUser?: User) => {
        try {
            const fetchTask = async (): Promise<Profile | null> => {
                let data: Profile | null = null;
                let retries = 0;
                const maxRetries = 2;

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
                    
                    retries++;
                    if (retries < maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, 800 * retries));
                    }
                }

                if (data) {
                    setUserProfile(data);
                    return data;
                } else if (currentUser) {
                    const fallback = getProfileFromMetadata(currentUser);
                    setUserProfile(p => p || fallback);

                    const metadata = currentUser.user_metadata || {};
                    const nickname = metadata.name || metadata.nickname || metadata.full_name || currentUser.email?.split('@')[0] || "User";
                    
                    const newProfile: Profile = {
                        id: userId,
                        nickname: nickname,
                        role: (metadata.role as Profile["role"]) || 'user',
                        is_admin: metadata.is_admin || false,
                        phone: metadata.phone || '',
                        created_at: currentUser.created_at || new Date().toISOString()
                    };

                    console.log("Upserting missing profile for user:", userId);
                    const { data: upsertedData } = await supabase
                        .from('profiles')
                        .upsert([newProfile], { onConflict: 'id' })
                        .select()
                        .maybeSingle();

                    return (upsertedData as Profile) || newProfile;
                }
                return null;
            };

            // Hard 4-second timeout to prevent any deadlock or hang
            const fallbackProfile = currentUser ? getProfileFromMetadata(currentUser) : null;
            const profile = await withTimeout(fetchTask(), 4000, fallbackProfile);
            if (profile) setUserProfile(profile);
            return profile;
        } catch (error) {
            console.error("Error fetching user profile:", error);
            const fallback = currentUser ? getProfileFromMetadata(currentUser) : null;
            if (fallback) setUserProfile(fallback);
            return fallback;
        }
    }, []);

    const fetchChildrenData = useCallback(async (userId: string) => {
        try {
            const fetchTask = async (): Promise<Child[]> => {
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
            };

            // Hard 4-second timeout to prevent stalling
            return await withTimeout(fetchTask(), 4000, []);
        } catch (error) {
            console.error("Error fetching children:", error);
            setChildren([]);
            return [];
        }
    }, []);

    const syncUserData = useCallback(async (currentSession: Session | null, force = false) => {
        const userId = currentSession?.user?.id;
        
        // Allow re-entry when forced (e.g., from INITIAL_SESSION or explicit syncUser call)
        if (!force && fetchInProgress.current === userId && userId) {
            console.log("AuthContext: syncUserData already in progress for user:", userId);
            return;
        }
        fetchInProgress.current = userId || null;

        try {
            setSession(currentSession);
            const currentUser = currentSession?.user ?? null;
            setUser(currentUser);

            if (userId && currentUser) {
                // Fetch profile and children in parallel with guaranteed timeout
                const [profile] = await Promise.all([
                    fetchUserProfile(userId, currentUser),
                    fetchChildrenData(userId),
                ]);
                setUserProfile(profile || getProfileFromMetadata(currentUser));
            } else {
                setUserProfile(null);
                setChildren([]);
            }
        } catch (err) {
            console.error("Error syncing user data:", err);
            if (currentSession?.user) {
                setUser(currentSession.user);
                setUserProfile(getProfileFromMetadata(currentSession.user));
            }
        } finally {
            setLoading(false);
            setIsInitialized(true);
            isInitRef.current = true;
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

        // 2. Clear all possible storage keys and cookies immediately
        if (typeof window !== 'undefined') {
            // LocalStorage/SessionStorage
            const keysToRemove = [
                'bookok-auth-token',
                'supabase.auth.token',
            ];
            
            try {
                // Collect any dynamic Supabase client keys matching sb-*-auth-token or related keywords
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && (key.startsWith('sb-') || key.includes('auth-token') || key.includes('supabase'))) {
                        keysToRemove.push(key);
                    }
                }
                for (let i = 0; i < sessionStorage.length; i++) {
                    const key = sessionStorage.key(i);
                    if (key && (key.startsWith('sb-') || key.includes('auth-token') || key.includes('supabase'))) {
                        keysToRemove.push(key);
                    }
                }
            } catch (storageErr) {
                console.warn("Storage scanning warning:", storageErr);
            }
            
            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
                sessionStorage.removeItem(key);
            });

            // Clear native Capacitor Preferences if on native platform
            if (Capacitor.isNativePlatform()) {
                try {
                    const { Preferences } = await import('@capacitor/preferences');
                    await Preferences.clear();
                } catch (prefErr) {
                    console.warn("Preferences clear error:", prefErr);
                }
            }

            // Cookies: SSR using @supabase/ssr often relies on cookies.
            // We clear them explicitly to prevent the middleware or server components 
            // from restoring the session.
            document.cookie.split(';').forEach(cookie => {
                const name = cookie.split('=')[0].trim();
                if (name.includes('auth-token') || name.includes('supabase')) {
                    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                }
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
        // Failsafe: force initialization after 4.5s to prevent any infinite loading skeleton
        const failsafeTimer = setTimeout(() => {
            if (isMounted && !isInitRef.current) {
                console.warn("AuthContext: Failsafe timer fired. Forcing initialization.");
                setLoading(false);
                setIsInitialized(true);
                isInitRef.current = true;
            }
        }, 4500);

        let isMounted = true;

        const initSession = async () => {
            try {
                let initialSession = null;
                const maxRetries = Capacitor.isNativePlatform() ? 3 : 1;
                
                for (let i = 0; i < maxRetries; i++) {
                    const { data } = await supabase.auth.getSession();
                    initialSession = data.session;
                    if (initialSession) break;
                    
                    // Native: CapacitorStorage(Preferences) may not have loaded the token yet
                    if (i < maxRetries - 1) {
                        console.log(`AuthContext: Session null on attempt ${i + 1}, retrying in ${300 * (i + 1)}ms...`);
                        await new Promise(r => setTimeout(r, 300 * (i + 1)));
                    }
                }
                
                if (isMounted) {
                    await syncUserData(initialSession);
                    // Clean up sensitive OAuth access_token hash from address bar if present
                    if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
                        window.history.replaceState(null, '', window.location.pathname + window.location.search);
                    }
                }
            } catch (err) {
                console.error("Initial session fetch error:", err);
                if (isMounted) {
                    setLoading(false);
                    setIsInitialized(true);
                    isInitRef.current = true;
                }
            }
        };

        // Initial session check
        if (typeof window !== 'undefined') {
            const sessionActive = sessionStorage.getItem('bookok_session_active');
            const keepLoggedIn = localStorage.getItem('bookok_keep_logged_in');
            
            // On native mobile apps, users expect persistent login.
            // Force sign-out on cold start if keepLoggedIn === 'false' should ONLY apply to web browsers.
            const isNative = Capacitor.isNativePlatform();
            if (!isNative && !sessionActive && keepLoggedIn === 'false') {
                console.log("AuthContext: Session ended (keepLoggedIn is false on Web). Force sign out.");
                
                // Clean all auth storage keys immediately
                const keysToRemove = ['bookok-auth-token', 'supabase.auth.token'];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && (key.startsWith('sb-') || key.includes('auth-token') || key.includes('supabase'))) {
                        keysToRemove.push(key);
                    }
                }
                keysToRemove.forEach(k => localStorage.removeItem(k));
                
                // Clean cookies
                document.cookie.split(';').forEach(cookie => {
                    const name = cookie.split('=')[0].trim();
                    if (name.includes('auth-token') || name.includes('supabase')) {
                        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                    }
                });

                // Call signOut server API silently in the background
                supabase.auth.signOut().catch(e => console.warn(e));

                setLoading(false);
                setIsInitialized(true);
                isInitRef.current = true;
                sessionStorage.setItem('bookok_session_active', 'true');
            } else {
                sessionStorage.setItem('bookok_session_active', 'true');
                initSession();
            }
        } else {
            initSession();
        }

        // Listen for auth changes
        // Decouple using setTimeout(..., 0) to avoid Supabase Auth lock deadlocks
        const { data: authListener } = supabase.auth.onAuthStateChange((event, currentSession) => {
            console.log("Auth event received:", event);

            // Skip INITIAL_SESSION because initSession() already handles it
            if (event === 'INITIAL_SESSION') {
                return;
            }

            setTimeout(async () => {
                if (!isMounted) return;

                if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
                    // Use force=true to ensure data is re-fetched after login
                    await syncUserData(currentSession, true);
                    router.refresh();
                } else if (event === 'SIGNED_OUT') {
                    await syncUserData(null, true);
                    router.refresh();
                }
            }, 0);
        });

        // Listen for deep link events & App State changes on native platform
        let deepLinkSub: Promise<PluginListenerHandle> | null = null;
        let appStateSub: Promise<PluginListenerHandle> | null = null;

        if (Capacitor.isNativePlatform()) {
            const handleDeepLink = async (event: { url: string }) => {
                console.log("App opened with URL:", event.url);
                if (event.url.includes('auth-callback') || event.url.includes('code=')) {
                    // Close the In-App browser
                    Browser.close().catch(() => {});

                    setLoading(true);
                    try {
                        // 1. Check for PKCE Authorization Code (?code=...)
                        if (event.url.includes('code=')) {
                            try {
                                const urlObj = new URL(event.url.replace('#', '?'));
                                const code = urlObj.searchParams.get('code');
                                if (code) {
                                    console.log("Exchanging PKCE code for session:", code);
                                    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
                                    if (!error && data.session) {
                                        console.log("PKCE Session exchange successful!");
                                        await supabase.auth.setSession({
                                            access_token: data.session.access_token,
                                            refresh_token: data.session.refresh_token,
                                        });
                                        setTimeout(async () => {
                                            if (isMounted) {
                                                await syncUserData(data.session, true);
                                                router.refresh();
                                            }
                                        }, 0);
                                    } else {
                                        console.error("PKCE Session exchange error:", error);
                                    }
                                    return;
                                }
                            } catch (e) {
                                console.error("Failed to parse code URL:", e);
                            }
                        }

                        // 2. Check for hash parameters (#access_token=...)
                        const hash = event.url.split('#')[1];
                        if (hash) {
                            try {
                                const params = new URLSearchParams(hash);
                                const accessToken = params.get('access_token');
                                const refreshToken = params.get('refresh_token');

                                if (accessToken && refreshToken) {
                                    const { data, error } = await supabase.auth.setSession({
                                        access_token: accessToken,
                                        refresh_token: refreshToken
                                    });
                                    if (!error && data.session) {
                                        setTimeout(async () => {
                                            if (isMounted) {
                                                await syncUserData(data.session, true);
                                                router.refresh();
                                            }
                                        }, 0);
                                    } else {
                                        console.error("Failed to set session from deep link:", error);
                                    }
                                }
                            } catch (e) {
                                console.error("Failed to parse hash URL:", e);
                            }
                        }
                    } finally {
                        setLoading(false);
                        setIsInitialized(true);
                        isInitRef.current = true;
                    }
                }
            };

            deepLinkSub = App.addListener('appUrlOpen', handleDeepLink);

            // 3. Handle App Resume (Background to Foreground) to refresh expired tokens safely
            const handleAppStateChange = (state: { isActive: boolean }) => {
                if (state.isActive) {
                    console.log("Capacitor App resumed (isActive: true), verifying session...");
                    setTimeout(async () => {
                        if (!isMounted) return;
                        try {
                            const { data: { session: currentSession } } = await supabase.auth.getSession();
                            if (currentSession) {
                                await syncUserData(currentSession, false);
                            }
                        } catch (resumeErr) {
                            console.warn("Failed to sync session on app resume:", resumeErr);
                        }
                    }, 150);
                }
            };

            appStateSub = App.addListener('appStateChange', handleAppStateChange);

            // 4. Check for initial launch URL if the app was completely closed/cold-started via deep link
            App.getLaunchUrl().then(async (launchUrlObj) => {
                if (launchUrlObj?.url) {
                    console.log("App cold-launched with URL:", launchUrlObj.url);
                    await handleDeepLink({ url: launchUrlObj.url });
                }
            }).catch(err => {
                console.error("Failed to check launch URL:", err);
            });
        }

        return () => {
            isMounted = false;
            clearTimeout(failsafeTimer);
            authListener.subscription.unsubscribe();
            if (deepLinkSub) {
                deepLinkSub.then((s) => s.remove());
            }
            if (appStateSub) {
                appStateSub.then((s) => s.remove());
            }
        };
    }, [syncUserData, router]);


    const refreshProfile = async () => {
        if (user) await fetchUserProfile(user.id);
    };

    const refreshChildren = async () => {
        if (user) await fetchChildrenData(user.id);
    };

    const syncUser = useCallback(async (currentSession: Session | null) => {
        setLoading(true);
        await syncUserData(currentSession, true);
    }, [syncUserData]);

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
            refreshChildren,
            syncUser
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
