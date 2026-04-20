"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Mail, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { supabase } from "@shared/lib/supabase";
import { toast } from "sonner";
import { useAuth } from "@features/auth/AuthContext";

export default function AdminLoginPage() {
    const [userId, setUserId] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { user, userProfile, isInitialized } = useAuth();

    // If already an admin, redirect to admin home
    useEffect(() => {
        if (isInitialized && user && userProfile?.is_admin) {
            router.push("/admin");
        }
    }, [isInitialized, user, userProfile, router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId.trim()) return toast.error("아이디 또는 이메일을 입력해주세요.");
        if (!password.trim()) return toast.error("비밀번호를 입력해주세요.");

        setIsLoading(true);
        // ID → Email conversion logic (handles both raw email and bookok.app custom ID)
        const email = userId.includes('@') ? userId.trim() : `${userId.trim().toLowerCase()}@bookok.app`;

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                toast.error(error.message.includes('Invalid login credentials') 
                    ? "계정 정보가 올바르지 않습니다." 
                    : error.message);
                setIsLoading(false);
            } else if (data.user) {
                // Check if the profile is admin
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('is_admin')
                    .eq('id', data.user.id)
                    .single();

                if (profile?.is_admin) {
                    toast.success("관리자 로그인 성공");
                    router.push("/admin");
                } else {
                    toast.error("관리자 권한이 없습니다.");
                    await supabase.auth.signOut();
                    setIsLoading(false);
                }
            }
        } catch (err) {
            toast.error("로그인 중 오류가 발생했습니다.");
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[16px_16px]">
            <div className="w-full max-w-md bg-white rounded-4xl border border-gray-100 shadow-2xl p-10 relative">
                <button 
                    onClick={() => router.push("/")}
                    className="absolute top-8 left-8 text-gray-400 hover:text-gray-900 transition-colors flex items-center gap-2 text-sm font-bold"
                >
                    <ArrowLeft size={16} />
                    메인으로
                </button>

                <div className="flex flex-col items-center text-center mt-6 mb-10">
                    <div className="bg-[#1e2939] p-4 rounded-2xl text-white shadow-xl mb-6">
                        <Shield size={32} />
                    </div>
                    <h1 className="text-3xl font-black text-[#1e2939] mb-3 tracking-tighter">
                        Admin Login
                    </h1>
                    <p className="text-gray-500 font-medium text-sm">
                        북콕 서비스 관리 시스템에 접속합니다.
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-black text-gray-400 ml-1 uppercase tracking-widest">Identify</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                            <input
                                type="text"
                                placeholder="Admin ID or Email"
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-4 focus:ring-[#1e2939]/5 focus:bg-white focus:border-[#1e2939]/10 transition-all font-bold text-sm"
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-black text-gray-400 ml-1 uppercase tracking-widest">Secret</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Password"
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-12 outline-none focus:ring-4 focus:ring-[#1e2939]/5 focus:bg-white focus:border-[#1e2939]/10 transition-all font-bold text-sm"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-[#1e2939] text-white py-5 rounded-2xl font-black text-base shadow-xl shadow-[#1e2939]/20 hover:bg-black transition-all active:scale-[0.98] disabled:opacity-70 mt-6"
                    >
                        {isLoading ? (
                            <div className="flex items-center justify-center gap-3">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>인증 중...</span>
                            </div>
                        ) : (
                            "관리자 로그인"
                        )}
                    </button>
                </form>

                <div className="mt-10 text-center">
                    <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest selection:bg-none">
                        Secure Authentication System v2.0
                    </p>
                </div>
            </div>
        </div>
    );
}
