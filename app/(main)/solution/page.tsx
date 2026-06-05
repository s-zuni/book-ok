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



export default function SolutionPage() {
    const [activeMenu, setActiveMenu] = useState<any>('solution');
    const [activeSubMenu, setActiveSubMenu] = useState('우리 아이 독서 성향 AI 분석');
    const [activeChild, setActiveChild] = useState<Child | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // States for Reading Analysis
    const [userReadBooks, setUserReadBooks] = useState<Book[]>([]);
    const [readingAnalysisResult, setReadingAnalysisResult] = useState('');
    const [readingAnalysisLoading, setReadingAnalysisLoading] = useState(false);

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
        <div className="min-h-screen bg-[#FDFDFD] text-gray-900 font-sans">
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

            <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col lg:flex-row gap-12">
                <div className="hidden lg:flex">
                    <Sidebar
                        activeChild={activeChild}
                        activeMenu="solution"
                        activeSubMenu={activeSubMenu}
                        setActiveSubMenu={setActiveSubMenu}
                        setActiveChild={setActiveChild}
                    />
                </div>

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
        </div>
    );
}
