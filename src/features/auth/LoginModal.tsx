"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { X, BookMarked, Mail, Lock, Shield, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { supabase } from "@shared/lib/supabase";
import { toast } from "sonner";
import { useNativeBridge } from "@shared/lib/native-bridge";
import { useAuth } from "@features/auth/AuthContext";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { SignInWithApple } from '@capacitor-community/apple-sign-in';
import { SocialLogin } from '@capgo/capacitor-social-login';

function getUrlSafeNonce(): string {
    if (typeof window === 'undefined' || !window.crypto) {
        return Math.random().toString(36).substring(2, 15);
    }
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256Hash(message: string): Promise<string> {
    if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
        return message;
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
    const [isEmailMode, setIsEmailMode] = useState(false);
    const [userId, setUserId] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [keepLoggedIn, setKeepLoggedIn] = useState(true);
    const [tapCount, setTapCount] = useState(0);
    const { vibrate } = useNativeBridge();
    const { syncUser } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
            // Reset states when modal closes
            setIsEmailMode(false);
            setUserId("");
            setPassword("");
            setIsLoading(false);
            setTapCount(0);
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    const handleLogoTap = () => {
        setTapCount(prev => {
            const newCount = prev + 1;
            if (newCount >= 5) {
                vibrate();
                setIsEmailMode(true);
                return 0;
            }
            return newCount;
        });
    };

    const handleOAuthLogin = async (provider: 'google' | 'kakao' | 'apple') => {
        try {
            vibrate();
            if (typeof window !== 'undefined') {
                localStorage.setItem('bookok_keep_logged_in', keepLoggedIn ? 'true' : 'false');
                sessionStorage.setItem('bookok_session_active', 'true');
            }
            
            const isNative = Capacitor.isNativePlatform();

            if (provider === 'kakao') {
                const currentPath = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/';
                const callbackUrl = isNative
                    ? 'https://bookok.kr/auth/callback?native=true'
                    : `${window.location.origin}/auth/callback?next=${encodeURIComponent(currentPath)}`;

                const { data, error } = await supabase.auth.signInWithOAuth({
                    provider: 'kakao',
                    options: {
                        redirectTo: callbackUrl,
                        skipBrowserRedirect: isNative,
                        queryParams: {
                            prompt: 'login',
                        },
                    },
                });
                if (error) throw error;

                if (isNative && data?.url) {
                    await Browser.open({ url: data.url });
                }
                return;
            }

            if (provider === 'apple' && isNative) {
                try {
                    const platform = Capacitor.getPlatform();
                    const rawNonce = getUrlSafeNonce();
                    const nonceDigest = await sha256Hash(rawNonce);

                    console.log('[Apple Login] Platform:', platform);
                    console.log('[Apple Login] rawNonce length:', rawNonce.length);
                    console.log('[Apple Login] nonceDigest length:', nonceDigest.length);

                    const appleOptions = {
                        clientId: platform === 'ios' ? 'com.bookok.kr' : 'com.bookok.kr.app',
                        redirectURI: 'https://holaqlorkluptvrcfwtu.supabase.co/auth/v1/callback',
                        scopes: 'email name',
                        nonce: nonceDigest,
                    };
                    console.log('[Apple Login] Options:', JSON.stringify(appleOptions));

                    const result = await SignInWithApple.authorize(appleOptions);
                    console.log('[Apple Login] Result received:', !!result.response, 'hasToken:', !!result.response?.identityToken);

                    if (result.response && result.response.identityToken) {
                        const { data, error } = await supabase.auth.signInWithIdToken({
                            provider: 'apple',
                            token: result.response.identityToken,
                            nonce: rawNonce,
                        });
                        
                        if (error) {
                            console.error('[Apple Login] Supabase signInWithIdToken error:', error.message, error);
                            throw error;
                        }
                        
                        if (data.session) {
                            console.log('[Apple Login] Session obtained, syncing user...');
                            await syncUser(data.session);
                            toast.success("로그인되었습니다.");
                            onClose();
                            router.refresh();
                        }
                        return;
                    } else {
                        console.error('[Apple Login] No identityToken in response:', JSON.stringify(result));
                        toast.error('Apple 로그인 응답에 토큰이 없습니다.');
                        return;
                    }
                } catch (err: any) {
                    console.error('[Apple Login] Native error:', err?.message || err, JSON.stringify(err));
                    // User cancelled (error code 1001) - don't show error toast
                    if (err?.message?.includes('1001') || err?.code === 1001) {
                        console.log('[Apple Login] User cancelled');
                        return;
                    }
                    toast.error('Apple 로그인에 실패했습니다: ' + (err?.message || '알 수 없는 오류'));
                    return;
                }
            }
            
            if (provider === 'google' && isNative) {
                try {
                    console.log('[Google Login] Initializing Capgo Social Login...');
                    await SocialLogin.initialize({
                        google: {
                            webClientId: '54141143854-1nahh5nueb5njrlvd748dkbm0a34sks9.apps.googleusercontent.com',
                            iOSClientId: '54141143854-7mclde4lk4u46g1sbqlqnin8jt5ibjv1.apps.googleusercontent.com',
                            iOSServerClientId: '54141143854-1nahh5nueb5njrlvd748dkbm0a34sks9.apps.googleusercontent.com',
                        },
                    });

                    const res = await SocialLogin.login({
                        provider: 'google',
                        options: {
                            scopes: ['email', 'profile'],
                        },
                    });

                    const idToken = (res.result as any)?.idToken || (res.result as any)?.token;
                    const rawNonce = (res.result as any)?.nonce || (res.result as any)?.rawNonce;
                    const accessToken = (res.result as any)?.accessToken;
                    console.log('[Google Login] Native sign in success, hasToken:', !!idToken, 'hasNonce:', !!rawNonce);

                    if (idToken) {
                        const signInOptions: any = {
                            provider: 'google',
                            token: idToken,
                        };
                        if (accessToken) signInOptions.access_token = accessToken;
                        if (rawNonce) signInOptions.nonce = rawNonce;

                        const { data, error } = await supabase.auth.signInWithIdToken(signInOptions);

                        if (error) {
                            console.error('[Google Login] Supabase signInWithIdToken error:', error.message, error);
                            throw error;
                        }

                        if (data.session) {
                            console.log('[Google Login] Session obtained, syncing user...');
                            await syncUser(data.session);
                            toast.success("로그인되었습니다.");
                            onClose();
                            router.refresh();
                        }
                        return;
                    } else {
                        console.error('[Google Login] No idToken in response');
                        toast.error('Google 로그인 응답에 토큰이 없습니다.');
                        return;
                    }
                } catch (err: any) {
                    console.error('[Google Login] Native error:', err?.message || err, JSON.stringify(err));
                    const errStr = String(err?.message || err);
                    if (errStr.includes('cancelled') || errStr.includes('1001') || errStr.includes('CANCELED')) {
                        console.log('[Google Login] User cancelled');
                        return;
                    }
                    toast.error('Google 로그인 실패: ' + (err?.message || errStr));
                    return;
                }
            }

            const currentPath = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/';
            const callbackUrl = isNative
                ? 'https://bookok.kr/auth/callback?native=true'
                : `${window.location.origin}/auth/callback?next=${encodeURIComponent(currentPath)}`;
            
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: callbackUrl,
                    skipBrowserRedirect: isNative,
                    queryParams: {
                        prompt: 'select_account',
                    },
                },
            });
            if (error) throw error;

            if (isNative && data?.url) {
                await Browser.open({ url: data.url });
            }
        } catch (error) {
            console.error(`${provider} login error:`, error);
        }
    };

    const handleEmailLogin = async () => {
        if (!userId.trim()) return toast.error("아이디 또는 이메일을 입력해주세요.");
        if (!password.trim()) return toast.error("비밀번호를 입력해주세요.");

        setIsLoading(true);
        // ID → Email conversion logic mirroring AuthPage
        const email = userId.includes('@') ? userId.trim() : `${userId.trim().toLowerCase()}@bookok.app`;

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                toast.error(error.message.includes('Invalid login credentials') 
                    ? "아이디 또는 비밀번호가 올바르지 않습니다." 
                    : error.message);
                setIsLoading(false);
            } else if (data.session) {
                if (typeof window !== 'undefined') {
                    localStorage.setItem('bookok_keep_logged_in', keepLoggedIn ? 'true' : 'false');
                    sessionStorage.setItem('bookok_session_active', 'true');
                }
                
                // Sync user state immediately to trigger global re-rendering
                await syncUser(data.session);
                
                toast.success("로그인되었습니다.");
                onClose();
                
                // Use router.refresh() instead of window.location.reload() to prevent race conditions
                router.refresh();
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "알 수 없는 오류";
            console.error("Login error:", errorMessage);
            toast.error("로그인 중 오류가 발생했습니다.");
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-4xl w-full max-w-sm p-8 shadow-2xl relative transform transition-all animate-in zoom-in-95 duration-300">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 text-gray-400 hover:text-gray-900 transition-colors"
                >
                    <X size={24} />
                </button>

                {/* Admin Mode Toggle Link at Top-Left */}
                {!isEmailMode && (
                    <button
                        onClick={() => setIsEmailMode(true)}
                        className="absolute top-5 left-5 text-[11px] font-black text-gray-300 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-lg px-2.5 py-1 transition-all select-none"
                    >
                        관리자
                    </button>
                )}

                {/* Back Button for Email Mode */}
                {isEmailMode && (
                    <button
                        onClick={() => setIsEmailMode(false)}
                        className="absolute top-5 left-5 text-gray-400 hover:text-gray-900 transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                )}

                {/* Header Section */}
                <div className="flex flex-col items-center text-center mt-4 mb-5">
                    {/* Brand Logo Container replacing Lucide Icon */}
                    <div 
                        onClick={handleLogoTap}
                        className="relative w-14 h-14 bg-white border border-gray-100 rounded-2xl p-2.5 flex items-center justify-center shadow-md mb-4 cursor-pointer active:scale-95 transition-transform select-none"
                    >
                        <div className="relative w-full h-full pointer-events-none">
                            <Image
                                src="/images/logo_transparent_v2.png"
                                alt="Book,ok Logo"
                                fill
                                className="object-contain"
                                sizes="56px"
                            />
                        </div>
                    </div>
                    <h2 className="text-2xl font-black text-[#1e2939] mb-2 tracking-tight">
                        {isEmailMode ? "이메일 로그인" : "로그인/회원가입"}
                    </h2>
                    <p className="text-[#1e2939]/70 text-sm font-medium leading-relaxed break-keep">
                        북콕(Book,ok)에서 아이들의<br />지속가능한 독서를 형성해보세요.
                    </p>
                </div>

                {/* Keep Logged In Checkbox Option */}
                <div className="flex items-center justify-center gap-2 mb-6">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors">
                        <input
                            type="checkbox"
                            checked={keepLoggedIn}
                            onChange={(e) => setKeepLoggedIn(e.target.checked)}
                            className="w-4.5 h-4.5 rounded border-gray-300 text-[#16A34A] focus:ring-[#16A34A]/25 cursor-pointer accent-[#16A34A]"
                        />
                        로그인 상태 유지하기
                    </label>
                </div>

                {!isEmailMode ? (
                    <>
                        {/* Social Login Buttons */}
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => handleOAuthLogin('google')}
                                className="flex items-center w-full bg-white border border-gray-300 rounded-xl p-3 hover:bg-gray-50 active:scale-[0.99] transition-all shadow-sm relative group"
                            >
                                <div className="absolute left-4">
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                </div>
                                <span className="flex-1 text-[#1e2939] font-bold text-[15px]">구글 계정으로 계속하기</span>
                            </button>

                            <button
                                onClick={() => handleOAuthLogin('kakao')}
                                className="flex items-center w-full bg-[#FEE500] rounded-xl p-3 hover:bg-[#FADA00] active:scale-[0.99] transition-all shadow-sm relative group"
                            >
                                <div className="absolute left-4">
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#000000">
                                        <path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.557 1.707 4.8 4.27 6.054-.188.702-.682 2.545-.78 2.94-.122.49.178.483.376.352.155-.102 2.469-1.68 3.473-2.364.534.078 1.087.118 1.661.118 4.97 0 9-3.185 9-7.115S16.97 3 12 3z" />
                                    </svg>
                                </div>
                                <span className="flex-1 text-[#191919] font-bold text-[15px]">카카오 계정으로 계속하기</span>
                            </button>

                            <button
                                onClick={() => handleOAuthLogin('apple')}
                                className="flex items-center w-full bg-black rounded-xl p-3 hover:bg-black/90 active:scale-[0.99] transition-all shadow-sm relative group"
                            >
                                <div className="absolute left-4">
                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M17.05 20.28c-.96.95-2.12 1.72-3.48 1.72-1.33 0-1.85-.83-3.47-.83-1.64 0-2.22.81-3.46.83-1.34.02-2.61-.85-3.6-2.16C1.02 17.26.11 13.91.95 10.7c.41-1.57 1.39-2.88 2.76-3.71 1.1-.67 2.37-1.07 3.59-1.07.82 0 1.9.3 2.6.59.5.21 1.05.44 1.54.44.43 0 .93-.2 1.4-.41.87-.39 2.06-.82 3.19-.82 1.48 0 2.87.5 3.86 1.44-.06.05-2.65 1.53-2.62 4.67.03 3.73 3.09 4.97 3.12 4.98-.02.05-.49 1.67-1.35 2.53zM13.2 2.76c.72-.88 1.2-2.11 1.07-3.32-1.04.04-2.3.69-3.04 1.56-.67.76-1.25 1.98-1.12 3.17 1.15.09 2.33-.53 3.09-1.41z" />
                                    </svg>
                                </div>
                                <span className="flex-1 text-white font-bold text-[15px]">Apple로 계속하기</span>
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                        <div className="space-y-4">
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="아이디 또는 이메일"
                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3.5 pl-12 pr-4 outline-none focus:ring-2 focus:ring-[#1e2939]/5 font-bold text-sm"
                                    value={userId}
                                    onChange={(e) => setUserId(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleEmailLogin()}
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="비밀번호"
                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3.5 pl-12 pr-12 outline-none focus:ring-2 focus:ring-[#1e2939]/5 font-bold text-sm"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleEmailLogin()}
                                    disabled={isLoading}
                                />
                                <button
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={handleEmailLogin}
                            disabled={isLoading}
                            className="w-full bg-[#1e2939] text-white py-4 rounded-xl font-black text-[15px] shadow-lg shadow-[#1e2939]/10 hover:bg-black transition-all active:scale-95 disabled:opacity-70 mt-2"
                        >
                            {isLoading ? "로그인 중..." : "로그인하기"}
                        </button>

                        <button
                            onClick={() => setIsEmailMode(false)}
                            className="w-full text-xs font-bold text-gray-400 py-2 hover:text-gray-600 transition-colors"
                        >
                            소셜 로그인으로 돌아가기
                        </button>
                    </div>
                )}
                
                <p className="text-center text-[10px] text-gray-400 font-medium mt-6 leading-relaxed">
                    진행하시면 북콕(Book,ok)의<br />
                    <Link href="/terms" onClick={onClose} className="underline underline-offset-2 hover:text-gray-600 transition-colors">이용약관</Link> 및 <Link href="/privacy" onClick={onClose} className="underline underline-offset-2 hover:text-gray-600 transition-colors">개인정보처리방침</Link>에 동의하게 됩니다.
                </p>
            </div>
        </div>
    );
}
