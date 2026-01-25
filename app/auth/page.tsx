"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import { BookMarked, ArrowLeft } from "lucide-react";

export default function AuthPage() {
    const router = useRouter();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nickname, setNickname] = useState('');
    const [phone, setPhone] = useState('');
    const [authError, setAuthError] = useState('');

    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        setAuthError('');
        setIsLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            setAuthError(error.message);
            setIsLoading(false);
        } else {
            // Use router.push + refresh for smoother Next.js navigation while ensuring auth state flows
            router.refresh();
            router.push('/');
        }
    };

    const handleSignUp = async () => {
        setAuthError('');
        if (!nickname || !phone) {
            setAuthError('이름과 핸드폰 번호를 모두 입력해주세요.');
            return;
        }

        setIsLoading(true);
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name: nickname,
                    phone: phone,
                    role: 'user'
                }
            }
        });

        if (error) {
            setAuthError(error.message);
            setIsLoading(false);
        } else {
            if (data.user) {
                await supabase.from('profiles').insert({
                    id: data.user.id,
                    nickname,
                    phone,
                    role: 'user'
                });
                alert('회원가입이 완료되었습니다!');
                setIsLoading(false);
                setIsLogin(true);
            }
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
            <div className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-xl shadow-gray-200/50 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-green-400 to-green-600"></div>

                <button onClick={() => router.back()} className="absolute top-8 left-8 text-gray-400 hover:text-gray-900 transition-colors">
                    <ArrowLeft size={24} />
                </button>

                <div className="text-center mb-10 mt-6">
                    <div className="bg-green-600 w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-green-200 mx-auto mb-6 transform rotate-3">
                        <BookMarked size={32} />
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                        {isLogin ? '환영합니다!' : '회원가입'}
                    </h2>
                    <p className="text-gray-500 font-medium">
                        {isLogin ? '북콕 서비스 이용을 위해 로그인해주세요.' : '아이와 함께하는 즐거운 독서 여정을 시작하세요.'}
                    </p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">이메일</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-gray-50 rounded-xl px-5 py-4 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-green-200 transition-all border border-transparent focus:border-green-500"
                            placeholder="example@email.com"
                            onKeyDown={(e) => e.key === 'Enter' && (isLogin ? handleLogin() : handleSignUp())}
                            disabled={isLoading}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">비밀번호</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-gray-50 rounded-xl px-5 py-4 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-green-200 transition-all border border-transparent focus:border-green-500"
                            placeholder="••••••••"
                            onKeyDown={(e) => e.key === 'Enter' && (isLogin ? handleLogin() : handleSignUp())}
                            disabled={isLoading}
                        />
                    </div>

                    {!isLogin && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">이름 (닉네임)</label>
                                    <input
                                        type="text"
                                        value={nickname}
                                        onChange={(e) => setNickname(e.target.value)}
                                        className="w-full bg-gray-50 rounded-xl px-5 py-4 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-green-200 transition-all border border-transparent focus:border-green-500"
                                        placeholder="홍길동"
                                        disabled={isLoading}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">전화번호</label>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="w-full bg-gray-50 rounded-xl px-5 py-4 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-green-200 transition-all border border-transparent focus:border-green-500"
                                        placeholder="010-0000-0000"
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {authError && <p className="text-red-500 text-sm font-bold text-center py-2 bg-red-50 rounded-lg animate-in fade-in slide-in-from-top-1">{authError}</p>}

                    <button
                        onClick={isLogin ? handleLogin : handleSignUp}
                        disabled={isLoading}
                        className="w-full bg-gray-900 text-white font-black py-4 rounded-xl shadow-lg hover:bg-black hover:scale-[1.02] transform transition-all active:scale-95 mt-4 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            isLogin ? '로그인하기' : '가입하기'
                        )}
                    </button>

                    <div className="flex items-center justify-center gap-2 mt-6">
                        <span className="text-gray-400 font-medium text-sm">{isLogin ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}</span>
                        <button onClick={() => setIsLogin(!isLogin)} className="text-green-600 font-black text-sm hover:underline" disabled={isLoading}>
                            {isLogin ? '회원가입' : '로그인'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
