"use client";

import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@features/auth/AuthContext";
import { useChatbot } from "@widgets/chatbot/ChatbotContext";
import { useLoginModal } from "@features/auth/LoginModalContext";

// Custom Premium SVG Icons to avoid "generic/AI-made" look
const HomeIcon = ({ active }: { active: boolean }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`transition-all duration-300 ${active ? 'scale-110' : 'scale-100'}`}>
        <path d="M4 19V5C4 3.89543 4.89543 3 6 3H19C19.5523 3 20 3.44772 20 4V20C20 20.5523 19.5523 21 19 21H6C4.89543 21 4 20.1046 4 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M9 7H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M9 11H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M4 17H20" stroke="currentColor" strokeWidth="2" />
        {active && <circle cx="17" cy="6" r="2" fill="currentColor" className="animate-pulse" />}
    </svg>
);

const AnalysisIcon = ({ active }: { active: boolean }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`transition-all duration-300 ${active ? 'scale-110' : 'scale-100'}`}>
        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" />
        <path d="M8 12L11 15L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 2V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M12 18V22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M22 12H18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M6 12H2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

const LibrarianIcon = () => (
    <div className="relative group">
        <div className="absolute -inset-1 bg-linear-to-r from-emerald-400 to-teal-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative group-hover:rotate-12 transition-transform duration-500">
            <path d="M12 3L14.5 9L21 10L16.5 15L18 21.5L12 18.5L6 21.5L7.5 15L3 10L9.5 9L12 3Z" fill="white" />
            <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="1.5" strokeDasharray="2 4" className="animate-[spin_8s_linear_infinite]" />
        </svg>
    </div>
);

const CommunityIcon = ({ active }: { active: boolean }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`transition-all duration-300 ${active ? 'scale-110' : 'scale-100'}`}>
        <path d="M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M21 14C21 17.3137 18.3137 20 15 20C11.6863 20 9 17.3137 9 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M7 9H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M8 12H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

const ProfileIcon = ({ active }: { active: boolean }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`transition-all duration-300 ${active ? 'scale-110' : 'scale-100'}`}>
        <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M6 21C6 17.134 9.13401 14 13 14H11C7.13401 14 4 17.134 4 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <rect x="14" y="15" width="6" height="6" rx="3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
);

export default function MobileBottomNav() {
    const router = useRouter();
    const pathname = usePathname();
    const { user, loading: authLoading } = useAuth();
    const { toggleChat } = useChatbot();
    const { openLoginModal } = useLoginModal();

    const navItems = [
        {
            label: "도서추천",
            icon: HomeIcon,
            path: "/",
            isActive: pathname === "/"
        },
        {
            label: "AI 분석",
            icon: AnalysisIcon,
            path: "/solution",
            isActive: pathname === "/solution"
        },
        {
            label: "AI 사서",
            icon: LibrarianIcon,
            isSpecial: true,
            action: authLoading ? undefined : (user ? toggleChat : openLoginModal)
        },
        {
            label: "커뮤니티",
            icon: CommunityIcon,
            path: "/community",
            isActive: pathname === "/community"
        },
        {
            label: "프로필",
            icon: ProfileIcon,
            path: user ? "/mypage" : undefined,
            action: authLoading ? undefined : (!user ? openLoginModal : undefined),
            isActive: pathname === "/mypage"
        },
    ];

    return (
        <div className="fixed bottom-6 left-4 right-4 z-50 lg:hidden">
            <nav className="bg-white/80 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-[32px] px-2 py-3">
                <div className="flex justify-between items-center max-w-sm mx-auto">
                    {navItems.map((item) => (
                        item.isSpecial ? (
                            <button
                                key={item.label}
                                onClick={item.action}
                                className="relative flex flex-col items-center justify-center -mt-10 group"
                            >
                                <div className="bg-[#2E5A44] p-4 rounded-full shadow-[0_8px_24px_rgba(46,90,68,0.3)] border-4 border-white transform group-active:scale-95 transition-transform duration-200">
                                    <item.icon />
                                </div>
                                <span className="text-[10px] font-black text-[#2E5A44] mt-2 tracking-tighter uppercase">{item.label}</span>
                            </button>
                        ) : (
                            <button
                                key={item.label}
                                onClick={() => item.action ? item.action() : router.push(item.path!)}
                                className={`flex flex-col items-center justify-center flex-1 py-1 gap-1 group transition-all duration-300 ${item.isActive ? "text-[#2E5A44]" : "text-gray-400 hover:text-gray-600"
                                    }`}
                            >
                                <div className={`p-1.5 rounded-2xl transition-all duration-300 ${item.isActive ? 'bg-[#E8F5E9]' : 'bg-transparent overflow-hidden'}`}>
                                    <item.icon active={!!item.isActive} />
                                </div>
                                <span className={`text-[10px] font-bold transition-all duration-300 ${item.isActive ? 'opacity-100 h-auto' : 'opacity-60 h-0 overflow-hidden'}`}>{item.label}</span>
                                {item.isActive && <div className="w-1 h-1 rounded-full bg-[#2E5A44]" />}
                            </button>
                        )
                    ))}
                </div>
            </nav>
        </div>
    );
}
