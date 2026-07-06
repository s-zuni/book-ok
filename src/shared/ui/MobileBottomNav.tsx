"use client";

import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@features/auth/AuthContext";
import { useLoginModal } from "@features/auth/LoginModalContext";

// Premium SVG Icons matching the mockup
const HomeIcon = ({ active }: { active: boolean }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`transition-all duration-300 ${active ? 'scale-110' : 'scale-100'}`}>
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
);

const ReaderIcon = ({ active }: { active: boolean }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`transition-all duration-300 ${active ? 'scale-110' : 'scale-100'}`}>
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
        <path d="M6 6h10" />
        <path d="M6 10h10" />
    </svg>
);

const LibrarianIcon = () => (
    <div className="relative group">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="relative transition-transform duration-500 group-active:scale-90">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <path d="M8 10h.01" />
            <path d="M12 10h.01" />
            <path d="M16 10h.01" />
        </svg>
    </div>
);

const CommunityIcon = ({ active }: { active: boolean }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`transition-all duration-300 ${active ? 'scale-110' : 'scale-100'}`}>
        <path d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 1 0 0-8c-2 0-4 1.33-6 4Z" />
    </svg>
);

const ProfileIcon = ({ active }: { active: boolean }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`transition-all duration-300 ${active ? 'scale-110' : 'scale-100'}`}>
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

export default function MobileBottomNav() {
    const router = useRouter();
    const pathname = usePathname();
    const { user, loading: authLoading } = useAuth();
    const { openLoginModal } = useLoginModal();

    if (pathname === "/chat") return null;

    const handleLibrarianClick = () => {
        if (authLoading) return;
        if (!user) {
            openLoginModal();
        } else {
            router.push("/chat");
        }
    };

    const navItems = [
        {
            label: "홈",
            icon: HomeIcon,
            path: "/",
            isActive: pathname === "/"
        },
        {
            label: "AI 독서",
            icon: ReaderIcon,
            path: "/solution",
            isActive: pathname === "/solution"
        },
        {
            label: "AI 사서",
            icon: LibrarianIcon,
            isSpecial: true,
            action: handleLibrarianClick,
            isActive: pathname === "/chat"
        },
        {
            label: "커뮤니티",
            icon: CommunityIcon,
            path: "/community",
            isActive: pathname === "/community"
        },
        {
            label: "MY",
            icon: ProfileIcon,
            path: user ? "/mypage" : undefined,
            action: authLoading ? undefined : (!user ? openLoginModal : undefined),
            isActive: pathname === "/mypage"
        },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
            <nav className="bg-white border-t border-gray-100/80 shadow-[0_-8px_30px_rgba(0,0,0,0.03)] px-4 pt-2.5 pb-6">
                <div className="flex justify-between items-center max-w-sm mx-auto">
                    {navItems.map((item) => (
                        item.isSpecial ? (
                            <button
                                key={item.label}
                                onClick={item.action}
                                className="relative flex flex-col items-center justify-center -mt-10 group"
                            >
                                <div className="bg-[#01C54F] p-3.5 rounded-full shadow-[0_8px_24px_rgba(1,197,79,0.3)] border-4 border-white ring-2 ring-[#01C54F] transform group-active:scale-95 transition-transform duration-200">
                                    <item.icon />
                                </div>
                                <span className="text-[10px] font-black text-[#01C54F] mt-1.5 tracking-tighter uppercase">{item.label}</span>
                            </button>
                        ) : (
                            <button
                                key={item.label}
                                onClick={() => item.action ? item.action() : router.push(item.path!)}
                                className={`flex flex-col items-center justify-center flex-1 py-1 gap-1 group transition-all duration-300 ${
                                    item.isActive ? "text-[#1A1A1A]" : "text-[#999999]"
                                }`}
                            >
                                <div className="p-1 transition-all duration-300">
                                    <item.icon active={!!item.isActive} />
                                </div>
                                <span className={`text-[10px] tracking-tight transition-all duration-300 ${
                                    item.isActive ? 'font-black opacity-100' : 'font-semibold opacity-85'
                                }`}>
                                    {item.label}
                                </span>
                            </button>
                        )
                    ))}
                </div>
            </nav>
        </div>
    );
}
