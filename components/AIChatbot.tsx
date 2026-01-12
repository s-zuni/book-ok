"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Bot, User, Minimize2, Sparkles } from "lucide-react";
import { useChatbot } from "../context/ChatbotContext";

interface Message {
    role: "user" | "assistant" | "system";
    content: string;
}

export default function AIChatbot() {
    const { isChatOpen, closeChat, toggleChat } = useChatbot();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isChatOpen]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { role: "user", content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: [...messages, userMessage] })
            });

            if (!response.ok) throw new Error('Failed to fetch');

            const data = await response.json();
            const botMessage = data.result;

            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: "assistant", content: "죄송해요, 잠시 문제가 발생했어요. 다시 시도해주시겠어요?" }]);
        } finally {
            setIsLoading(false);
        }
    };

    // Desktop Floating Button
    const DesktopTrigger = () => (
        <button
            onClick={toggleChat}
            className={`fixed bottom-8 right-8 z-50 p-4 rounded-full shadow-2xl transition-all duration-300 hidden lg:flex items-center gap-2 group ${isChatOpen ? 'bg-gray-800 rotate-90 scale-0' : 'bg-green-600 hover:bg-green-700 scale-100 hover:scale-110'}`}
        >
            <Sparkles className="text-yellow-300 fill-current animate-pulse" size={24} />
            <span className="text-white font-bold pr-2">AI 책 추천</span>
        </button>
    );

    if (!isChatOpen && typeof window !== 'undefined' && window.innerWidth >= 1024) {
        return <DesktopTrigger />;
    }

    if (!isChatOpen) return <DesktopTrigger />;

    return (
        <>
            {/* Overlay for Mobile (Optional, currently just modal) */}
            <div className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 transition-all duration-300 ${isChatOpen ? 'visible bg-black/30 backdrop-blur-sm' : 'invisible bg-transparent pointer-events-none'}`}>

                {/* Chat Window */}
                <div className={`bg-white w-full sm:max-w-md h-[85vh] sm:h-[600px] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 transform ${isChatOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>

                    {/* Header */}
                    <div className="bg-green-600 p-4 flex items-center justify-between text-white shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-full">
                                <Bot size={24} className="text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">AI 사서</h3>
                                <p className="text-xs text-green-100">무엇이든 물어보세요!</p>
                            </div>
                        </div>
                        <button onClick={closeChat} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                        {messages.length === 0 && (
                            <div className="text-center text-gray-400 mt-10 space-y-2">
                                <Sparkles size={40} className="mx-auto text-green-300" />
                                <p className="text-sm">"6세 아이가 좋아할 공룡 책 추천해줘"</p>
                                <p className="text-sm">"초등학생 필독서가 뭐야?"</p>
                            </div>
                        )}

                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3.5 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                        ? 'bg-green-600 text-white rounded-br-none shadow-md shadow-green-100'
                                        : 'bg-white text-gray-800 rounded-bl-none border border-gray-100 shadow-sm'
                                    }`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white p-4 rounded-2xl rounded-bl-none border border-gray-100 shadow-sm">
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-white border-t border-gray-100 shrink-0">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="궁금한 책 이야기를 해보세요..."
                                className="flex-1 bg-gray-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 text-sm font-medium transition-all"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || isLoading}
                                className="bg-green-600 text-white p-3 rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-green-100"
                            >
                                <Send size={20} />
                            </button>
                        </div>
                    </div>

                </div>
            </div>

            {/* Restore floating button if chat is open but we want a way to minimize? (Usually modal handles it via X) */}
        </>
    );
}
