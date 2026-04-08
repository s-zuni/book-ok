"use client";

import { useEffect, useState } from "react";
import { X, BookMarked, Mail, Lock, Shield, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";

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
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    const handleOAuthLogin = async (provider: 'google' | 'kakao') => {
        try {
            await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: window.location.href, // Redirect back to the same page
                },
            });
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
                toast.success("로그인되었습니다.");
                onClose();
                // Optionally reload or let AuthContext handle state
                window.location.reload();
            }
        } catch (err: any) {
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
                <div className="flex flex-col items-center text-center mt-4 mb-8">
                    <div className="bg-[#1e2939] p-3 rounded-2xl text-white shadow-lg mb-4">
                        <BookMarked size={28} />
                    </div>
                    <h2 className="text-2xl font-black text-[#1e2939] mb-2 tracking-tight">
                        {isEmailMode ? "이메일 로그인" : "로그인/회원가입"}
                    </h2>
                    <p className="text-[#1e2939]/70 text-sm font-medium leading-relaxed break-keep">
                        북콕(Book,ok)에서 아이들의<br />지속가능한 독서를 형성해보세요.
                    </p>
                </div>

                {!isEmailMode ? (
                    <>
                        {/* Social Login Buttons */}
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => handleOAuthLogin('google')}
                                className="flex items-center w-full bg-white border border-gray-300 rounded-xl p-3 hover:bg-gray-50 transition-colors shadow-sm relative group"
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
                                className="flex items-center w-full bg-[#FEE500] rounded-xl p-3 hover:bg-[#FEE500]/90 transition-colors shadow-sm relative group"
                            >
                                <div className="absolute left-4">
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 3C6.477 3 2 6.477 2 10.766c0 2.768 1.83 5.185 4.606 6.475-.152.545-.548 1.944-.606 2.17-.076.297.106.331.258.232.182-.118 2.227-1.467 3.33-2.196.776.104 1.58.153 2.412.153 5.523 0 10-3.477 10-7.766C22 6.477 17.523 3 12 3z" />
                                    </svg>
                                </div>
                                <span className="flex-1 text-black/85 font-bold text-[15px]">카카오 계정으로 계속하기</span>
                            </button>
                        </div>

                        <div className="mt-10 pt-6 border-t border-gray-100 text-center">
                            <button
                                onClick={() => setIsEmailMode(true)}
                                className="text-xs font-bold text-gray-400 hover:text-[#1e2939] transition-colors flex items-center justify-center gap-1.5 mx-auto group"
                            >
                                <Shield size={14} className="text-gray-300 group-hover:text-green-600 transition-colors" />
                                <span>관리자 로그인 (이메일)</span>
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
                    <span className="underline underline-offset-2">이용약관</span> 및 <span className="underline underline-offset-2">개인정보처리방침</span>에 동의하게 됩니다.
                </p>
            </div>
        </div>
    );
}
