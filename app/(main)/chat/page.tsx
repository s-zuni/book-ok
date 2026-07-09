"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Send, Sparkles, Star } from "lucide-react";
import { useAuth } from "@features/auth/AuthContext";
import { useLoginModal } from "@features/auth/LoginModalContext";
import { marked } from "marked";
import Image from "next/image";

interface Book {
    title: string;
    author: string;
    publisher: string;
    rating: number;
    reviewsCount: number;
    coverUrl: string;
}

interface Message {
    role: "user" | "assistant" | "system";
    content: string;
    books?: Book[];
}

export default function ChatPage() {
    const router = useRouter();
    const { user, userProfile, children, loading: authLoading } = useAuth();
    const { openLoginModal } = useLoginModal();

    // Personalize welcome greeting with user name and child name dynamically
    useEffect(() => {
        if (user) {
            const userName = userProfile?.nickname || user.email?.split('@')[0] || "학부모";
            const childName = children?.[0]?.name || "아이";
            setMessages(prev => {
                const newMsgs = [...prev];
                if (newMsgs[0]) {
                    newMsgs[0] = {
                        ...newMsgs[0],
                        content: `안녕하세요 ${userName}님!\n${childName}이에게 추천할 책을 찾고 계세요?`
                    };
                }
                return newMsgs;
            });
        }
    }, [user, userProfile, children]);

    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            content: "안녕하세요 유수미님!\n지명이에게 추천할 책을 찾고 계세요?"
        },
        {
            role: "user",
            content: "6살 아이가 친구랑 자주 다툼이 생겨요. 우정이나 갈등 해결에 도움될 만한 책이 있을까요?"
        },
        {
            role: "assistant",
            content: "◆ 우정과 갈등 해결을 다룬 그림책 3권을 추천드릴게요",
            books: [] // Loaded dynamically on mount
        }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [keyboardOffset, setKeyboardOffset] = useState(0);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Helper to fetch and format book details from Aladin API
    const fetchAladinBook = async (title: string): Promise<Book | null> => {
        try {
            const res = await fetch(`/api/recommendations?query=${encodeURIComponent(title)}&apiType=ItemSearch`);
            if (!res.ok) return null;
            const data = await res.json();
            const item = data.item?.[0];
            if (!item) return null;
            return {
                title: item.title.split(" - ")[0], // Remove subtitle fluff
                author: item.author.replace(/\s*\(지은이\)|\s*\(그림\)|\s*\(글\)/g, "").split(",")[0].trim(),
                publisher: item.publisher,
                rating: item.customerRating ? parseFloat((item.customerRating / 2).toFixed(1)) : 4.8,
                reviewsCount: item.salesPoint ? Math.min(Math.floor(item.salesPoint / 100), 300) + 12 : Math.floor(Math.random() * 50) + 100,
                coverUrl: item.cover
            };
        } catch (e) {
            console.error("Failed to fetch Aladin book for title:", title, e);
            return null;
        }
    };

    // Load initial recommended books on mount from Aladin API
    useEffect(() => {
        const loadInitialBooks = async () => {
            const bookTitles = [
                "진짜 일학년 책가방을 지켜라!",
                "하늘이 딱딱했대?",
                "왜 먼저 물어보지 않니?"
            ];
            
            const loadedBooks: Book[] = [];
            for (const title of bookTitles) {
                const book = await fetchAladinBook(title);
                if (book) loadedBooks.push(book);
            }

            if (loadedBooks.length > 0) {
                setMessages(prev => {
                    const newMsgs = [...prev];
                    // Update books for the 3rd message
                    if (newMsgs[2]) {
                        newMsgs[2] = { ...newMsgs[2], books: loadedBooks };
                    }
                    return newMsgs;
                });
            }
        };

        loadInitialBooks();
    }, []);

    // Handle authentication redirect if accessed directly
    useEffect(() => {
        if (!authLoading && !user) {
            openLoginModal();
            router.push("/");
        }
    }, [user, authLoading, router, openLoginModal]);

    // Handle mobile keyboard height dynamically using VisualViewport API
    useEffect(() => {
        if (typeof window === "undefined") return;
        const vv = window.visualViewport;
        if (!vv) return;

        const handleResize = () => {
            const offset = window.innerHeight - vv.height;
            setKeyboardOffset(offset > 0 ? offset : 0);
            setTimeout(scrollToBottom, 100);
        };

        vv.addEventListener("resize", handleResize);
        vv.addEventListener("scroll", handleResize);
        return () => {
            vv.removeEventListener("resize", handleResize);
            vv.removeEventListener("scroll", handleResize);
        };
    }, []);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { role: "user", content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: [...messages.map(m => ({ role: m.role, content: m.content })), userMessage] })
            });

            if (!response.ok) throw new Error("Failed to fetch chat");

            const data = await response.json();
            const botMessage = data.result;
            let content = botMessage.content;
            
            let loadedBooks: Book[] = [];
            const match = content.match(/\[RECOMMENDED_BOOKS:\s*(.*?)\]/);
            if (match) {
                const titles = match[1].split(',').map((t: string) => t.trim()).filter(Boolean);
                content = content.replace(/\[RECOMMENDED_BOOKS:\s*(.*?)\]/, '').trim();
                
                // Fetch each book's Aladin details
                for (const title of titles) {
                    const book = await fetchAladinBook(title);
                    if (book) loadedBooks.push(book);
                }
            }

            setMessages(prev => [...prev, { 
                role: botMessage.role, 
                content: content,
                books: loadedBooks.length > 0 ? loadedBooks : undefined
            }]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: "assistant", content: "죄송해요, 잠시 통신 에러가 발생했습니다. 다시 말씀해 주시겠어요?" }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-dvh bg-[#F8F9FA] overflow-hidden text-gray-900 font-sans">
            {/* Header */}
            <header className="bg-white border-b border-gray-100 px-4 pb-3 flex items-center justify-between shrink-0 pt-[calc(0.75rem+env(safe-area-inset-top,0px))]">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-700"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <span className="font-black text-lg tracking-tight">북콕 AI 사서</span>
                            <span className="w-1.5 h-1.5 bg-[#16A34A] rounded-full mt-1 animate-pulse" />
                        </div>
                        <span className="text-[11px] font-bold text-[#16A34A] tracking-tighter">● 대화 중</span>
                    </div>
                </div>
                <div className="w-10 h-10 bg-[#E8F5E9] rounded-full flex items-center justify-center text-[#16A34A]">
                    <Sparkles size={20} />
                </div>
            </header>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-[#F4F6F8]">
                {messages.map((msg, idx) => {
                    const isUser = msg.role === "user";
                    return (
                        <div key={idx} className="space-y-3">
                            <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                                <div
                                    className={`max-w-[85%] px-4 py-3.5 rounded-[24px] text-[15px] leading-relaxed shadow-sm ${
                                        isUser
                                            ? "bg-[#1A1A1A] text-white rounded-tr-none"
                                            : "bg-white text-gray-800 rounded-tl-none border border-gray-100"
                                    }`}
                                >
                                    {/* Green prefix for assistant title statements */}
                                    {!isUser && msg.content.startsWith("◆") ? (
                                        <div>
                                            <span className="text-[#16A34A] font-black">{msg.content.slice(0, msg.content.indexOf(" ") + 1)}</span>
                                            <span className="font-bold">{msg.content.slice(msg.content.indexOf(" ") + 1)}</span>
                                        </div>
                                    ) : !isUser ? (
                                        <div
                                            className="prose prose-sm max-w-none prose-p:my-0.5 prose-ul:my-0.5 prose-li:my-0 text-gray-800 whitespace-pre-line"
                                            dangerouslySetInnerHTML={{ __html: marked.parse(msg.content) as string }}
                                        />
                                    ) : (
                                        msg.content
                                    )}
                                </div>
                            </div>

                            {/* Horizontal Book Recommendation Cards */}
                            {msg.books && msg.books.length > 0 && (
                                <div className="flex overflow-x-auto gap-4 py-2 px-1 scrollbar-hide -mx-4 md:mx-0 md:px-0">
                                    <div className="flex gap-3 px-4 md:px-0">
                                        {msg.books.map((book, bIdx) => (
                                            <div
                                                key={bIdx}
                                                className="bg-white rounded-[24px] p-3 border border-gray-100 shadow-[0_4px_12px_rgba(0,0,0,0.03)] w-[160px] shrink-0 hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] transition-shadow duration-300"
                                            >
                                                <div className="relative w-full h-[190px] rounded-[16px] overflow-hidden mb-3.5 border border-gray-100">
                                                    <Image
                                                        src={book.coverUrl}
                                                        alt={book.title}
                                                        fill
                                                        className="object-cover"
                                                        sizes="160px"
                                                        priority
                                                    />
                                                </div>
                                                <h4 className="font-extrabold text-[13px] text-gray-900 tracking-tight line-clamp-1 mb-0.5">{book.title}</h4>
                                                <p className="text-[10px] text-gray-400 font-bold tracking-tight mb-1">{book.author} / {book.publisher}</p>
                                                <div className="flex items-center gap-0.5 text-[#16A34A]">
                                                    <Star size={11} fill="currentColor" />
                                                    <span className="text-[11px] font-black">{book.rating}</span>
                                                    <span className="text-[11px] font-bold text-gray-400">({book.reviewsCount})</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white px-5 py-4 rounded-[24px] rounded-tl-none border border-gray-100 shadow-sm">
                            <div className="flex gap-1.5 items-center">
                                <div className="w-2.5 h-2.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                <div className="w-2.5 h-2.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                <div className="w-2.5 h-2.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Form Area */}
            <div
                className="bg-white border-t border-gray-100 px-4 py-3 shrink-0"
                style={{ paddingBottom: `calc(0.75rem + ${keyboardOffset}px + env(safe-area-inset-bottom, 0px))` }}
            >
                <div className="flex items-center gap-2 max-w-3xl mx-auto">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        placeholder="메시지를 입력하세요"
                        className="flex-1 bg-gray-50 border border-gray-100 rounded-full px-5 py-3 outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A] text-sm font-medium text-gray-900 transition-all placeholder-gray-400"
                        enterKeyHint="send"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className="bg-[#1A1A1A] hover:bg-gray-800 disabled:bg-gray-200 disabled:opacity-50 text-white p-3 rounded-full transition-all duration-300 flex items-center justify-center shrink-0"
                    >
                        <Send size={18} className="transform rotate-0" />
                    </button>
                </div>
            </div>
        </div>
    );
}
