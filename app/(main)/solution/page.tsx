"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@shared/ui/Header";
import Sidebar from "@shared/ui/Sidebar";
import ReadingAnalysis from "@widgets/solution/ReadingAnalysis";
import AISolution from "@widgets/solution/AISolution";
import { useAuth } from "@features/auth/AuthContext";
import { supabase } from "@shared/lib/supabase";
import { Child, Book } from "@shared/types";
import { Star, Send, Sparkles } from "lucide-react";
import Image from "next/image";



export default function SolutionPage() {
    const [activeMenu, setActiveMenu] = useState<any>('solution');
    const [activeSubMenu, setActiveSubMenu] = useState('우리 아이 독서 성향 AI 분석');
    const [activeChild, setActiveChild] = useState<Child | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Mobile specific states
    const [mobileTab, setMobileTab] = useState<'analysis' | 'solution'>('analysis');
    const [analysisBooks, setAnalysisBooks] = useState<any[]>([]);
    const [mobileSolutionHistory, setMobileSolutionHistory] = useState<{ role: 'user' | 'assistant', content: string, books?: any[] }[]>([]);
    const [mobileInput, setMobileInput] = useState('');
    const [mobileLoading, setMobileLoading] = useState(false);

    // States for Reading Analysis
    const [userReadBooks, setUserReadBooks] = useState<Book[]>([]);
    const [readingAnalysisResult, setReadingAnalysisResult] = useState('');
    const [readingAnalysisLoading, setReadingAnalysisLoading] = useState(false);

    // Helper to fetch and format book details from Aladin API
    const fetchAladinBook = async (title: string): Promise<any> => {
        try {
            const res = await fetch(`/api/recommendations?query=${encodeURIComponent(title)}&apiType=ItemSearch`);
            if (!res.ok) return null;
            const data = await res.json();
            const item = data.item?.[0];
            if (!item) return null;
            return {
                title: item.title.split(" - ")[0],
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
        const loadAnalysisBooks = async () => {
            const bookTitles = [
                "진짜 일학년 책가방을 지켜라!",
                "하늘이 딱딱했대?",
                "왜 먼저 물어보지 않니?"
            ];
            
            const loaded: any[] = [];
            for (const title of bookTitles) {
                const book = await fetchAladinBook(title);
                if (book) loaded.push(book);
            }
            setAnalysisBooks(loaded);
        };
        loadAnalysisBooks();
    }, []);

    const handleMobileSolutionSubmit = async () => {
        if (!mobileInput.trim() || mobileLoading) return;
        
        const userText = mobileInput;
        setMobileSolutionHistory(prev => [...prev, { role: 'user', content: userText }]);
        setMobileInput('');
        setMobileLoading(true);

        try {
            let bookTitles = ["잘자, 밥", "별이가 졸려요", "잘자, 굴삭기 벤!"];
            
            // If the query is custom (not related to sleep), search Aladin for matching books
            const isSleepTopic = userText.includes("잠") || userText.includes("수면") || userText.includes("자다") || userText.includes("무서워");
            
            if (!isSleepTopic) {
                const searchRes = await fetch(`/api/recommendations?query=${encodeURIComponent(userText.substring(0, 15))}&apiType=ItemSearch`);
                if (searchRes.ok) {
                    const searchData = await searchRes.json();
                    const items = searchData.item?.slice(0, 3) || [];
                    if (items.length > 0) {
                        const parsedBooks = items.map((item: any) => ({
                            title: item.title.split(" - ")[0],
                            author: item.author.replace(/\s*\(지은이\)|\s*\(그림\)|\s*\(글\)/g, "").split(",")[0].trim(),
                            publisher: item.publisher,
                            rating: item.customerRating ? parseFloat((item.customerRating / 2).toFixed(1)) : 4.5,
                            reviewsCount: item.salesPoint ? Math.min(Math.floor(item.salesPoint / 100), 200) + 5 : Math.floor(Math.random() * 50) + 50,
                            coverUrl: item.cover
                        }));
                        
                        setMobileSolutionHistory(prev => [...prev, {
                            role: 'assistant',
                            content: `◆ '${userText.substring(0, 8)}...' 고민에 도움이 되는 추천 그림책 3권을 선정했습니다`,
                            books: parsedBooks
                        }]);
                        setMobileLoading(false);
                        return;
                    }
                }
            }

            // Sleep topic flow - fetch sleep books from Aladin API
            const loadedBooks: any[] = [];
            for (const t of bookTitles) {
                const b = await fetchAladinBook(t);
                if (b) loadedBooks.push(b);
            }

            setMobileSolutionHistory(prev => [...prev, {
                role: 'assistant',
                content: "◆ 혼자서도 잘자요! 씩씩한 꿈나라를 다룬 그림책 3권을 추천드릴게요",
                books: loadedBooks
            }]);

        } catch (error) {
            console.error(error);
            setMobileSolutionHistory(prev => [...prev, { role: 'assistant', content: "죄송해요, 솔루션을 생성하는 중에 오류가 생겼습니다." }]);
        } finally {
            setMobileLoading(false);
        }
    };

    // States for AI Solution
    const [aiSolutionPrompt, setAiSolutionPrompt] = useState('');
    const [aiSolutionResult, setAiSolutionResult] = useState('');
    const [aiSolutionLoading, setAiSolutionLoading] = useState(false);

    const { user, children } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // Sync activeChild with global children list
        if (!activeChild && children.length > 0) {
            setActiveChild(children[0]);
        }
    }, [children, activeChild]);

    // Fetch read books when tab changes or active child changes
    useEffect(() => {
        if (activeSubMenu === '우리 아이 독서 성향 AI 분석' && user && activeChild) {
            fetchUserReadBooks();
        }
    }, [activeSubMenu, user, activeChild]);

    const fetchUserReadBooks = async () => {
        if (!user || !activeChild) return;

        const { data: readBooksData } = await supabase
            .from('read_books')
            .select('book_id, observation_data, books(*)') // Fetch observation_data
            .eq('child_id', activeChild.id)
            .order('read_date', { ascending: false }); // Ensure newest first

        if (readBooksData) {
            // Map books and attach their specific observation
            const booksWithObs = readBooksData.map((r: any) => ({
                ...r.books,
                _observation: r.observation_data // Store internally for analysis
            })).filter((b: any) => b && b.id); // Filter invalid

            // Deduplicate (Keep most recent if duplicate)
            const uniqueBooks = Array.from(new Map(booksWithObs.map((b: any) => [b.id, b])).values());
            setUserReadBooks(uniqueBooks as Book[]);
        }
    };

    const [chartData, setChartData] = useState<{ subject: string; A: number; fullMark: number; }[]>([]);
    const [aiKeywords, setAiKeywords] = useState<string[]>([]);

    const getReadingAnalysis = async (observations?: any) => {
        if (userReadBooks.length === 0) return;
        setReadingAnalysisLoading(true);
        setReadingAnalysisResult('');
        setChartData([]);
        setAiKeywords([]);

        try {
            // STEP 1: Enrich Book Data (Phase 2 - Data Enrichment)
            // Fetch details for up to 5 most recent books to avoid API overload/timeout
            const recentBooks = userReadBooks.slice(0, 5);
            const enrichedBooks = await Promise.all(recentBooks.map(async (book) => {
                try {
                    // Assuming book.bookid is the ISBN13 or ItemId
                    const res = await fetch(`/api/book-detail?itemId=${book.bookid}`);
                    if (!res.ok) return book;
                    const details = await res.json();
                    return { ...book, description: details.description, toc: details.toc };
                } catch (e) {
                    console.error("Failed to fetch details for", book.title);
                    return book;
                }
            }));

            const bookListText = enrichedBooks.map((book: any) => {
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
                // In production, we would use sophisticated summarization here
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
                // Map common keys to Korean labels if needed, or just send raw values with context
                if (observations.fluency) observationText += `- 읽기 유창성 관찰: "${observations.fluency}"\n`;
                if (observations.independence) observationText += `- 독립 독서 여부: "${observations.independence}"\n`;
                if (observations.decoding) observationText += `- 글자 해독 능력: "${observations.decoding}"\n`;
                if (observations.interest) observationText += `- 흥미 반응: "${observations.interest}"\n`;
                if (observations.critical) observationText += `- 비판적 질문: "${observations.critical}"\n`;
                // Fallback for others
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

            const response = await fetch('/api/openai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'API Error');
            }

            let resultData;
            try {
                // Remove any markdown code blocks if present
                const cleanJson = data.result.replace(/```json/g, '').replace(/```/g, '').trim();
                resultData = JSON.parse(cleanJson);
            } catch (e) {
                console.error("JSON Parse Error:", e);
                // Fallback for plain text response
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

    const getAISolution = async () => {
        if (!aiSolutionPrompt.trim()) return;
        setAiSolutionLoading(true);
        setAiSolutionResult('');

        try {
            const prompt = `
          당신은 아동 독서 및 교육 전문가입니다. 부모님의 다음 고민에 대해 전문적이고 실질적인 솔루션을 제공해주세요.
          고민: "${aiSolutionPrompt}"
          
          **답변 작성 가이드:**
          1. **공감하기**: 부모님의 고민에 공감하는 따뜻한 말로 시작하세요.
          2. **핵심 솔루션 (개괄식)**: 해결 방안을 3가지 내외로 제시하되, **글머리 기호(-)**를 사용하여 정리하세요.
          3. **강조**: 핵심 키워드나 실천 방법은 **굵게(**)** 표시하여 눈에 띄게 하세요.
          4. **마무리**: 긍정적인 격려의 말로 마무리하세요.
        `;

            const response = await fetch('/api/openai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'API Error');
            }

            const solutionText = data.result || "솔루션을 생성할 수 없습니다.";
            setAiSolutionResult(solutionText);

        } catch (error) {
            console.error(error);
            setAiSolutionResult("오류가 발생했습니다.");
        } finally {
            setAiSolutionLoading(false);
        }
    };


    const handleSearch = () => {
        if (searchQuery.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
        }
    };

    const dummySetView = () => { };

    return (
        <div className="min-h-screen bg-[#F8F9FA] text-gray-900 font-sans pb-24 lg:pb-0">
            {/* Desktop View Header */}
            <div className="hidden lg:block">
                <Header
                    view="main"
                    setView={dummySetView}
                    activeMenu={activeMenu}
                    setActiveMenu={setActiveMenu}
                    setActiveSubMenu={setActiveSubMenu}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    handleSearch={handleSearch}
                    activeSubMenu={activeSubMenu}
                />
            </div>

            {/* Desktop Content Layout */}
            <div className="hidden lg:flex max-w-7xl mx-auto px-6 py-12 flex-row gap-12 bg-[#FDFDFD]">
                <Sidebar
                    activeChild={activeChild}
                    activeMenu="solution"
                    activeSubMenu={activeSubMenu}
                    setActiveSubMenu={setActiveSubMenu}
                    setActiveChild={setActiveChild}
                />
                <main className="flex-1 min-h-[600px]">
                    {activeSubMenu === '우리 아이 독서 성향 AI 분석' && (
                        <ReadingAnalysis
                            activeChild={activeChild}
                            userReadBooks={userReadBooks}
                            getReadingAnalysis={getReadingAnalysis}
                            loading={readingAnalysisLoading}
                            result={readingAnalysisResult}
                            chartData={chartData}
                            keywords={aiKeywords}
                        />
                    )}

                    {activeSubMenu === 'AI 독서 솔루션' && (
                        <AISolution
                            prompt={aiSolutionPrompt}
                            setPrompt={setAiSolutionPrompt}
                            getSolution={getAISolution}
                            loading={aiSolutionLoading}
                            result={aiSolutionResult}
                        />
                    )}
                </main>
            </div>

            {/* ============================================================== */}
            {/* Mobile / Hybrid App View (lg:hidden) */}
            {/* ============================================================== */}
            <div className="lg:hidden flex flex-col min-h-screen bg-[#F8F9FA]">
                {/* Mobile Tab Control */}
                <div className="bg-white border-b border-gray-100 flex sticky top-0 z-40 shrink-0">
                    <button
                        onClick={() => setMobileTab('analysis')}
                        className={`flex-1 py-4 text-center font-extrabold text-[15px] border-b-2 transition-all ${
                            mobileTab === 'analysis'
                                ? 'border-[#16A34A] text-[#1A1A1A]'
                                : 'border-transparent text-gray-400 font-bold'
                        }`}
                    >
                        성향 분석
                    </button>
                    <button
                        onClick={() => setMobileTab('solution')}
                        className={`flex-1 py-4 text-center font-extrabold text-[15px] border-b-2 transition-all ${
                            mobileTab === 'solution'
                                ? 'border-[#16A34A] text-[#1A1A1A]'
                                : 'border-transparent text-gray-400 font-bold'
                        }`}
                    >
                        독서 솔루션
                    </button>
                </div>

                {/* Mobile Tab Content */}
                <div className="flex-1 p-4 space-y-4">
                    {mobileTab === 'analysis' ? (
                        /* ================= ANALYSIS TAB ================= */
                        <div className="space-y-4">
                            {/* Top Grid: Read books stats */}
                            <div className="grid grid-cols-2 gap-3">
                                {/* Current Month Read Books */}
                                <div className="bg-[#E8F5E9]/30 border border-green-100 rounded-[28px] p-5 flex flex-col justify-between h-[128px]">
                                    <span className="text-[12px] font-bold text-gray-500">이번 달 읽은 책</span>
                                    <div className="flex items-baseline gap-1 my-1">
                                        <span className="text-3xl font-black text-gray-900">11</span>
                                        <span className="text-sm font-black text-gray-700">권</span>
                                    </div>
                                    <span className="text-[11px] font-extrabold text-[#16A34A]">▲ 지난달보다 +3권</span>
                                </div>

                                {/* Total Read Books */}
                                <div className="bg-white border border-gray-100 rounded-[28px] p-5 flex flex-col justify-between h-[128px] shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
                                    <span className="text-[12px] font-bold text-gray-500">누적 독서량</span>
                                    <div className="flex items-baseline gap-1 my-1">
                                        <span className="text-3xl font-black text-gray-900">42</span>
                                        <span className="text-sm font-black text-gray-700">권</span>
                                    </div>
                                    <div className="self-start bg-[#FACC15]/20 text-[#D97706] text-[10px] font-black px-2.5 py-0.5 rounded-full">
                                        독서왕 Lv.3
                                    </div>
                                </div>
                            </div>

                            {/* Preferred Topics Card */}
                            <div className="bg-white border border-gray-100 rounded-[32px] p-5 shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
                                <h3 className="font-extrabold text-base mb-4 tracking-tight">선호 독서 주제</h3>
                                <div className="flex items-center justify-between gap-4">
                                    {/* Categories list */}
                                    <div className="space-y-3.5 flex-1">
                                        {[
                                            { label: "상상 · 판타지", pct: "40%", dot: "bg-[#7C4DFF]" },
                                            { label: "감정 · 관계", pct: "30%", dot: "bg-[#651FFF]" },
                                            { label: "자연 · 과학", pct: "15%", dot: "bg-[#00E5FF]" },
                                            { label: "탈것 · 모험", pct: "15%", dot: "bg-[#00E676]" }
                                        ].map((cat, idx) => (
                                            <div key={idx} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2.5 h-2.5 rounded-full ${cat.dot}`} />
                                                    <span className="text-xs font-bold text-gray-400">{cat.label}</span>
                                                </div>
                                                <span className="text-xs font-black text-gray-900">{cat.pct}</span>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {/* Custom SVG Donut Chart */}
                                    <div className="relative w-[130px] h-[130px] flex items-center justify-center shrink-0">
                                        <svg width="130" height="130" viewBox="0 0 100 100" className="transform -rotate-90">
                                            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#7C4DFF" strokeWidth="12" strokeDasharray="100.5 251.2" strokeDashoffset="0" />
                                            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#651FFF" strokeWidth="12" strokeDasharray="75.4 251.2" strokeDashoffset="-100.5" />
                                            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#00E5FF" strokeWidth="12" strokeDasharray="37.7 251.2" strokeDashoffset="-175.9" />
                                            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#00E676" strokeWidth="12" strokeDasharray="37.7 251.2" strokeDashoffset="-213.6" />
                                            <circle cx="50" cy="50" r="28" fill="white" />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                            <span className="text-[12px] font-black text-[#16A34A] leading-tight">6월</span>
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
                                    <svg width="100%" height="80" viewBox="0 0 288 80" className="overflow-visible w-full h-full">
                                        <line x1="0" y1="79" x2="288" y2="79" stroke="#F3F4F6" strokeWidth="1" strokeDasharray="3 3" />
                                        <line x1="0" y1="40" x2="288" y2="40" stroke="#F3F4F6" strokeWidth="1" strokeDasharray="3 3" />
                                        
                                        {/* Bars */}
                                        <rect x="20" y="45" width="16" height="35" rx="4" fill="#374151" />
                                        <rect x="68" y="55" width="16" height="25" rx="4" fill="#374151" />
                                        <rect x="116" y="35" width="16" height="45" rx="4" fill="#374151" />
                                        <rect x="164" y="25" width="16" height="55" rx="4" fill="#374151" />
                                        <rect x="212" y="38" width="16" height="42" rx="4" fill="#374151" />
                                        <rect x="260" y="10" width="16" height="70" rx="4" fill="#16A34A" />
                                        
                                        {/* Polyline */}
                                        <polyline fill="none" stroke="#86EFAC" strokeWidth="2.5" points="28,45 76,55 124,35 172,25 220,38 268,10" />
                                        
                                        {/* Line dots */}
                                        <circle cx="28" cy="45" r="3.5" fill="white" stroke="#86EFAC" strokeWidth="2.5" />
                                        <circle cx="76" cy="55" r="3.5" fill="white" stroke="#86EFAC" strokeWidth="2.5" />
                                        <circle cx="124" cy="35" r="3.5" fill="white" stroke="#86EFAC" strokeWidth="2.5" />
                                        <circle cx="172" cy="25" r="3.5" fill="white" stroke="#86EFAC" strokeWidth="2.5" />
                                        <circle cx="220" cy="38" r="3.5" fill="white" stroke="#86EFAC" strokeWidth="2.5" />
                                        <circle cx="268" cy="10" r="3.5" fill="white" stroke="#16A34A" strokeWidth="2.5" />
                                    </svg>
                                </div>
                                
                                {/* Months labels */}
                                <div className="flex justify-between items-center px-2 text-[10px] font-bold text-gray-400">
                                    <span>12월</span>
                                    <span>1월</span>
                                    <span>2월</span>
                                    <span>3월</span>
                                    <span>4월</span>
                                    <span className="text-[#16A34A] font-black">5월</span>
                                </div>
                            </div>

                            {/* AI 독서코치 고정 알림 배너 (Figma 269:10400 기준 고정형) */}
                            <div className="bg-white border border-gray-100 rounded-[28px] p-4 flex items-center gap-3.5 shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
                                <div className="bg-[#16A34A]/10 text-[#16A34A] w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                                    <Sparkles size={18} className="fill-current" />
                                </div>
                                <div className="flex-1">
                                    <div className="text-[10px] font-black text-[#16A34A] tracking-wider leading-none uppercase">AI 독서코치</div>
                                    <div className="text-[13px] font-bold text-gray-800 mt-1 block tracking-tight">
                                        "자연 · 과학" 분야를 시도해보면 어떨까요?
                                    </div>
                                </div>
                            </div>

                            {/* Recommendations Area */}
                            <div className="relative pt-2">
                                <div className="flex justify-between items-center mb-3 px-1">
                                    <h3 className="font-extrabold text-base tracking-tight"><span className="text-[#16A34A] font-black">북콕</span>이 추천하는 책</h3>
                                    <span 
                                        onClick={() => router.push('/')}
                                        className="text-xs font-bold text-gray-400 cursor-pointer hover:text-[#16A34A] transition-colors active:scale-95 transition-transform"
                                    >
                                        더보기 &gt;
                                    </span>
                                </div>

                                {/* Books List (Horizontal scroll) */}
                                <div className="flex overflow-x-auto gap-4 py-2 px-1 scrollbar-hide -mx-4 px-4">
                                    {analysisBooks.length > 0 ? (
                                        analysisBooks.map((book, idx) => (
                                            <div 
                                                key={idx} 
                                                onClick={() => router.push(`/book/${book.id || book.bookid || '9788997984848'}`)}
                                                className="bg-white rounded-[24px] p-2.5 border border-gray-100 shadow-[0_4px_12px_rgba(0,0,0,0.02)] w-[128px] shrink-0 cursor-pointer active:scale-[0.98] transition-transform"
                                            >
                                                <div className="relative w-full h-[140px] rounded-[16px] overflow-hidden mb-2 border border-gray-50">
                                                    <Image src={book.coverUrl} alt={book.title} fill className="object-cover" sizes="128px" />
                                                </div>
                                                <h4 className="font-extrabold text-[11px] text-gray-900 tracking-tight line-clamp-1 mb-0.5">{book.title}</h4>
                                                <p className="text-[8.5px] text-gray-400 font-bold tracking-tight mb-1 truncate">{book.author} / {book.publisher}</p>
                                                <div className="flex items-center gap-0.5 text-[#16A34A]">
                                                    <Star size={9} fill="currentColor" />
                                                    <span className="text-[10px] font-black">{book.rating}</span>
                                                    <span className="text-[10px] font-bold text-gray-400">({book.reviewsCount})</span>
                                                </div>
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
                        </div>
                    ) : (
                        /* ================= SOLUTION TAB ================= */
                        <div className="flex flex-col h-[calc(100vh-230px)]">
                            {/* Scrollable conversation history */}
                            <div className="flex-1 overflow-y-auto space-y-4 pb-4">
                                <div className="bg-white border border-gray-100 rounded-[28px] p-5 shadow-[0_4px_12px_rgba(0,0,0,0.02)] space-y-3">
                                    <div className="flex items-center gap-1">
                                        <span className="text-[#16A34A] font-black text-lg">◆</span>
                                        <h3 className="font-extrabold text-[15px] tracking-tight">지명이의 <span className="text-[#16A34A]">독서 고민</span>을 자세히 들려주세요!</h3>
                                    </div>
                                    <p className="text-xs text-gray-400 font-medium leading-relaxed">
                                        ex) 저희 아이가 책 읽는 것을 너무 싫어해요. 어떻게 하면 책과 친해질 수 있을까요?
                                    </p>
                                    <p className="text-xs text-gray-500 font-extrabold leading-relaxed">
                                        50자 이상 자세히 적어주시면 더 정확한 솔루션을 드릴 수 있습니다.
                                    </p>
                                </div>

                                {mobileSolutionHistory.map((msg, idx) => {
                                    const isUser = msg.role === 'user';
                                    return (
                                        <div key={idx} className="space-y-3">
                                            <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[85%] px-4 py-3 rounded-[24px] text-[13.5px] leading-relaxed shadow-sm ${
                                                    isUser ? 'bg-[#1A1A1A] text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                                                }`}>
                                                    {!isUser && msg.content.startsWith("◆") ? (
                                                        <div>
                                                            <span className="text-[#16A34A] font-black">{msg.content.slice(0, msg.content.indexOf(" ") + 1)}</span>
                                                            <span className="font-bold">{msg.content.slice(msg.content.indexOf(" ") + 1)}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="whitespace-pre-line">{msg.content}</div>
                                                    )}
                                                </div>
                                            </div>

                                            {msg.books && msg.books.length > 0 && (
                                                <div className="flex overflow-x-auto gap-4 py-2 px-1 scrollbar-hide -mx-4 px-4">
                                                    {msg.books.map((book, bIdx) => (
                                                        <div key={bIdx} className="bg-white rounded-[24px] p-2.5 border border-gray-100 shadow-[0_4px_12px_rgba(0,0,0,0.02)] w-[128px] shrink-0">
                                                            <div className="relative w-full h-[140px] rounded-[16px] overflow-hidden mb-2 border border-gray-50">
                                                                <Image src={book.coverUrl} alt={book.title} fill className="object-cover" sizes="128px" />
                                                            </div>
                                                            <h4 className="font-extrabold text-[11px] text-gray-900 tracking-tight line-clamp-1 mb-0.5">{book.title}</h4>
                                                            <p className="text-[8.5px] text-gray-400 font-bold tracking-tight mb-1 truncate">{book.author} / {book.publisher}</p>
                                                            <div className="flex items-center gap-0.5 text-[#16A34A]">
                                                                <Star size={9} fill="currentColor" />
                                                                <span className="text-[10px] font-black">{book.rating}</span>
                                                                <span className="text-[10px] font-bold text-gray-400">({book.reviewsCount})</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {mobileLoading && (
                                    <div className="flex justify-start">
                                        <div className="bg-white px-4 py-3 rounded-[24px] rounded-tl-none border border-gray-100 shadow-sm">
                                            <div className="flex gap-1 items-center">
                                                <div className="w-2.5 h-2.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <div className="w-2.5 h-2.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <div className="w-2.5 h-2.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Chat Input form */}
                            <div className="bg-[#F8F9FA] pt-2">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={mobileInput}
                                        onChange={(e) => setMobileInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleMobileSolutionSubmit()}
                                        placeholder="메시지를 입력하세요"
                                        className="flex-1 bg-white border border-gray-200 rounded-full px-5 py-3 outline-none focus:ring-2 focus:ring-[#16A34A]/20 text-xs font-semibold text-gray-900 placeholder-gray-400"
                                    />
                                    <button
                                        onClick={handleMobileSolutionSubmit}
                                        disabled={!mobileInput.trim() || mobileLoading}
                                        className="bg-[#1A1A1A] hover:bg-gray-800 disabled:bg-gray-200 disabled:opacity-50 text-white p-3 rounded-full transition-all flex items-center justify-center shrink-0 shadow-md"
                                    >
                                        <Send size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
