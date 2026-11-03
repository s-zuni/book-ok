"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@shared/ui/Header";
import Sidebar from "@shared/ui/Sidebar";
import { apiUrl, safeFetch } from "@shared/lib/api";
import { useAuth } from "@features/auth/AuthContext";
import { supabase, supabaseUrl, supabaseAnonKey } from "@shared/lib/supabase";
import { Child, Book, MainMenu, LiteracyAssessment } from "@shared/types";
import { toBook, type BookApiItem } from "@shared/lib/book-mapper";
import BookRating from "@shared/ui/BookRating";
import { Sparkles, BrainCircuit, ChevronRight } from "lucide-react";
import Image from "next/image";
import OptimizedImage from "@shared/ui/OptimizedImage";
import { useLoginModal } from "@features/auth/LoginModalContext";
import { Capacitor, PluginListenerHandle } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";



import ReadingAnalysis from "@widgets/solution/ReadingAnalysis";
import LiteracyDashboardWidget from "@widgets/solution/LiteracyDashboardWidget";



interface SupabaseReadBook {
    book_id: string;
    read_date: string;
    observation_data: Record<string, string> | null;
    books: Book | Book[] | null;
}

interface BookWithObservation extends Book {
    _observation?: Record<string, string> | null;
}

export function SolutionPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const tabParam = searchParams?.get('tab') as 'analysis' | 'literacy' | 'solution' | null;
    const fromLiteracyParam = searchParams?.get('fromLiteracy');
    const { openLoginModal } = useLoginModal();
    const [activeMenu, setActiveMenu] = useState<MainMenu>('solution');
    const [activeSubMenu, setActiveSubMenu] = useState('우리 아이 독서 성향 AI 분석');
    // activeChild is managed via AuthContext
    const [searchQuery, setSearchQuery] = useState("");

    // Mobile specific states & refs
    const [mobileTab, setMobileTab] = useState<'analysis' | 'literacy'>('analysis');
    const [, setIsKeyboardActive] = useState(false);
    const [viewportHeight, setViewportHeight] = useState("100dvh");

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
            showSub = Keyboard.addListener('keyboardWillShow', () => {
                setIsKeyboardActive(true);
                setTimeout(() => {
                    updateViewportHeight();
                }, 100);
            });

            hideSub = Keyboard.addListener('keyboardWillHide', () => {
                setIsKeyboardActive(false);
                setTimeout(() => {
                    updateViewportHeight();
                }, 100);
            });
        }

        return () => {
            vv.removeEventListener("resize", updateViewportHeight);
            vv.removeEventListener("scroll", updateViewportHeight);
            if (showSub) showSub.then((h: PluginListenerHandle) => h.remove());
            if (hideSub) hideSub.then((h: PluginListenerHandle) => h.remove());
        };
    }, []);

    useEffect(() => {
        // 독서 솔루션은 AI 사서(/chat)로 이동했다. 예전 링크는 그쪽으로 넘긴다.
        if (tabParam === 'solution') {
            router.replace(fromLiteracyParam === '1' ? '/chat?mode=consult&fromLiteracy=1' : '/chat?mode=consult');
            return;
        }
        if (tabParam && (tabParam === 'analysis' || tabParam === 'literacy')) {
            setMobileTab(tabParam);
            if (tabParam === 'literacy') setActiveSubMenu('AI 문해력 진단');
            else setActiveSubMenu('우리 아이 독서 성향 AI 분석');
        }
    }, [tabParam, fromLiteracyParam, router]);

    const handleTabChange = (newTab: 'analysis' | 'literacy') => {
        setMobileTab(newTab);
        if (newTab === 'literacy') setActiveSubMenu('AI 문해력 진단');
        else setActiveSubMenu('우리 아이 독서 성향 AI 분석');
        router.replace(`/solution?tab=${newTab}`);
    };
    const [analysisBooks, setAnalysisBooks] = useState<Book[]>([]);
    // States for Reading Analysis
    const [userReadBooks, setUserReadBooks] = useState<BookWithObservation[]>([]);
    const [readingAnalysisResult, setReadingAnalysisResult] = useState('');
    const [readingAnalysisLoading, setReadingAnalysisLoading] = useState(false);

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
            const data = await response.json();
            const item = data.item?.[0];
            if (!item) return null;
            return toBook(item);
        } catch (e) {
            console.error("Failed to fetch book for title:", title, e);
            return null;
        }
    };

    // Load initial recommended books on mount from YES24 API (parallel)
    useEffect(() => {
        let isCancelled = false;
        const loadAnalysisBooks = async () => {
            const bookTitles = [
                "진짜 일학년 책가방을 지켜라!",
                "하늘이 딱딱했대?",
                "왜 먼저 물어보지 않니?"
            ];
            try {
                const results = await Promise.all(bookTitles.map(t => fetchBookByTitle(t)));
                if (!isCancelled) {
                    setAnalysisBooks(results.filter((b): b is Book => b !== null));
                }
            } catch (err) {
                console.warn("Initial analysis books load failed:", err);
            }
        };
        loadAnalysisBooks();
        return () => { isCancelled = true; };
    }, []);

    // Real-time statistics states for child
    const [thisMonthCount, setThisMonthCount] = useState(0);
    const [prevMonthDiffText, setPrevMonthDiffText] = useState("지난달과 동일");
    const [totalReadCount, setTotalReadCount] = useState(0);
    const [readingKingLevelText, setReadingKingLevelText] = useState("독서 초보 Lv.1");
    const [preferredGenres, setPreferredGenres] = useState<Array<{ label: string, pct: string, pctNum: number, dot: string, color: string }>>([]);
    const [monthlyVolumes, setMonthlyVolumes] = useState<{ label: string; count: number; y: number; height: number }[]>([]);
    const [maxVolumeVal, setMaxVolumeVal] = useState(1);
    
    // AI Coach recommendation states
    const [aiCoachCategory, setAiCoachCategory] = useState("자연 · 과학");
    const [aiCoachMent, setAiCoachMent] = useState("다양한 자연 현상과 과학에 흥미를 가질 만한 책을 함께 읽어보세요!");
    const [selectedCoachCategory, setSelectedCoachCategory] = useState<string | null>(null);

    const { user, children, userProfile, isInitialized, loading: authLoading, activeChild: contextActiveChild, selectChild } = useAuth();
    const activeChild = contextActiveChild || (children.length > 0 ? children[0] : null);
    const setActiveChild = (child: Child | null) => selectChild(child);

    const childName = activeChild ? activeChild.name : (userProfile?.nickname ? `${userProfile.nickname} 부모님` : "부모님");

    const categoryGenreMap: Record<string, string> = {
        "자연 · 과학": "1137",
        "과학/자연": "1137",
        "창작 · 문학": "1108",
        "그림책": "1108",
        "역사 · 사회": "1109",
        "역사/인물": "1109",
        "예술 · 체육": "1177",
        "예술/음악": "1177",
        "철학 · 인성": "1132",
        "수학 · 논리": "1175",
    };

    // Helper to map raw category string to standard user genres
    const mapCategoryToGenre = (categoryStr: string) => {
        if (!categoryStr) return '기타';
        if (categoryStr.includes('과학') || categoryStr.includes('자연') || categoryStr.includes('실험')) return '과학/자연';
        if (categoryStr.includes('문학') || categoryStr.includes('동화') || categoryStr.includes('소설') || categoryStr.includes('그림책')) return '그림책';
        if (categoryStr.includes('역사') || categoryStr.includes('사회') || categoryStr.includes('인물') || categoryStr.includes('위인')) return '역사/인물';
        if (categoryStr.includes('철학') || categoryStr.includes('인성') || categoryStr.includes('종교')) return '철학 · 인성';
        if (categoryStr.includes('예술') || categoryStr.includes('체육') || categoryStr.includes('음악') || categoryStr.includes('미술')) return '예술/음악';
        if (categoryStr.includes('수학') || categoryStr.includes('논리') || categoryStr.includes('숫자')) return '수학 · 논리';
        return '기타';
    };

    // Load custom recommended books on demand
    const loadAnalysisBooks = async (categoryId: string = "1108", query: string = "추천도서") => {
        try {
            const age = activeChild?.age || 0;
            const childType = activeChild?.type || "";
            
            // Age-based category and search refinement
            let effectiveCategoryId = categoryId;
            if (categoryId === "1108" && (age < 7 || childType === '유아')) {
                effectiveCategoryId = "13789"; // 유아 카테고리
            }
            
            let effectiveQuery = query;
            if (query === "추천도서" || query === "베스트셀러") {
                if (age < 7 || childType === '유아') {
                    effectiveQuery = "유아 그림책";
                } else if (age <= 10 || childType === '초등저학년') {
                    effectiveQuery = "초등 저학년 추천도서";
                } else {
                    effectiveQuery = "초등 고학년 추천도서";
                }
            }

            const response = await safeFetch(
                `${supabaseUrl}/functions/v1/recommendations?query=${encodeURIComponent(effectiveQuery)}&categoryId=${effectiveCategoryId}&sort=SalesPoint&apiType=ItemSearch`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': supabaseAnonKey,
                        'Authorization': `Bearer ${supabaseAnonKey}`
                    }
                }
            );
            if (response.ok) {
                const data = await response.json();
                const items = data.item?.slice(0, 5) || [];
                const parsed = items.map(toBook);
                setAnalysisBooks(parsed);
            }
        } catch (e) {
            console.error("Failed to load curated books", e);
        }
    };

    // Fetch AI Coach recommendation category based on actual books
    const fetchAICoachRecommendation = async (books: BookWithObservation[]) => {
        const age = activeChild?.age || 0;
        const childType = activeChild?.type || "";

        // Age-specific curated recommendation pools for dynamic fallback
        const toddlerPool = [
            { cat: "그림책", ment: "다채로운 색감과 따뜻한 이야기가 담긴 그림책으로 상상력을 키워주세요!" },
            { cat: "과학/자연", ment: "주변 동식물과 자연 현상에 대한 호기심을 자극하는 자연관찰 책을 추천해요!" },
            { cat: "철학 · 인성", ment: "마음을 표현하고 친구와 사이좋게 지내는 따뜻한 생활동화를 읽어보세요!" },
            { cat: "예술/음악", ment: "리듬감 있는 말놀이와 음악·미술 감각을 깨우는 책을 함께 읽어보세요!" }
        ];

        const lowerElemPool = [
            { cat: "과학/자연", ment: "원리를 스스로 탐구하고 발견하는 재미를 느낄 수 있는 과학책을 추천해요!" },
            { cat: "창작 · 문학", ment: "스스로 긴 줄글을 읽는 성취감을 느낄 수 있는 저학년 창작동화를 시도해보세요!" },
            { cat: "역사/인물", ment: "멋진 인물들의 이야기와 역사의 흥미로운 장면을 들려주세요!" },
            { cat: "수학 · 논리", ment: "재미있는 이야기 속에 수학적 사고력이 쏙쏙 녹아있는 책을 추천해요!" }
        ];

        const upperElemPool = [
            { cat: "역사/인물", ment: "한국사와 세계사의 큰 흐름을 이해하고 통찰력을 기를 수 있는 인물책을 추천해요!" },
            { cat: "과학/자연", ment: "교과와 연계된 흥미진진한 과학 탐구 도서로 깊이 있는 지식을 넓혀주세요!" },
            { cat: "철학 · 인성", ment: "스스로 생각하는 힘과 올바른 가치관을 길러주는 어린이 인문철학 도서를 추천해요!" },
            { cat: "수학 · 논리", ment: "논리적 사고와 문제 해결력을 키워주는 스토리텔링 수학 도서를 추천해요!" }
        ];

        const pool = (age < 7 || childType === '유아') ? toddlerPool : (age <= 10 || childType === '초등저학년') ? lowerElemPool : upperElemPool;

        if (!books || books.length === 0) {
            const randomIndex = Math.floor(Math.random() * pool.length);
            const randomItem = pool[randomIndex] || pool[0];
            if (randomItem) {
                setAiCoachCategory(randomItem.cat);
                setAiCoachMent(randomItem.ment);
            }
            return;
        }

        try {
            const bookInfoText = books.slice(0, 5).map(b => `- ${b.title} (${b.category || '미분류'})`).join('\n');
            const prompt = `
            자녀(${childName}, 만 ${age}세)가 최근에 읽은 다음 책 목록을 분석하여, 이 아이에게 딱 맞게 독서 편식을 방지하거나 흥미를 넓혀줄 수 있는 추천 '단 하나의 핵심 카테고리 분야'와 부모에게 격려를 보내는 코칭 메시지를 아래 JSON 포맷으로 작성해주세요.
            
            [최근 읽은 책 목록]
            ${bookInfoText}

            [선택할 수 있는 추천 카테고리 후보]
            - '그림책', '과학/자연', '역사/인물', '철학 · 인성', '예술/음악', '수학 · 논리', '창작 · 문학' 중 정확히 한 개만 선택해야 합니다.

            응답은 반드시 마크다운 코드 블록 없이 순수 JSON만 반환해야 합니다:
            {
              "recommendedCategory": "선택한 카테고리 명칭",
              "coachingMent": "부모님께 드리는 다정하고 구체적인 코칭 한 문장 (100자 이내)"
            }
            `;

            const response = await safeFetch(`${supabaseUrl}/functions/v1/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseAnonKey
                },
                body: JSON.stringify({ prompt, mode: 'expert' })
            });

            if (response.ok) {
                const data = await response.json();
                const rawContent = data.result?.content || (typeof data.result === 'string' ? data.result : '');
                if (rawContent) {
                    const cleanJson = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
                    const recommendation = JSON.parse(cleanJson);
                    if (recommendation.recommendedCategory) {
                        setAiCoachCategory(recommendation.recommendedCategory);
                    }
                    if (recommendation.coachingMent) {
                        setAiCoachMent(recommendation.coachingMent);
                    }
                    return;
                }
            }
        } catch (e) {
            console.warn("Failed to fetch AI coach suggestions, using dynamic pool fallback", e);
        }

        // Fallback
        const randomIndex = Math.floor(Math.random() * pool.length);
        const randomItem = pool[randomIndex] || pool[0];
        if (randomItem) {
            setAiCoachCategory(randomItem.cat);
            setAiCoachMent(randomItem.ment);
        }
    };

    // Active child synchronization is globally managed in AuthContext

    // Fetch read books only when user or active child changes
    useEffect(() => {
        if (isInitialized && user) {
            fetchUserReadBooks();
        }
    }, [isInitialized, user?.id, activeChild?.id]);

    const fetchUserReadBooks = async () => {
        if (!user) return;

        // If no registered child, initialize default stats
        if (!activeChild) {
            setUserReadBooks([]);
            setThisMonthCount(0);
            setTotalReadCount(0);
            setPreferredGenres([
                { label: "그림책", pct: "100%", pctNum: 100, dot: "bg-[#7C4DFF]", color: "#7C4DFF" }
            ]);
            return;
        }

        try {
            const { data: readBooksData, error } = await supabase
                .from('read_books')
                .select('book_id, read_date, observation_data, books(*)')
                .eq('child_id', activeChild.id)
                .order('read_date', { ascending: false });

            if (error) {
                console.error("Error fetching read books:", error);
                return;
            }

            if (readBooksData) {
                // Map books and attach their specific observation
                const booksWithObs = readBooksData.map((r: SupabaseReadBook) => {
                    const bookData = Array.isArray(r.books) ? r.books[0] : r.books;
                    if (!bookData) {
                        // Fallback if books join returns null
                        return {
                            id: r.book_id,
                            bookid: r.book_id,
                            title: (r.observation_data as { book_title?: string } | null)?.book_title || '기록된 도서',
                            author: '저자 미상',
                            category: '기타',
                            imgsrc: '',
                            _observation: r.observation_data
                        } as BookWithObservation;
                    }
                    const mapped: BookWithObservation = {
                        ...bookData,
                        _observation: r.observation_data
                    };
                    return mapped;
                });

            // Deduplicate (Keep most recent if duplicate)
            const uniqueBooks = Array.from(new Map(booksWithObs.map((b) => [b.id, b])).values());
            setUserReadBooks(uniqueBooks);

            // 1. Calculate Monthly read count
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth();

            const thisMonthBooks = readBooksData.map((r: SupabaseReadBook) => r).filter((r: SupabaseReadBook) => {
                if (!r.read_date) return false;
                const d = new Date(r.read_date);
                return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
            });

            const lastMonthBooks = readBooksData.map((r: SupabaseReadBook) => r).filter((r: SupabaseReadBook) => {
                if (!r.read_date) return false;
                const d = new Date(r.read_date);
                let targetYear = currentYear;
                let targetMonth = currentMonth - 1;
                if (targetMonth < 0) {
                    targetMonth = 11;
                    targetYear -= 1;
                }
                return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
            });

            const thisCount = thisMonthBooks.length;
            const lastCount = lastMonthBooks.length;
            const diff = thisCount - lastCount;

            setThisMonthCount(thisCount);
            setTotalReadCount(readBooksData.length);

            if (diff > 0) {
                setPrevMonthDiffText(`▲ 지난달보다 +${diff}권`);
            } else if (diff < 0) {
                setPrevMonthDiffText(`▼ 지난달보다 ${diff}권`);
            } else {
                setPrevMonthDiffText("지난달과 동일");
            }

            // 2. Reading King Level
            const totalCount = readBooksData.length;
            if (totalCount <= 5) setReadingKingLevelText("독서 초보 Lv.1");
            else if (totalCount <= 15) setReadingKingLevelText("독서 새싹 Lv.2");
            else if (totalCount <= 30) setReadingKingLevelText("독서가 Lv.3");
            else if (totalCount <= 50) setReadingKingLevelText("독서왕 Lv.4");
            else setReadingKingLevelText("대독서가 Lv.5");

            // 3. Preferred Genres calculation
            const genreCounts: Record<string, number> = {};
            readBooksData.forEach((r: SupabaseReadBook) => {
                const bookData = Array.isArray(r.books) ? r.books[0] : r.books;
                if (bookData) {
                    const genre = mapCategoryToGenre(bookData.category);
                    genreCounts[genre] = (genreCounts[genre] || 0) + 1;
                }
            });

            const totalBooksCount = Object.values(genreCounts).reduce((a, b) => a + b, 0);
            
            const genreDots: Record<string, { dot: string; color: string }> = {
                '그림책': { dot: 'bg-[#7C4DFF]', color: '#7C4DFF' },
                '과학/자연': { dot: 'bg-[#00E5FF]', color: '#00E5FF' },
                '역사/인물': { dot: 'bg-[#651FFF]', color: '#651FFF' },
                '철학 · 인성': { dot: 'bg-[#00E676]', color: '#00E676' },
                '예술/음악': { dot: 'bg-[#FF9100]', color: '#FF9100' },
                '수학 · 논리': { dot: 'bg-[#E040FB]', color: '#E040FB' },
                '기타': { dot: 'bg-[#9E9E9E]', color: '#9E9E9E' }
            };

            const sortedGenres = Object.entries(genreCounts)
                .map(([label, value]) => {
                    const pctVal = totalBooksCount > 0 ? (value / totalBooksCount) * 100 : 0;
                    return {
                        label,
                        value,
                        pct: `${Math.round(pctVal)}%`,
                        pctNum: pctVal,
                        dot: genreDots[label]?.dot || 'bg-[#9E9E9E]',
                        color: genreDots[label]?.color || '#9E9E9E'
                    };
                })
                .sort((a, b) => b.value - a.value);

            setPreferredGenres(sortedGenres.length > 0 ? sortedGenres.slice(0, 4) : [
                { label: "그림책", pct: "100%", pctNum: 100, dot: "bg-[#7C4DFF]", color: "#7C4DFF" }
            ]);

            // 4. Monthly reading volume
            const getRecent6Months = () => {
                const list = [];
                const dNow = new Date();
                for (let i = 5; i >= 0; i--) {
                    const d = new Date(dNow.getFullYear(), dNow.getMonth() - i, 1);
                    list.push({
                        year: d.getFullYear(),
                        month: d.getMonth(),
                        label: `${d.getMonth() + 1}월`,
                        count: 0
                    });
                }
                return list;
            };

            const monthsData = getRecent6Months();
            readBooksData.forEach((r: SupabaseReadBook) => {
                if (!r.read_date) return;
                const d = new Date(r.read_date);
                const y = d.getFullYear();
                const m = d.getMonth();
                const match = monthsData.find(item => item.year === y && item.month === m);
                if (match) {
                    match.count += 1;
                }
            });

            const maxCount = Math.max(...monthsData.map(m => m.count), 1);
            setMaxVolumeVal(maxCount);

            const calculatedVolumes = monthsData.map((m) => {
                const height = (m.count / maxCount) * 70;
                return {
                    label: m.label,
                    count: m.count,
                    height,
                    y: 80 - height
                };
            });
            setMonthlyVolumes(calculatedVolumes);

            // 5. Query LLM for Coach recommendation
            fetchAICoachRecommendation(uniqueBooks);

            // 6. Load initial books based on child's top preferred genre
            const topGenre = sortedGenres.length > 0 ? sortedGenres[0].label : "그림책";
            const topCatId = categoryGenreMap[topGenre] || "1108";
            loadAnalysisBooks(topCatId, topGenre);
        }
        } catch (err) {
            console.error("fetchUserReadBooks error:", err);
        }
    };

    // When coach category or selected coach switches, reload curated list
    useEffect(() => {
        if (selectedCoachCategory) {
            const catId = categoryGenreMap[selectedCoachCategory] || "1108";
            loadAnalysisBooks(catId, selectedCoachCategory);
        }
    }, [selectedCoachCategory]);

    const [chartData, setChartData] = useState<{ subject: string; A: number; fullMark: number; }[]>([]);
    const [aiKeywords, setAiKeywords] = useState<string[]>([]);

    const getReadingAnalysis = async (observations?: Record<string, string>) => {
        if (userReadBooks.length === 0) return;
        setReadingAnalysisLoading(true);
        setReadingAnalysisResult('');
        setChartData([]);
        setAiKeywords([]);

        try {
            // STEP 1: Enrich Book Data (Phase 2 - Data Enrichment)
            // Fetch details for up to 5 most recent books to avoid API overload/timeout
            const recentBooks = userReadBooks.slice(0, 5);
            const enrichedBooks = await Promise.all(recentBooks.map(async (book: BookWithObservation) => {
                try {
                    const response = await safeFetch(
                        `${supabaseUrl}/functions/v1/recommendations?itemId=${book.bookid}&apiType=ItemLookUp`,
                        {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                                'apikey': supabaseAnonKey,
                                'Authorization': `Bearer ${supabaseAnonKey}`
                            }
                        }
                    );
                    if (!response.ok) return book;
                    const details = await response.json();
                    if (!details) return book;
                    return { ...book, description: details.description, toc: details.toc };
                } catch (e) {
                    console.error("Failed to fetch details for", book.title);
                    return book;
                }
            }));

            const bookListText = enrichedBooks.map((book: BookWithObservation) => {
                let info = `- 제목: **${book.title}** (저자: ${book.author})`;

                // Add Historical Observation if exists (Phase 3)
                if (book._observation && Object.keys(book._observation).length > 0) {
                    info += `\n   > **부모 관찰 기록**: `;
                    const obs = book._observation;
                    const parts = [];
                    if (obs.fluency) parts.push(`유창성: ${obs.fluency}`);
                    if (obs.independence) parts.push(`독립독서: ${obs.independence}`);
                    if (obs.interest) parts.push(`흥미: ${obs.interest}`);
                    if (obs.decoding) parts.push(`해독: ${obs.decoding}`);
                    if (obs.critical) parts.push(`질문: ${obs.critical}`);
                    info += parts.join(', ');
                }

                // Simplified Description & TOC handling to fit prompt limits
                if (book.description && book.description.length > 20) {
                    info += `\n   > 줄거리: ${book.description.substring(0, 100)}...`;
                }
                if (book.toc && book.toc.length > 20) {
                    info += `\n   > 목차(일부): ${book.toc.substring(0, 100)}...`;
                }
                return info;
            }).join('\n\n');
            const age = activeChild?.age || 0;

            // Phase Definition based on Planning Report
            let phaseInfo = "";
            let focusPoint = "";

            if (age < 5) {
                phaseInfo = "발현기 전 독서 (Pre-reading)";
                focusPoint = "청각적 자극, 그림과 글자의 연결, 상호작용";
            } else if (age >= 5 && age < 7) {
                phaseInfo = "초기 독서 (Early Reading)";
                focusPoint = "해독(Decoding), 파닉스, 글자에 대한 흥미";
            } else if (age >= 7 && age < 9) {
                phaseInfo = "전환기 독서 (Transitional Reading)";
                focusPoint = "**가장 중요한 시기**입니다. '읽는 법을 배우는' 단계에서 '지식을 얻기 위해 읽는' 단계로 넘어가는 변곡점입니다. 읽기 유창성(Fluency)과 지구력이 핵심입니다.";
            } else if (age >= 9 && age < 12) {
                phaseInfo = "중간 독서 (Intermediate Reading)";
                focusPoint = "비판적 사고, 추론, 다양한 장르의 소화";
            } else {
                phaseInfo = "고등 독서 (Advanced Reading)";
                focusPoint = "분석적 사고, 복합 텍스트 이해, 자아 성찰";
            }

            // Format Observations
            let observationText = "";
            if (observations && Object.keys(observations).length > 0) {
                observationText = `\n[부모님 관찰 기록 (중요)]\n`;
                if (observations.fluency) observationText += `- 읽기 유창성 관찰: "${observations.fluency}"\n`;
                if (observations.independence) observationText += `- 독립 독서 여부: "${observations.independence}"\n`;
                if (observations.decoding) observationText += `- 글자 해독 능력: "${observations.decoding}"\n`;
                if (observations.interest) observationText += `- 흥미 반응: "${observations.interest}"\n`;
                if (observations.critical) observationText += `- 비판적 질문: "${observations.critical}"\n`;
                for (const [key, val] of Object.entries(observations)) {
                    if (!['fluency', 'independence', 'decoding', 'interest', 'critical'].includes(key)) {
                        observationText += `- 기타 관찰(${key}): "${val}"\n`;
                    }
                }
            }

            const prompt = `
        당신은 아동 발달 심리 및 독서 교육 최고 전문가입니다.
        현재 분석 대상 아동은 **만 ${age}세**이며, 독서 발달 단계상 **'${phaseInfo}'**에 해당합니다.
        이 시기의 핵심 발달 과업은 **'${focusPoint}'**입니다.
 
        **중요: 분석을 위한 데이터가 ${userReadBooks.length}권 제공되었습니다.**
        ${userReadBooks.length < 3 ? `
        !!! 데이터 부족 경고 !!!
        제공된 책 데이터가 3권 미만으로 매우 부족합니다. 
        이 경우, 무리하게 아이의 성향을 단정 짓거나 "상상력이 풍부하다"는 등의 구체적인 평가를 내리지 마세요.
        대신 "아직 읽은 책이 적어 정확한 성향을 파악하기 어렵습니다. 앞으로 꾸준히 기록을 남겨주시면 더 정확한 분석이 가능합니다."라는 톤으로 작성해주세요.
        ` : ''}

        다음 정보를 종합하여 초개인화된 정밀 독서 성향을 분석해주세요. (SAV 알고리즘 기반)

        1. **최근 읽은 책 상세 분석 (최대 5권)**:
           *참고: 책의 줄거리와 목차, 그리고 [부모 관찰 기록]을 바탕으로 "이 아이가 이 책을 어떻게 소화했는지" 판단해주세요.*
        ${bookListText}

        2. **분석 요청 종합 의견**:
        ${observationText || "(부모님의 추가 관찰 기록이 없습니다. 책 제목과 내용만으로 분석해야 합니다.)"}

        ---
        **분석 가이드라인 (엄격 준수)**:
        1. **사실에 기반한 분석**: "아이가 재미있어했다", "집중했다" 등의 내용은 부모 관찰 기록에 명시된 경우에만 언급하세요. 기록이 없다면 추측하지 마세요.
        2. **데이터 부족 시 솔직함**: 데이터가 부족하면 "현재 기록된 책으로는 이 분야의 발달 정도를 알기 어렵습니다"라고 명시하세요. 지어내지 마세요.
        3. **SAV(적정 연령 가치) 진단**: 아이가 읽은 책의 난이도와 주제가 현재 나이(${age}세)에 적절한지 객관적으로 평가해주세요.
        4. **맞춤형 확장 독서 제안**: 현재 아이가 관심을 보이는 주제(과학, 창작 등)가 있다면, 그와 관련된 구체적인 다음 단계의 책을 추천해주세요.

        **중요:** 응답은 반드시 유효한 JSON 형식이어야 합니다. Markdown 코드 블록 없이 순수 JSON만 반환하세요.
        
        **summary 필드 작성 가이드**:
        - 따뜻하고 전문적인 어조("~해요", "~입니다")를 사용하되, **과도한 칭찬보다는 객관적인 코칭** 위주로 작성하세요.
        - 핵심 단어는 **굵게** 표시하세요.
        - 분석 내용은 글머리 기호 등을 사용하여 가독성 있게 구조화하세요.
        
        JSON 구조:
        {
          "summary": "마크다운 포맷의 상세 분석 리포트",
          "scores": [
             { "subject": "어휘력", "A": 수치(0-100), "fullMark": 100 },
             { "subject": "이해력", "A": 수치(0-100), "fullMark": 100 },
             { "subject": "상상력", "A": 수치(0-100), "fullMark": 100 },
             { "subject": "탐구심", "A": 수치(0-100), "fullMark": 100 },
             { "subject": "독서습관", "A": 수치(0-100), "fullMark": 100 }
          ],
          "recommendationKeywords": ["키워드1", "키워드2", "키워드3"]
        }
      `;

            const response = await safeFetch(`${supabaseUrl}/functions/v1/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseAnonKey
                },
                body: JSON.stringify({ prompt, mode: 'expert' })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            let resultData;
            try {
                const cleanJson = data.result.content.replace(/```json/g, '').replace(/```/g, '').trim();
                resultData = JSON.parse(cleanJson);
            } catch (e) {
                console.error("JSON Parse Error:", e);
                setReadingAnalysisResult(data.result);
                return;
            }

            setReadingAnalysisResult(resultData.summary);
            if (resultData.scores) setChartData(resultData.scores);
            if (resultData.recommendationKeywords) setAiKeywords(resultData.recommendationKeywords);

        } catch (error) {
            console.error(error);
            setReadingAnalysisResult("오류가 발생했습니다.");
        } finally {
            setReadingAnalysisLoading(false);
        }
    };

    const handleSearch = () => {
        if (searchQuery.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
        }
    };

    const handleConsultWithAssessment = (assessment: LiteracyAssessment) => {
        const consultPrompt = `최근 문해력 진단(${assessment.grade_label || ''})에서 종합 ${assessment.total_bli_score}점(${assessment.bli_tier}, 읽기 속도 분당 ${assessment.effective_wpm}어절)이 나왔고, 특히 '${assessment.weakest_area_label || assessment.weakest_area}' 영역이 상대적으로 부족하다고 나왔어요. 가정에서 어떻게 독서 지도를 해주면 좋을까요?`;
        try {
            sessionStorage.setItem('bookok_consult_prefill', consultPrompt);
        } catch {
            // 저장소를 쓸 수 없어도 AI 사서로는 이동한다
        }
        router.push('/chat?mode=consult');
    };

    const dummySetView = () => { };

    return (
        <div className="min-h-screen bg-[#F8F9FA] text-gray-900 font-sans pb-24 lg:pb-0">
            {/* Desktop View Header & Main Layout */}
            <div className="hidden lg:block">
                <Header
                    view="main"
                    setView={dummySetView}
                    activeMenu={activeMenu}
                    setActiveMenu={setActiveMenu}
                    setActiveSubMenu={(sub) => {
                        setActiveSubMenu(sub);
                        if (sub === 'AI 문해력 진단') router.replace('/solution?tab=literacy');
                        else router.replace('/solution?tab=analysis');
                    }}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    handleSearch={handleSearch}
                    activeSubMenu={activeSubMenu}
                />

                <div className="max-w-7xl mx-auto px-6 py-10 flex gap-8">
                    <Sidebar
                        activeChild={activeChild}
                        activeMenu={activeMenu}
                        activeSubMenu={activeSubMenu}
                        setActiveSubMenu={(sub) => {
                            setActiveSubMenu(sub);
                            if (sub === 'AI 문해력 진단') router.replace('/solution?tab=literacy');
                                else router.replace('/solution?tab=analysis');
                        }}
                        setActiveChild={setActiveChild}
                    />

                    <div className="flex-1 min-w-0">
                        {activeSubMenu === 'AI 문해력 진단' ? (
                            <LiteracyDashboardWidget
                                activeChild={activeChild}
                                onConsultWithAssessment={handleConsultWithAssessment}
                            />
                        ) : (
                            <div className="space-y-6">
                                {/* Quick Banner to AI Literacy Test */}
                                <div
                                    onClick={() => {
                                        setActiveSubMenu('AI 문해력 진단');
                                        router.replace('/solution?tab=literacy');
                                    }}
                                    className="bg-linear-to-r from-[#2E5A44] to-[#1E3F2F] text-white rounded-[28px] p-6 flex items-center justify-between cursor-pointer shadow-md hover:shadow-lg transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                                            <BrainCircuit size={24} className="text-[#FACC15]" />
                                        </div>
                                        <div>
                                            <span className="text-[11px] font-black text-emerald-200 uppercase tracking-wider">
                                                NEW · 문해력 점검
                                            </span>
                                            <h3 className="text-lg font-black text-white mt-0.5">
                                                우리 아이 문해력 3분 점검 & 함께 읽을 책 추천받기
                                            </h3>
                                        </div>
                                    </div>
                                    <span className="bg-[#16A34A] text-white text-xs font-black px-4 py-2.5 rounded-full flex items-center gap-1 shrink-0">
                                        진단하러 가기 <ChevronRight size={15} />
                                    </span>
                                </div>

                                <ReadingAnalysis
                                    activeChild={activeChild}
                                    userReadBooks={userReadBooks}
                                    getReadingAnalysis={getReadingAnalysis}
                                    loading={readingAnalysisLoading}
                                    result={readingAnalysisResult}
                                    chartData={chartData}
                                    keywords={aiKeywords}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ============================================================== */}
            {/* Mobile / Hybrid App View (lg:hidden) */}
            {/* ============================================================== */}
            <div 
                className="lg:hidden flex flex-col bg-[#F8F9FA] overflow-hidden"
                style={{ height: viewportHeight }}
            >
                {/* Mobile Top Header (Shared from Home screen layout) */}
                <header className="bg-white border-b border-gray-100 px-4 pb-3.5 flex items-center justify-between sticky top-0 z-40 shrink-0 pt-[calc(0.875rem+env(safe-area-inset-top,0px))]">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <div className="relative w-8 h-8 bg-white border border-gray-100 rounded-xl p-1.5 flex items-center justify-center shadow-sm">
                            <div className="relative w-full h-full">
                                <Image
                                    src="/images/logo_transparent_v2.png"
                                    alt="Book,ok Logo"
                                    fill
                                    className="object-contain"
                                    sizes="28px"
                                />
                            </div>
                        </div>
                        <span className="text-[17px] font-extrabold tracking-tight text-[#101828]">Book,ok</span>
                    </div>

                    <div className="flex items-center gap-2.5">
                        {user ? (
                            <button 
                                onClick={() => router.push('/mypage')}
                                className="bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/20 rounded-full px-3 py-1 text-[11px] font-black tracking-tight hover:bg-[#16A34A]/20 transition-colors"
                            >
                                프로필
                            </button>
                        ) : (
                            <button 
                                onClick={openLoginModal}
                                className="bg-black text-white rounded-full px-3 py-1 text-[11px] font-black tracking-tight hover:bg-gray-800 transition-colors"
                            >
                                로그인
                            </button>
                        )}
                    </div>
                </header>

                {/* Mobile Tab Control (2 Tabs: 성향 분석 | 문해력 진단) — 독서 솔루션은 AI 사서로 이동 */}
                <div className="bg-white border-b border-gray-100 flex sticky top-[calc(53px+env(safe-area-inset-top,0px))] z-40 shrink-0">
                    <button
                        onClick={() => handleTabChange('analysis')}
                        className={`flex-1 py-3.5 text-center font-extrabold text-[14px] border-b-2 transition-all ${
                            mobileTab === 'analysis'
                                ? 'border-[#16A34A] text-[#1A1A1A]'
                                : 'border-transparent text-gray-400 font-bold'
                        }`}
                    >
                        성향 분석
                    </button>
                    <button
                        onClick={() => handleTabChange('literacy')}
                        className={`flex-1 py-3.5 text-center font-extrabold text-[14px] border-b-2 transition-all flex items-center justify-center gap-1 ${
                            mobileTab === 'literacy'
                                ? 'border-[#16A34A] text-[#16A34A]'
                                : 'border-transparent text-gray-400 font-bold'
                        }`}
                    >
                        <span>문해력 점검</span>
                    </button>
                </div>

                {/* Mobile Tab Content */}
                <div className="flex-1 overflow-hidden">
                    {mobileTab === 'literacy' ? (
                        /* ================= LITERACY DIAGNOSIS TAB ================= */
                        <div className="h-full overflow-y-auto p-4 pb-28">
                            <LiteracyDashboardWidget
                                activeChild={activeChild}
                                onConsultWithAssessment={handleConsultWithAssessment}
                            />
                        </div>
                    ) : mobileTab === 'analysis' ? (
                        /* ================= ANALYSIS TAB ================= */
                        <div className="h-full overflow-y-auto p-4 space-y-4 pb-28">
                            {/* 다자녀 선택 칩 */}
                            {children.length > 1 && (
                                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                    {children.map(c => (
                                        <button
                                            key={c.id}
                                            onClick={() => selectChild(c)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                                                activeChild?.id === c.id
                                                    ? "bg-[#2E5A44] text-white shadow-xs"
                                                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                                            }`}
                                        >
                                            {c.name} ({c.age}세)
                                        </button>
                                    ))}
                                </div>
                            )}
                            {/* AI 문해력 진단(BLI) 런처 배너 */}
                            <div
                                onClick={() => handleTabChange('literacy')}
                                className="bg-linear-to-r from-[#2E5A44] to-[#1E3F2F] text-white rounded-[28px] p-4 flex items-center justify-between gap-3 shadow-sm cursor-pointer active:scale-[0.99] transition-transform"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                                        <BrainCircuit size={20} className="text-[#FACC15]" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black text-emerald-200 block">
                                            문해력 점검
                                        </span>
                                        <span className="text-[13px] font-extrabold text-white block tracking-tight">
                                            3분 지문 읽기로 영역별 결과와 추천 도서 확인
                                        </span>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-emerald-200 shrink-0" />
                            </div>

                            {/* Top Grid: Read books stats */}
                            <div className="grid grid-cols-2 gap-3">
                                {/* Current Month Read Books */}
                                <div className="bg-[#E8F5E9]/30 border border-green-100 rounded-[28px] p-5 flex flex-col justify-between h-[128px]">
                                    <span className="text-[12px] font-bold text-gray-500">이번 달 읽은 책</span>
                                    <div className="flex items-baseline gap-1 my-1">
                                        <span className="text-3xl font-black text-gray-900">{thisMonthCount}</span>
                                        <span className="text-sm font-black text-gray-700">권</span>
                                    </div>
                                    <span className="text-[11px] font-extrabold text-[#16A34A]">{prevMonthDiffText}</span>
                                </div>

                                {/* Total Read Books */}
                                <div className="bg-white border border-gray-100 rounded-[28px] p-5 flex flex-col justify-between h-[128px] shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
                                    <span className="text-[12px] font-bold text-gray-500">누적 독서량</span>
                                    <div className="flex items-baseline gap-1 my-1">
                                        <span className="text-3xl font-black text-gray-900">{totalReadCount}</span>
                                        <span className="text-sm font-black text-gray-700">권</span>
                                    </div>
                                    <div className="self-start bg-[#FACC15]/20 text-[#D97706] text-[10px] font-black px-2.5 py-0.5 rounded-full">
                                        {readingKingLevelText}
                                    </div>
                                </div>
                            </div>

                            {/* Preferred Topics Card */}
                            <div className="bg-white border border-gray-100 rounded-[32px] p-5 shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
                                <h3 className="font-extrabold text-base mb-4 tracking-tight">선호 독서 주제</h3>
                                <div className="flex items-center justify-between gap-4">
                                    {/* Categories list */}
                                    <div className="space-y-3.5 flex-1">
                                        {preferredGenres.length > 0 ? (
                                            preferredGenres.map((cat, idx) => (
                                                <div key={idx} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-2.5 h-2.5 rounded-full ${cat.dot}`} />
                                                        <span className="text-xs font-bold text-gray-400">{cat.label}</span>
                                                    </div>
                                                    <span className="text-xs font-black text-gray-900">{cat.pct}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-xs font-bold text-gray-400 py-4 text-center">선호 장르 분석을 위해 책을 더 읽어보세요!</div>
                                        )}
                                    </div>
                                    
                                    {/* Custom SVG Donut Chart */}
                                    <div className="relative w-[130px] h-[130px] flex items-center justify-center shrink-0">
                                        <svg width="130" height="130" viewBox="0 0 100 100" className="transform -rotate-90">
                                            {preferredGenres.length > 0 ? (
                                                (() => {
                                                    let accumulatedPct = 0;
                                                    return preferredGenres.map((cat, idx) => {
                                                        const pctNum = cat.pctNum || 0;
                                                        const strokeDasharray = `${((pctNum / 100) * 251.2).toFixed(1)} 251.2`;
                                                        const strokeDashoffset = (- (accumulatedPct / 100) * 251.2).toFixed(1);
                                                        accumulatedPct += pctNum;
                                                        return (
                                                            <circle 
                                                                key={idx}
                                                                cx="50" 
                                                                cy="50" 
                                                                r="40" 
                                                                fill="transparent" 
                                                                stroke={cat.color} 
                                                                strokeWidth="12" 
                                                                strokeDasharray={strokeDasharray} 
                                                                strokeDashoffset={strokeDashoffset} 
                                                            />
                                                        );
                                                    });
                                                })()
                                            ) : (
                                                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#E5E7EB" strokeWidth="12" strokeDasharray="251.2 251.2" strokeDashoffset="0" />
                                            )}
                                            <circle cx="50" cy="50" r="28" fill="white" />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                            <span className="text-[12px] font-black text-[#16A34A] leading-tight">{new Date().getMonth() + 1}월</span>
                                            <span className="text-[9px] font-bold text-gray-400 tracking-tighter leading-none">독서 리포트</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Monthly Reading Volume Card */}
                            <div className="bg-white border border-gray-100 rounded-[32px] p-5 shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
                                <h3 className="font-extrabold text-base mb-4 tracking-tight">월별 독서량</h3>
                                
                                {/* Custom SVG Bar/Line Chart */}
                                <div className="w-full relative h-[90px] mb-3">
                                    {monthlyVolumes.length > 0 ? (
                                        <svg width="100%" height="80" viewBox="0 0 288 80" className="overflow-visible w-full h-full">
                                            <line x1="0" y1="79" x2="288" y2="79" stroke="#F3F4F6" strokeWidth="1" strokeDasharray="3 3" />
                                            <line x1="0" y1="40" x2="288" y2="40" stroke="#F3F4F6" strokeWidth="1" strokeDasharray="3 3" />
                                            
                                            {/* Bars */}
                                            {monthlyVolumes.map((item, idx) => {
                                                const barWidth = 16;
                                                const barGap = 32;
                                                const xStart = 20;
                                                const x = xStart + (idx * (barWidth + barGap));
                                                return (
                                                    <rect 
                                                        key={idx} 
                                                        x={x} 
                                                        y={item.y} 
                                                        width={barWidth} 
                                                        height={item.height} 
                                                        rx="4" 
                                                        fill={idx === 5 ? "#16A34A" : "#374151"} 
                                                    />
                                                );
                                            })}
                                            
                                            {/* Polyline */}
                                            {(() => {
                                                const barWidth = 16;
                                                const barGap = 32;
                                                const xStart = 20;
                                                const pointsStr = monthlyVolumes.map((item, idx) => {
                                                    const cx = xStart + (idx * (barWidth + barGap)) + (barWidth / 2);
                                                    return `${cx},${item.y}`;
                                                }).join(' ');
                                                return <polyline fill="none" stroke="#86EFAC" strokeWidth="2.5" points={pointsStr} />;
                                            })()}
                                            
                                            {/* Line dots */}
                                            {monthlyVolumes.map((item, idx) => {
                                                const barWidth = 16;
                                                const barGap = 32;
                                                const xStart = 20;
                                                const cx = xStart + (idx * (barWidth + barGap)) + (barWidth / 2);
                                                return (
                                                    <circle 
                                                        key={idx}
                                                        cx={cx} 
                                                        cy={item.y} 
                                                        r="3.5" 
                                                        fill="white" 
                                                        stroke={idx === 5 ? "#16A34A" : "#86EFAC"} 
                                                        strokeWidth="2.5" 
                                                    />
                                                );
                                            })}
                                        </svg>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-xs font-bold text-gray-400">최근 독서 추이 데이터가 생성 중입니다.</div>
                                    )}
                                </div>
                                
                                {/* Months labels */}
                                <div className="flex justify-between items-center px-2 text-[10px] font-bold text-gray-400">
                                    {monthlyVolumes.map((m, idx) => (
                                        <span key={idx} className={idx === 5 ? "text-[#16A34A] font-black" : ""}>
                                            {m.label}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* AI 독서코치 고정 알림 배너 */}
                            <div 
                                onClick={() => setSelectedCoachCategory(aiCoachCategory)}
                                className="bg-white border border-gray-100 rounded-[28px] p-4 flex items-center gap-3.5 shadow-[0_4px_12px_rgba(0,0,0,0.02)] cursor-pointer hover:bg-gray-50 active:scale-[0.99] transition-all"
                            >
                                <div className="bg-[#16A34A]/10 text-[#16A34A] w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                                    <Sparkles size={18} className="fill-current" />
                                </div>
                                <div className="flex-1">
                                    <div className="text-[10px] font-black text-[#16A34A] tracking-wider leading-none uppercase">AI 독서코치</div>
                                    <div className="text-[13px] font-bold text-gray-800 mt-1 block tracking-tight">
                                        &quot;{aiCoachCategory}&quot; 분야를 시도해보면 어떨까요?
                                    </div>
                                    <div className="text-[11px] text-gray-400 mt-0.5">{aiCoachMent}</div>
                                </div>
                            </div>

                            {/* Recommendations Area */}
                            <div className="relative pt-2">
                                <div className="flex justify-between items-center mb-3 px-1">
                                    <h3 className="font-extrabold text-base tracking-tight">
                                        {selectedCoachCategory ? (
                                            <span>AI 독서코치의 <span className="text-[#16A34A] font-black">{selectedCoachCategory}</span> 추천책</span>
                                        ) : (
                                            <span><span className="text-[#16A34A] font-black">북콕</span>이 추천하는 책</span>
                                        )}
                                    </h3>
                                    {selectedCoachCategory ? (
                                        <span 
                                            onClick={() => setSelectedCoachCategory(null)}
                                            className="text-xs font-black text-[#16A34A] cursor-pointer hover:text-green-700 transition-colors"
                                        >
                                            기본 추천으로 〉
                                        </span>
                                    ) : (
                                        <span 
                                            onClick={() => router.push('/')}
                                            className="text-xs font-bold text-gray-400 cursor-pointer hover:text-[#16A34A] transition-colors"
                                        >
                                            더보기 &gt;
                                        </span>
                                    )}
                                </div>

                                {/* Books List (Horizontal scroll) */}
                                <div className="flex overflow-x-auto gap-4 py-2 px-1 scrollbar-hide -mx-4 px-4">
                                    {analysisBooks.length > 0 ? (
                                        analysisBooks.map((book, idx) => (
                                            <div 
                                                key={idx} 
                                                onClick={() => router.push(`/book/?id=${book.id || book.bookid || '9788997984848'}`)}
                                                className="bg-white rounded-[24px] p-2.5 border border-gray-100 shadow-[0_4px_12px_rgba(0,0,0,0.02)] w-[128px] shrink-0 cursor-pointer active:scale-[0.98] transition-transform"
                                            >
                                                <div className="relative w-full h-[140px] rounded-[16px] overflow-hidden mb-2 border border-gray-50">
                                                    <OptimizedImage src={book.coverUrl} alt={book.title} fill className="object-cover" sizes="128px" sizePreset="thumbnail" />
                                                </div>
                                                <h4 className="font-extrabold text-[11px] text-gray-900 tracking-tight line-clamp-1 mb-0.5">{book.title}</h4>
                                                <p className="text-[8.5px] text-gray-400 font-bold tracking-tight mb-1 truncate">{book.author} / {book.publisher}</p>
                                                <BookRating rating={book.rating} iconSize={9} className="text-[10px]" />
                                            </div>
                                        ))
                                    ) : (
                                        Array.from({ length: 3 }).map((_, i) => (
                                            <div className="bg-white rounded-[24px] p-2.5 border border-gray-100 w-[128px] shrink-0 animate-pulse" key={i}>
                                                <div className="w-full h-[140px] bg-gray-200 rounded-[16px] mb-2" />
                                                <div className="h-3 bg-gray-200 rounded w-4/5 mb-1" />
                                                <div className="h-2.5 bg-gray-200 rounded w-3/5" />
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* 심층 독서 성향 진단 및 맞춤 플랜 로드맵 */}
                            <div className="pt-2">
                                <ReadingAnalysis
                                    activeChild={activeChild}
                                    userReadBooks={userReadBooks}
                                    getReadingAnalysis={getReadingAnalysis}
                                    loading={readingAnalysisLoading}
                                    result={readingAnalysisResult}
                                    chartData={chartData}
                                    keywords={aiKeywords}
                                />
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

export default function SolutionPage() {
    return (
        <Suspense fallback={null}>
            <SolutionPageContent />
        </Suspense>
    );
}
