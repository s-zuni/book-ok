"use client";

import { useState, useRef, useEffect } from "react";
import { Send, User, Bot, Paperclip, ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";

// Mock Chat Logic or Real AI Integration Point
export default function ChatPage() {
    const router = useRouter();
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
        { role: 'assistant', content: "안녕하세요! Book,ok AI 사서입니다. 🤖\n아이를 위한 특별한 책을 찾고 계신가요? 아이의 나이나 요즘 관심 있어 하는 주제를 알려주세요!" }
    ]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = input;
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setInput("");
        setIsTyping(true);

        // Simulate AI Delay & Response (Replace with real API later)
        setTimeout(() => {
            let reply = "좋은 질문이네요! 잠시만 기다려주세요, 아이에게 딱 맞는 책을 찾아보고 있어요...";
            if (userMsg.includes("공룡")) {
                reply = "공룡을 좋아하는군요! 🦖\n'공룡 유치원' 시리즈나 '티라노사우루스 렉스' 책을 추천해 드려요. 그림이 생생해서 아이들이 정말 좋아한답니다.";
            } else if (userMsg.includes("우주") || userMsg.includes("별")) {
                reply = "우주에 관심이 많군요! 🚀\n'내 친구 과학공룡' 시리즈의 우주 편이나, '우주로 간 강아지 형제'를 읽어보세요.";
            } else if (userMsg.includes("자동차") || userMsg.includes("탈것")) {
                reply = "탈것을 좋아하는 아이라면 '타요타요' 시리즈나 '건설현장의 차' 책이 딱이에요! 🚗";
            } else {
                reply = "말씀해주신 관심사를 바탕으로 분석 중입니다...\n혹시 아이가 평소에 즐겨 읽는 다른 책이 있나요? 알려주시면 더 정확한 추천이 가능해요! 📚";
            }

            setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
            setIsTyping(false);
        }, 1500);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="min-h-screen bg-[#FDFDFD] flex flex-col font-sans">
            <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100 h-16 flex items-center px-4 justify-between">
                <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600">
                    <ChevronLeft size={24} />
                </button>
                <span className="font-bold text-lg text-gray-800">AI 도서 추천 챗봇</span>
                <div className="w-10"></div> {/* Spacer */}
            </header>

            <main className="flex-1 pt-20 pb-24 px-4 max-w-2xl mx-auto w-full">
                <div className="space-y-6">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'assistant' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                                {msg.role === 'assistant' ? <Bot size={20} /> : <User size={20} />}
                            </div>
                            <div className={`p-4 rounded-2xl max-w-[80%] whitespace-pre-wrap leading-relaxed shadow-sm ${msg.role === 'assistant' ? 'bg-white border border-gray-100 text-gray-800 rounded-tl-none' : 'bg-green-600 text-white rounded-tr-none'}`}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                                <Bot size={20} />
                            </div>
                            <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-tl-none flex gap-2 items-center">
                                <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </main>

            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 p-4">
                <div className="max-w-2xl mx-auto flex gap-3 items-end">
                    <button className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-colors">
                        <Paperclip size={20} />
                    </button>
                    <div className="flex-1 bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-100 transition-all flex items-center">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="예: 7세 아이가 공룡을 좋아해..."
                            className="w-full bg-transparent border-none focus:ring-0 p-4 max-h-32 resize-none text-gray-900 placeholder:text-gray-400"
                            rows={1}
                        />
                    </div>
                    <button
                        onClick={handleSend}
                        disabled={!input.trim()}
                        className="p-4 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:hover:bg-green-600 transition-all shadow-md hover:shadow-lg"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}
