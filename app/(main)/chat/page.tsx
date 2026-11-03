"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Send, Sparkles, BookOpen, MessageCircleHeart } from "lucide-react";
import { useAuth } from "@features/auth/AuthContext";
import { useLoginModal } from "@features/auth/LoginModalContext";
import { renderSafeMarkdown } from "@shared/lib/renderSafeMarkdown";
import OptimizedImage from "@shared/ui/OptimizedImage";
import { Book } from "@shared/types";
import { toBook } from "@shared/lib/book-mapper";
import BookRating from "@shared/ui/BookRating";
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { supabase, supabaseUrl, supabaseAnonKey } from "@shared/lib/supabase";
import { safeFetch } from "@shared/lib/api";

interface Message {
    role: "user" | "assistant" | "system";
    content: string;
    books?: Book[];
}

type ChatMode = "recommend" | "consult";

const CONSULT_QUICK_PROMPTS = [
    "책을 끝까지 집중해서 못 읽고 금방 딴짓을 해요 📖",
    "공룡이나 특정 분야 책만 편식해서 읽어요 🦖",
    "책을 읽고 난 후 대화나 소감 표현을 어려워해요 🗣️",
    "잠자리에서 읽기 좋은 독서 습관과 책을 추천해주세요 🌙",
];

export default function ChatPage() {
    const router = useRouter();
    const { user, userProfile, children, activeChild: contextActiveChild, isInitialized, loading: authLoading } = useAuth();
    const { openLoginModal } = useLoginModal();
    const activeChild = contextActiveChild || (children && children.length > 0 ? children[0] : null);
    // recommend: 일반 도서 추천 채팅 / consult: 독서 고민 상담(구 독서 분석 > 독서 솔루션)
    const [mode, setMode] = useState<ChatMode>("recommend");
    const [recentReadTitles, setRecentReadTitles] = useState<string[]>([]);
    const [topGenre, setTopGenre] = useState("미정");

    // Personalize welcome greeting with user name and child name dynamically
    useEffect(() => {
        if (mode !== "recommend") return;
        if (user) {
            const userName = userProfile?.nickname || user.email?.split('@')[0] || "학부모";
            const firstChild = children?.[0];
            
            let greeting = "";
            if (firstChild) {
                const getJosa = (name: string) => {
                    if (!name) return "";
                    const lastChar = name.charCodeAt(name.length - 1);
                    if (lastChar < 0xAC00 || lastChar > 0xD7A3) return "";
                    const hasLast = (lastChar - 0xAC00) % 28 !== 0;
                    return hasLast ? "이" : "";
                };
                const childNameWithJosa = `${firstChild.name}${getJosa(firstChild.name)}`;
                greeting = `안녕하세요 ${userName}님!\n${childNameWithJosa}에게 추천할 책을 찾고 계세요?`;
            } else {
                greeting = `안녕하세요 ${userName}님!\n우리 아이에게 추천할 책을 찾고 계세요? 자녀 프로필을 등록하시면 더욱 개인화된 도서 추천을 받아보실 수 있어요.`;
            }

            setMessages(prev => {
                const newMsgs = [...prev];
                if (newMsgs[0]) {
                    newMsgs[0] = {
                        ...newMsgs[0],
                        content: greeting
                    };
                }
                return newMsgs;
            });
        } else if (isInitialized && !user && !authLoading) {
            setMessages(prev => {
                const newMsgs = [...prev];
                if (newMsgs[0]) {
                    newMsgs[0] = {
                        ...newMsgs[0],
                        content: "안녕하세요! 북콕 AI 사서입니다.\n로그인하시면 우리 아이의 연령 and 성향에 딱 맞는 도서 추천과 맞춤 큐레이션을 경험하실 수 있어요. 로그인하시겠어요?"
                    };
                }
                return newMsgs;
            });
        }
    }, [user, userProfile, children, isInitialized, authLoading, mode]);

    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            content: "안녕하세요! 아이가 읽을 책을 추천받고 싶으신가요? 상황을 알려주시면 도서 추천과 전문가 조언을 해드릴게요!"
        }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [viewportHeight, setViewportHeight] = useState("100dvh");
    const [isKeyboardActive, setIsKeyboardActive] = useState(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Helper to fetch and format book details from YES24 API
    const fetchBookByTitle = async (title: string): Promise<Book | null> => {
        try {
            const response = await safeFetch(
                `${supabaseUrl}/functions/v1/recommendations?query=${encodeURIComponent(title)}&apiType=ItemSearch`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': supabaseAnonKey,
                        'Authorization': `Bearer ${supabaseAnonKey}`
                    }
                }
            );
            if (!response.ok) return null;
            const bookData = await response.json();
            const item = bookData?.item?.[0];
            if (!item) return null;
            return toBook(item);
        } catch (e) {
            console.error("Failed to fetch book for title:", title, e);
            return null;
        }
    };



    // Handle authentication redirect if accessed directly
    useEffect(() => {
        if (isInitialized && !user && !authLoading) {
            openLoginModal();
            router.push("/");
        }
    }, [user, isInitialized, authLoading, router, openLoginModal]);

    // Handle mobile viewport height dynamically using VisualViewport API & Capacitor Keyboard
    useEffect(() => {
        if (typeof window === "undefined") return;
        const vv = window.visualViewport;
        if (!vv) return;

        const updateViewportHeight = () => {
            setViewportHeight(`${vv.height}px`);
        };

        updateViewportHeight();

        vv.addEventListener("resize", updateViewportHeight);
        vv.addEventListener("scroll", updateViewportHeight);

        let showSub: Promise<PluginListenerHandle> | null = null;
        let hideSub: Promise<PluginListenerHandle> | null = null;

        if (Capacitor.isNativePlatform()) {
            showSub = Keyboard.addListener('keyboardWillShow', (info) => {
                setIsKeyboardActive(true);
                const calculatedHeight = window.innerHeight - info.keyboardHeight;
                setViewportHeight(`${calculatedHeight}px`);
                setTimeout(scrollToBottom, 150);
            });

            hideSub = Keyboard.addListener('keyboardWillHide', () => {
                setIsKeyboardActive(false);
                setViewportHeight("100dvh");
                setTimeout(scrollToBottom, 150);
            });
        } else {
            const handleResize = () => {
                const offset = window.innerHeight - vv.height;
                setIsKeyboardActive(offset > 0);
                updateViewportHeight();
                setTimeout(scrollToBottom, 100);
            };
            vv.addEventListener("resize", handleResize);
            vv.addEventListener("scroll", handleResize);

            return () => {
                vv.removeEventListener("resize", updateViewportHeight);
                vv.removeEventListener("scroll", updateViewportHeight);
                vv.removeEventListener("resize", handleResize);
                vv.removeEventListener("scroll", handleResize);
            };
        }

        return () => {
            vv.removeEventListener("resize", updateViewportHeight);
            vv.removeEventListener("scroll", updateViewportHeight);
            if (showSub) showSub.then((h: PluginListenerHandle) => h.remove());
            if (hideSub) hideSub.then((h: PluginListenerHandle) => h.remove());
        };
    }, []);

    const childName = activeChild ? activeChild.name : (userProfile?.nickname ? `${userProfile.nickname} 부모님` : "부모님");

    const getConsultGreeting = () =>
        `◆ ${childName}의 독서 고민을 자세히 들려주세요!\n15년 경력 전문가가 ${childName}의 성향을 바탕으로 조언해 드릴게요.\nex) 저희 아이가 책 읽는 것을 너무 싫어해요. 어떻게 하면 책과 친해질 수 있을까요?`;

    const switchMode = (next: ChatMode) => {
        if (next === mode) return;
        setMode(next);
        setInput("");
        setMessages([{
            role: "assistant",
            content: next === "consult"
                ? getConsultGreeting()
                : "안녕하세요! 아이가 읽을 책을 추천받고 싶으신가요? 상황을 알려주시면 도서 추천과 전문가 조언을 해드릴게요!"
        }]);
    };

    // 독서 고민 상담용: 활성 자녀의 최근 읽은 책/선호 장르 로드
    useEffect(() => {
        if (!user || !activeChild) {
            setRecentReadTitles([]);
            setTopGenre("미정");
            return;
        }
        let cancelled = false;
        (async () => {
            const { data, error } = await supabase
                .from("read_books")
                .select("observation_data, books(title, category)")
                .eq("child_id", activeChild.id)
                .order("read_date", { ascending: false })
                .limit(30);
            if (cancelled || error || !data) return;
            const titles: string[] = [];
            const genreCount = new Map<string, number>();
            for (const row of data as unknown as { observation_data?: { book_title?: string } | null; books?: { title?: string; category?: string } | { title?: string; category?: string }[] | null }[]) {
                const book = Array.isArray(row.books) ? row.books[0] : row.books;
                const title = book?.title || row.observation_data?.book_title;
                if (title && !titles.includes(title)) titles.push(title);
                if (book?.category) genreCount.set(book.category, (genreCount.get(book.category) || 0) + 1);
            }
            const top = [...genreCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
            setRecentReadTitles(titles.slice(0, 10));
            setTopGenre(top || "미정");
        })();
        return () => { cancelled = true; };
    }, [user, activeChild?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // 문해력 진단 등에서 상담 모드로 진입(/chat?mode=consult)
    useEffect(() => {
        if (typeof window === "undefined") return;
        const params = new URLSearchParams(window.location.search);
        if (params.get("mode") !== "consult") return;
        setMode("consult");
        let prefill = "";
        try {
            prefill = sessionStorage.getItem("bookok_consult_prefill") || "";
            sessionStorage.removeItem("bookok_consult_prefill");
            if (!prefill && params.get("fromLiteracy") === "1") {
                const raw = sessionStorage.getItem("bookok_literacy_consult_context");
                if (raw) {
                    const ctx = JSON.parse(raw);
                    prefill = `최근 문해력 진단(${ctx.grade_label || ""})에서 종합 ${ctx.total_bli_score}점(${ctx.bli_tier}, 읽기 속도 분당 ${ctx.effective_wpm}어절)이 나왔고, '${ctx.weakest_area_label}' 영역 보완이 필요하다고 나왔어요. 맞춤 지도 방법을 알려주세요.`;
                    sessionStorage.removeItem("bookok_literacy_consult_context");
                }
            }
        } catch { /* ignore */ }
        setMessages([{ role: "assistant", content: getConsultGreeting() }]);
        if (prefill) setInput(prefill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleNewChat = async () => {
        if (Capacitor.isNativePlatform()) {
            await Haptics.impact({ style: ImpactStyle.Medium });
        }

        if (mode === "consult") {
            setMessages([{ role: "assistant", content: getConsultGreeting() }]);
            setInput("");
            return;
        }

        const userName = userProfile?.nickname || user?.email?.split('@')[0] || "학부모";
        const firstChild = children?.[0];
        
        let greeting = "";
        if (user) {
            if (firstChild) {
                greeting = `${userName}님 안녕하세요! ${firstChild.name}가 읽을 책 추천하고 계신가요? 상황 알려주시면 저희가 책 추천 혹은 전문가 조언을 해드릴게요!`;
            } else {
                greeting = `${userName}님 안녕하세요! 우리 아이가 읽을 책 추천하고 계신가요? 상황 알려주시면 저희가 책 추천 혹은 전문가 조언을 해드릴게요!`;
            }
        } else {
            greeting = "안녕하세요! 아이가 읽을 책을 추천받고 싶으신가요? 상황을 알려주시면 도서 추천과 전문가 조언을 해드릴게요!";
        }

        setMessages([
            {
                role: "assistant",
                content: greeting
            }
        ]);
        setInput("");
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        if (Capacitor.isNativePlatform()) {
            await Haptics.impact({ style: ImpactStyle.Light });
        }

        const userMessage: Message = { role: "user", content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            let requestBody: string;
            if (mode === "consult") {
                const age = activeChild?.age || 0;
                const prompt = `
            당신은 15년 경력의 아동 독서 교육 전문가이자 발달 심리학자입니다.
            현재 자녀(${childName}, 나이: 만 ${age}세)의 독서 성향을 바탕으로 부모님의 독서 관련 고민에 답해주세요.

            [자녀의 실제 독서 프로필]
            - 이름: ${childName}
            - 나이: 만 ${age}세
            - 선호 독서 주제: ${topGenre}
            - 최근에 읽은 책들: [${recentReadTitles.join(", ") || "독서 기록이 없음"}]

            [부모님의 고민]
            "${userMessage.content}"

            [솔루션 작성 가이드라인]
            1. **15년 아동 독서 전문가**로서의 어조를 사용하고, 아동 발달학 및 독서치료 요소를 가볍게 녹여 신뢰감을 주세요.
            2. 고민을 해결할 수 있는 **구체적인 실천 전략 3가지**를 제안하되, 글머리 기호(-)로 작성하세요.
            3. 답변에는 실제 아이의 이름인 **'${childName}'**을 언급하여 부모님의 고민에 직접 응답한다는 인상을 주세요.
            4. 자녀의 최근 독서 성향(선호 장르나 최근 읽은 책)을 언급하며 솔루션과 연계해 조언해주세요.
            5. 핵심 행동 팁이나 키워드는 **굵게** 표시하세요.
            6. **[중요] 추천도서 태깅**:
               - 만약 답변 도중 추천하고 싶은 구체적인 아동 도서가 있다면, 답변 맨 마지막 줄에 반드시 \`[RECOMMENDED_BOOKS: 책제목1, 책제목2, ...]\` 형태로 추천한 도서들의 정확한 제목을 쉼표로 구분하여 기재해주세요.
               - 단, 가상의 책 제목이 아닌 실제 출판된 아동 도서의 정확한 제목이어야 합니다.
               - 예: [RECOMMENDED_BOOKS: 무지개 물고기, 언제나 사랑해]
            `;
                requestBody = JSON.stringify({ prompt, mode: "expert" });
            } else {
                requestBody = JSON.stringify({ messages: [...messages.map(m => ({ role: m.role, content: m.content })), userMessage] });
            }

            const response = await safeFetch(`${supabaseUrl}/functions/v1/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseAnonKey
                },
                body: requestBody
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `HTTP Error ${response.status}`);
            }

            const data = await response.json();
            const botMessage = typeof data.result === "string"
                ? { role: "assistant", content: data.result, books: undefined }
                : data.result;
            let content = botMessage.content || "";
            
            const loadedBooks: Book[] = (botMessage.books || data.books || []) as Book[];
            
            // Clean up recommendation tag from displayed content
            if (content.includes('[RECOMMENDED_BOOKS:')) {
                const match = content.match(/\[RECOMMENDED_BOOKS:\s*(.*?)\]/);
                if (match && loadedBooks.length === 0) {
                    const identifiers = match[1].split(',').map((t: string) => t.trim()).filter(Boolean);
                    for (const id of identifiers) {
                        const book = await fetchBookByTitle(id);
                        if (book) loadedBooks.push(book);
                    }
                }
                content = content.replace(/\[RECOMMENDED_BOOKS:\s*(.*?)\]/g, '').trim();
            }

            setMessages(prev => [...prev, { 
                role: botMessage.role || "assistant",
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
        <div 
            className="flex flex-col bg-[#F8F9FA] overflow-hidden text-gray-900 font-sans"
            style={{ height: viewportHeight }}
        >
            {/* Header */}
            <header className="bg-white border-b border-gray-100 px-4 pb-2.5 flex items-center justify-between shrink-0 pt-[calc(0.6rem+env(safe-area-inset-top,0px))]">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => router.back()}
                        className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-700"
                    >
                        <ChevronLeft size={22} />
                    </button>
                    <div>
                        <div className="flex items-center gap-1">
                            <span className="font-black text-[16px] tracking-tight">북콕 AI 사서</span>
                            <span className="w-1.5 h-1.5 bg-[#16A34A] rounded-full mt-0.5 animate-pulse" />
                        </div>
                        <span className="text-[10px] font-bold text-[#16A34A] tracking-tighter block leading-none mt-0.5">● 대화 중</span>
                    </div>
                </div>
                <button
                    onClick={handleNewChat}
                    className="bg-[#E8F5E9] hover:bg-[#E8F5E9]/80 active:scale-[0.98] text-[#16A34A] rounded-full px-2.5 py-1 text-[11px] font-black tracking-tight transition-all flex items-center gap-1"
                >
                    <Sparkles size={12} fill="currentColor" />
                    <span>{mode === "consult" ? "새 상담" : "새 채팅"}</span>
                </button>
            </header>

            {/* 모드 전환: 도서 추천 / 독서 솔루션(고민 상담) */}
            <div className="bg-white border-b border-gray-100 px-4 py-2 shrink-0">
                <div className="flex gap-1 rounded-full bg-gray-100 p-1" role="tablist" aria-label="AI 사서 모드">
                    {([
                        { key: "recommend", label: "도서 추천", Icon: BookOpen },
                        { key: "consult", label: "독서 솔루션", Icon: MessageCircleHeart },
                    ] as const).map(({ key, label, Icon }) => (
                        <button
                            key={key}
                            type="button"
                            role="tab"
                            aria-selected={mode === key}
                            onClick={() => switchMode(key)}
                            className={`flex-1 flex items-center justify-center gap-1.5 rounded-full py-1.5 text-[13px] font-extrabold transition-all ${
                                mode === key ? "bg-white text-[#16A34A] shadow-sm" : "text-gray-400"
                            }`}
                        >
                            <Icon size={14} />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

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
                                        <div className="whitespace-pre-line">
                                            <span className="text-[#16A34A] font-black">{msg.content.slice(0, msg.content.indexOf(" ") + 1)}</span>
                                            <span className="font-bold">{msg.content.slice(msg.content.indexOf(" ") + 1)}</span>
                                        </div>
                                    ) : !isUser ? (
                                        <div
                                            className="prose prose-sm max-w-none prose-p:my-0.5 prose-ul:my-0.5 prose-li:my-0 text-gray-800 whitespace-pre-line"
                                            dangerouslySetInnerHTML={{ __html: renderSafeMarkdown(msg.content.replace(/\[RECOMMENDED_BOOKS:.*?\]/g, "").trim()) }}
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
                                                onClick={() => {
                                                    if (book.id) {
                                                        router.push(`/book/?id=${book.id}`);
                                                    }
                                                }}
                                                className="bg-white rounded-[24px] p-3 border border-gray-100 shadow-[0_4px_12px_rgba(0,0,0,0.03)] w-[160px] shrink-0 hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] transition-all duration-300 cursor-pointer hover:border-[#16A34A]/30 hover:-translate-y-1 transform"
                                            >
                                                <div className="relative w-full h-[190px] rounded-[16px] overflow-hidden mb-3.5 border border-gray-100">
                                                    <OptimizedImage
                                                        src={book.coverUrl || book.imgsrc}
                                                        alt={book.title}
                                                        fill
                                                        className="object-cover"
                                                        sizes="160px"
                                                        sizePreset="thumbnail"
                                                        fallbackSrc="/og-default.png"
                                                    />
                                                </div>
                                                <h4 className="font-extrabold text-[13px] text-gray-900 tracking-tight line-clamp-1 mb-0.5">{book.title}</h4>
                                                <p className="text-[10px] text-gray-400 font-bold tracking-tight mb-1">{book.author} / {book.publisher}</p>
                                                <BookRating rating={book.rating} iconSize={11} className="text-[11px]" />
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
                {mode === "consult" && messages.length <= 1 && (
                    <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-black text-gray-400 block ml-0.5">💡 자주 묻는 독서 고민 질문</span>
                        <div className="flex flex-col gap-1.5">
                            {CONSULT_QUICK_PROMPTS.map((text) => (
                                <button
                                    key={text}
                                    type="button"
                                    onClick={() => { setInput(text); inputRef.current?.focus(); }}
                                    className="text-left bg-white border border-gray-100 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-gray-700 active:scale-[0.98] transition-all"
                                >
                                    {text}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Form Area */}
            <div
                className="bg-white border-t border-gray-100 px-4 py-3 shrink-0"
                style={{ 
                    paddingBottom: isKeyboardActive 
                        ? '0.75rem' 
                        : 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' 
                }}
            >
                <div className="flex items-center gap-2 max-w-3xl mx-auto">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        placeholder={mode === "consult" ? `${childName}의 독서 고민을 들려주세요...` : "메시지를 입력하세요"}
                        className="flex-1 bg-gray-50 border border-gray-100 rounded-full px-5 py-3 outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A] text-base font-medium text-gray-900 transition-all placeholder-gray-400"
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
