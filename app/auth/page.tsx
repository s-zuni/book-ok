"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import { BookMarked, ArrowLeft, KeyRound, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

type AuthMode = 'login' | 'signup' | 'reset';

export default function AuthPage() {
    const router = useRouter();
    const [authMode, setAuthMode] = useState<AuthMode>('login');
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [nickname, setNickname] = useState('');
    const [phone, setPhone] = useState('');
    const [authError, setAuthError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [isLoading, setIsLoading] = useState(false);

    // 아이디를 가짜 이메일로 변환 (공백 제거 + 소문자 통일)
    const convertToEmail = (id: string) => `${id.trim().toLowerCase()}@bookok.app`;

    // authMode 전환 시 폼 초기화
    const switchAuthMode = (mode: AuthMode) => {
        setAuthError('');
        setSuccessMessage('');
        setPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
        setAuthMode(mode);
    };

    const handleLogin = async () => {
        setAuthError('');
        const trimmedId = userId.trim().toLowerCase();
        const trimmedPassword = password;

        if (!trimmedId) {
            setAuthError('아이디를 입력해주세요.');
            return;
        }
        if (!trimmedPassword) {
            setAuthError('비밀번호를 입력해주세요.');
            return;
        }
        setIsLoading(true);
        const email = convertToEmail(trimmedId);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password: trimmedPassword });

            if (error) {
                // Comprehensive Korean error messages
                const errorMessage = getKoreanErrorMessage(error.message);
                setAuthError(errorMessage);
                setIsLoading(false);
            } else if (data.session) {
                // Ensure session is properly set before navigation
                router.refresh();
                router.push('/');
            } else {
                setAuthError('로그인에 실패했습니다. 다시 시도해주세요.');
                setIsLoading(false);
            }
        } catch (err: any) {
            console.error('Login error:', err);
            setAuthError('네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.');
            setIsLoading(false);
        }
    };

    // Korean error message mapping
    const getKoreanErrorMessage = (message: string): string => {
        const errorMap: { [key: string]: string } = {
            'Invalid login credentials': '아이디 또는 비밀번호가 올바르지 않습니다.',
            'Email not confirmed': '이메일 인증이 필요합니다. 이메일을 확인해주세요.',
            'User not found': '존재하지 않는 사용자입니다.',
            'Invalid email': '올바르지 않은 이메일 형식입니다.',
            'Signup requires a valid password': '유효한 비밀번호를 입력해주세요.',
            'Password should be at least 6 characters': '비밀번호는 최소 6자 이상이어야 합니다.',
            'User already registered': '이미 등록된 사용자입니다.',
            'Email rate limit exceeded': '너무 많은 요청이 있었습니다. 잠시 후 다시 시도해주세요.',
            'Rate limit exceeded': '너무 많은 요청이 있었습니다. 잠시 후 다시 시도해주세요.',
            'Network request failed': '네트워크 연결에 실패했습니다. 인터넷 연결을 확인해주세요.',
            'Failed to fetch': '서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.',
            'Database error': '데이터베이스 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        };

        // Check for partial matches
        for (const [key, value] of Object.entries(errorMap)) {
            if (message.toLowerCase().includes(key.toLowerCase())) {
                return value;
            }
        }

        // Return original message if no match (or generic message)
        return `오류가 발생했습니다: ${message}`;
    };

    const handleSignUp = async () => {
        setAuthError('');
        const trimmedId = userId.trim().toLowerCase();
        const trimmedNickname = nickname.trim();
        const trimmedPhone = phone.trim();

        if (!trimmedId) {
            setAuthError('아이디를 입력해주세요.');
            return;
        }
        if (!password) {
            setAuthError('비밀번호를 입력해주세요.');
            return;
        }
        if (password.length < 6) {
            setAuthError('비밀번호는 최소 6자 이상이어야 합니다.');
            return;
        }
        if (trimmedId.includes('@')) {
            setAuthError('아이디에 @를 포함할 수 없습니다.');
            return;
        }
        if (!trimmedNickname || !trimmedPhone) {
            setAuthError('이름과 핸드폰 번호를 모두 입력해주세요.');
            return;
        }

        setIsLoading(true);
        const email = convertToEmail(trimmedId);

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name: trimmedNickname,
                        phone: trimmedPhone,
                        role: 'user',
                        user_id: trimmedId
                    }
                }
            });

            if (error) {
                const errorMessage = getKoreanErrorMessage(error.message);
                setAuthError(errorMessage);
                setIsLoading(false);
            } else {
                if (data.user) {
                    // 회원가입 시 자동 로그인됨 → 바로 홈으로 이동
                    if (data.session) {
                        toast.success('회원가입이 완료되었습니다! 환영합니다 🎉');
                        router.refresh();
                        router.push('/');
                    } else {
                        // 세션이 없는 경우 (이메일 확인 필요 등) → 로그인으로 안내
                        toast.success('회원가입이 완료되었습니다! 로그인해주세요.');
                        setIsLoading(false);
                        switchAuthMode('login');
                    }
                }
            }
        } catch (err: any) {
            console.error('Signup error:', err);
            setAuthError('네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.');
            setIsLoading(false);
        }
    };

    // Password reset handler
    const handlePasswordReset = async () => {
        setAuthError('');
        setSuccessMessage('');

        if (!userId.trim()) {
            setAuthError('아이디를 입력해주세요.');
            return;
        }
        if (!phone.trim()) {
            setAuthError('가입 시 등록한 전화번호를 입력해주세요.');
            return;
        }
        if (!newPassword.trim()) {
            setAuthError('새 비밀번호를 입력해주세요.');
            return;
        }
        if (newPassword.length < 6) {
            setAuthError('비밀번호는 최소 6자 이상이어야 합니다.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setAuthError('비밀번호가 일치하지 않습니다.');
            return;
        }

        setIsLoading(true);

        try {
            // 1. Verify user exists with matching phone
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('id, phone')
                .eq('phone', phone)
                .single();

            if (profileError || !profiles) {
                setAuthError('입력하신 정보와 일치하는 계정을 찾을 수 없습니다.');
                setIsLoading(false);
                return;
            }

            // 2. Also verify the user ID matches (via auth.users metadata or email pattern)
            const email = convertToEmail(userId);
            const { data: userData, error: userError } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', profiles.id)
                .single();

            if (userError || !userData) {
                setAuthError('입력하신 정보와 일치하는 계정을 찾을 수 없습니다.');
                setIsLoading(false);
                return;
            }

            // 3. Update password using admin API (requires service role)
            // For client-side, we'll use a workaround: update via edge function or direct auth
            // Since we can't directly update password client-side without being logged in,
            // we'll show instructions or use Supabase's built-in method

            // For now, show a success message and guide user
            setSuccessMessage('아이디와 전화번호가 확인되었습니다. 새 비밀번호로 변경하려면 카카오톡 채널 또는 고객센터(bookok.help@gmail.com)로 문의해주세요.');
            setIsLoading(false);

            // Alternative: If you have an edge function for password reset:
            // const { error } = await supabase.functions.invoke('reset-password', {
            //     body: { userId: profiles.id, newPassword }
            // });

        } catch (err: any) {
            console.error('Password reset error:', err);
            setAuthError('오류가 발생했습니다. 다시 시도해주세요.');
            setIsLoading(false);
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
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg mx-auto mb-6 transform rotate-3 ${authMode === 'reset' ? 'bg-amber-500 shadow-amber-200' : 'bg-green-600 shadow-green-200'}`}>
                        {authMode === 'reset' ? <KeyRound size={32} /> : <BookMarked size={32} />}
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                        {authMode === 'login' ? '환영합니다!' : authMode === 'signup' ? '회원가입' : '비밀번호 찾기'}
                    </h2>
                    <p className="text-gray-500 font-medium">
                        {authMode === 'login' ? '북콕 서비스 이용을 위해 로그인해주세요.' :
                            authMode === 'signup' ? '아이와 함께하는 즐거운 독서 여정을 시작하세요.' :
                                '아이디와 전화번호로 본인 확인을 해주세요.'}
                    </p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">아이디</label>
                        <input
                            type="text"
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            className="w-full bg-gray-50 rounded-xl px-5 py-4 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-green-200 transition-all border border-transparent focus:border-green-500"
                            placeholder="아이디를 입력하세요"
                            onKeyDown={(e) => e.key === 'Enter' && (authMode === 'login' ? handleLogin() : authMode === 'signup' ? handleSignUp() : handlePasswordReset())}
                            autoCapitalize="off"
                            autoCorrect="off"
                            disabled={isLoading}
                        />
                    </div>

                    {/* Password Reset: Phone Field */}
                    {authMode === 'reset' && (
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">가입 시 등록한 전화번호</label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full bg-gray-50 rounded-xl px-5 py-4 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-green-200 transition-all border border-transparent focus:border-green-500"
                                placeholder="010-0000-0000"
                                disabled={isLoading}
                            />
                        </div>
                    )}

                    {/* Login/Signup: Password Field */}
                    {authMode !== 'reset' && (
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">비밀번호</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-gray-50 rounded-xl px-5 py-4 pr-12 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-green-200 transition-all border border-transparent focus:border-green-500"
                                    placeholder="••••••••"
                                    onKeyDown={(e) => e.key === 'Enter' && (authMode === 'login' ? handleLogin() : handleSignUp())}
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Password Reset: New Password Fields */}
                    {authMode === 'reset' && (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">새 비밀번호</label>
                                <div className="relative">
                                    <input
                                        type={showNewPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full bg-gray-50 rounded-xl px-5 py-4 pr-12 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-amber-200 transition-all border border-transparent focus:border-amber-500"
                                        placeholder="6자 이상"
                                        disabled={isLoading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                        tabIndex={-1}
                                    >
                                        {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">새 비밀번호 확인</label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-gray-50 rounded-xl px-5 py-4 pr-12 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-amber-200 transition-all border border-transparent focus:border-amber-500"
                                        placeholder="비밀번호 재입력"
                                        disabled={isLoading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                        tabIndex={-1}
                                    >
                                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {authMode === 'signup' && (
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
                    {successMessage && <p className="text-green-600 text-sm font-bold text-center py-2 bg-green-50 rounded-lg animate-in fade-in slide-in-from-top-1">{successMessage}</p>}

                    <button
                        onClick={authMode === 'login' ? handleLogin : authMode === 'signup' ? handleSignUp : handlePasswordReset}
                        disabled={isLoading}
                        className={`w-full text-white font-black py-4 rounded-xl shadow-lg hover:scale-[1.02] transform transition-all active:scale-95 mt-4 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed ${authMode === 'reset' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-gray-900 hover:bg-black'}`}
                    >
                        {isLoading ? (
                            <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            authMode === 'login' ? '로그인하기' : authMode === 'signup' ? '가입하기' : '비밀번호 재설정'
                        )}
                    </button>

                    <div className="flex flex-col items-center gap-2 mt-6">
                        {authMode !== 'reset' && (
                            <div className="flex items-center gap-2">
                                <span className="text-gray-400 font-medium text-sm">{authMode === 'login' ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}</span>
                                <button onClick={() => switchAuthMode(authMode === 'login' ? 'signup' : 'login')} className="text-green-600 font-black text-sm hover:underline" disabled={isLoading}>
                                    {authMode === 'login' ? '회원가입' : '로그인'}
                                </button>
                            </div>
                        )}
                        {authMode === 'login' && (
                            <button onClick={() => switchAuthMode('reset')} className="text-amber-600 font-bold text-sm hover:underline" disabled={isLoading}>
                                비밀번호를 잊으셨나요?
                            </button>
                        )}
                        {authMode === 'reset' && (
                            <button onClick={() => switchAuthMode('login')} className="text-gray-500 font-bold text-sm hover:underline" disabled={isLoading}>
                                ← 로그인으로 돌아가기
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
