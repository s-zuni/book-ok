"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import ReadingAnalysis from "../../components/solution/ReadingAnalysis";
import AISolution from "../../components/solution/AISolution";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { Child, Book } from "../../types";



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

    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (user) {
            supabase.from('children').select('*').eq('profile_id', user.id).then(({ data }) => {
                if (data && data.length > 0) {
                    const child = data[0];
                    const age = new Date().getFullYear() - new Date(child.birthdate).getFullYear();
                    setActiveChild({ ...child, age });
                }
            });
        }
    }, [user]);

    // Fetch read books when tab changes
    useEffect(() => {
        if (activeSubMenu === '우리 아이 독서 성향 AI 분석' && user) {
            fetchUserReadBooks();
        }
    }, [activeSubMenu, user]);

    const fetchUserReadBooks = async () => {
        if (!user) return;
        const { data: reviews } = await supabase.from('reviews')
            .select('book_id, books(*)')
            .eq('user_id', user.id); // Assuming user_id links to reviews

        if (reviews) {
            const books = reviews.map((r: any) => r.books).filter(Boolean);
            // Deduplicate
            const uniqueBooks = Array.from(new Map(books.map((b: any) => [b.id, b])).values());
            setUserReadBooks(uniqueBooks as Book[]);
        }
    };

    const getReadingAnalysis = async () => {
        if (userReadBooks.length === 0) return;
        setReadingAnalysisLoading(true);
        setReadingAnalysisResult('');

        try {
            const bookListText = userReadBooks.map(book => `- ${book.title} (저자: ${book.author})`).join('\n');
            const prompt = `
        다음은 5~9세 아이가 읽은 책 목록입니다:
        ${bookListText}

        이 아이의 독서 성향을 분석해주고, 앞으로 어떤 분야의 책을 더 읽으면 좋을지 구체적인 장르나 주제를 추천해주세요.
        부모에게 조언하듯이 친절하고 전문적인 어조로 작성해주세요.
      `;

            const response = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'API Error');
            }

            const solutionText = data.result || "분석을 완료할 수 없습니다. 다시 시도해주세요.";
            setReadingAnalysisResult(solutionText);

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
          
          답변은 공감하는 말로 시작해서, 구체적인 해결 방안 3가지 정도를 제시하고, 격려의 말로 마무리해주세요.
        `;

            const response = await fetch('/api/gemini', {
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
