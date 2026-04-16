import { useEffect, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";

interface LoadingStateProps {
    messages?: string[];
}

export default function LoadingState({ messages = ["AI가 분석 중입니다...", "잠시만 기다려주세요..."] }: LoadingStateProps) {
    const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
        }, 2000);
        return () => clearInterval(interval);
    }, [messages]);

    return (
        <div className="flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
            <div className="relative mb-6">
                <div className="absolute inset-0 bg-green-200 rounded-full blur-xl opacity-50 animate-pulse" />
                <div className="relative w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <Loader2 className="animate-spin text-green-600" size={32} />
                    <Sparkles className="absolute -top-1 -right-1 text-yellow-400 animate-bounce" size={16} fill="currentColor" />
                </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2 transition-all duration-500 min-h-7">
                {messages[currentMessageIndex]}
            </h3>
            <p className="text-sm text-gray-400">최대 30초 정도 소요될 수 있습니다</p>
        </div>
    );
}
