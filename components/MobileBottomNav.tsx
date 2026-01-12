"use client";

import { BookOpen, Brain, MessageCircle, User, Sparkles } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useChatbot } from "../context/ChatbotContext";

export default function MobileBottomNav() {
    const router = useRouter();
    const pathname = usePathname();
    const { user } = useAuth();
    const { toggleChat } = useChatbot();

    const navItems = [
        {
            label: "도서추천",
            icon: BookOpen,
            path: "/",
            isActive: pathname === "/"
        },
        {
            label: "AI 분석",
            icon: Brain,
            path: "/solution",
            isActive: pathname === "/solution"
        },
        // Central AI Button Placeholder
        {
            label: "AI 사서",
            icon: Sparkles,
            isSpecial: true,
            action: toggleChat
        },
        {
            label: "커뮤니티",
            icon: MessageCircle,
            path: "/community",
            isActive: pathname === "/community"
        },
        {
            label: "프로필",
            icon: User,
            path: user ? "/mypage" : "/auth",
            isActive: pathname === "/mypage" || pathname === "/auth"
        },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 pb-safe lg:hidden">
            <div className="flex justify-around items-center h-16 px-2">
                {navItems.map((item) => (
                    item.isSpecial ? (
                        <button
                            key={item.label}
                            onClick={item.action}
                            className="flex flex-col items-center justify-center -mt-8"
                        >
                            <div className="bg-green-600 p-3.5 rounded-full shadow-lg shadow-green-100 border-4 border-white">
                                <item.icon size={26} className="text-white fill-current animate-pulse" />
                            </div>
                            <span className="text-[10px] font-bold text-gray-800 mt-1">{item.label}</span>
                        </button>
                    ) : (
                        <button
                            key={item.label}
                            onClick={() => router.push(item.path!)}
                            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${item.isActive ? "text-green-600" : "text-gray-400 hover:text-gray-600"
                                }`}
                        >
                            <item.icon size={24} strokeWidth={item.isActive ? 2.5 : 2} />
                            <span className="text-[10px] font-bold">{item.label}</span>
                        </button>
                    )
                ))}
            </div>
        </nav>
    );
}
