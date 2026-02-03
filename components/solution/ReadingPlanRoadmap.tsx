"use client";

import { useState, useEffect } from "react";
import { Book, Child } from "../../types";
import { Calendar, Target, Lightbulb, ChevronDown, ChevronUp, Sparkles, CheckCircle2, BookOpen, Activity, Loader2 } from "lucide-react";

interface WeeklyPlan {
    week: number;
    theme: string;
    goals: string[];
    recommendedBooks: {
        genre: string;
        suggestion: string;
        reason: string;
    }[];
    activities: string[];
}

interface ReadingPlan {
    summary: string;
    monthlyGoal: number;
    weeklyPlans: WeeklyPlan[];
    tips: string[];
    strengthAreas: string[];
    improvementAreas: string[];
}

interface ReadingPlanRoadmapProps {
    child: Child | null;
    readBooks: Book[];
    keywords?: string[];
    missingGenres?: string[];
    analysisResult?: string;
}

export default function ReadingPlanRoadmap({
    child,
    readBooks,
    keywords = [],
    missingGenres = [],
    analysisResult
}: ReadingPlanRoadmapProps) {
    const [plan, setPlan] = useState<ReadingPlan | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedWeek, setExpandedWeek] = useState<number | null>(1);
    const [showTips, setShowTips] = useState(false);

    const generatePlan = async () => {
        if (!child) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/reading-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    childName: child.name,
                    childAge: child.birthdate
                        ? Math.floor((Date.now() - new Date(child.birthdate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
                        : 7,
                    readBooks: readBooks.map(book => ({
                        title: book.title,
                        category: book.category,
                        rating: (book as any).rating,
                        difficulty: (book as any).difficulty_rating,
                        readDate: (book as any).read_date || new Date().toISOString()
                    })),
                    analysisResult,
                    keywords,
                    missingGenres
                })
            });

            const data = await response.json();

            if (data.success && data.plan) {
                setPlan(data.plan);
            } else {
                setError(data.error || '계획 생성에 실패했습니다.');
            }
        } catch (err: any) {
            setError(err.message || '네트워크 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    if (!child) return null;

    return (
        <div className="mt-12 bg-linear-to-br from-indigo-50 to-purple-50 rounded-[2.5rem] border border-indigo-100 p-8 lg:p-10 animate-in slide-in-from-bottom-10">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="bg-white p-2.5 rounded-xl shadow-sm text-indigo-600">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-gray-900">개인화 독서 로드맵</h3>
                        <p className="text-sm font-bold text-indigo-600/80">{child.name}님을 위한 4주 계획</p>
                    </div>
                </div>

                {!plan && (
                    <button
                        onClick={generatePlan}
                        disabled={loading}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                생성 중...
                            </>
                        ) : (
                            <>
                                <Sparkles size={18} />
                                계획 생성하기
                            </>
                        )}
                    </button>
                )}
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                    {error}
                </div>
            )}

            {plan && (
                <div className="space-y-6">
                    {/* 요약 카드 */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-indigo-100">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-indigo-100 rounded-xl text-indigo-600">
                                <Target size={24} />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-gray-900 mb-2">이번 달 목표</h4>
                                <p className="text-gray-600 text-sm mb-4">{plan.summary}</p>
                                <div className="flex items-center gap-4">
                                    <div className="px-4 py-2 bg-indigo-50 rounded-xl">
                                        <span className="text-2xl font-black text-indigo-600">{plan.monthlyGoal}</span>
                                        <span className="text-sm text-indigo-500 ml-1">권 목표</span>
                                    </div>
                                    {plan.strengthAreas.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {plan.strengthAreas.slice(0, 2).map((area, idx) => (
                                                <span key={idx} className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold">
                                                    ✓ {area}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 주간 계획 */}
                    <div className="space-y-3">
                        {plan.weeklyPlans.map((week) => (
                            <div
                                key={week.week}
                                className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all"
                            >
                                <button
                                    onClick={() => setExpandedWeek(expandedWeek === week.week ? null : week.week)}
                                    className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg ${week.week === 1 ? 'bg-blue-100 text-blue-600' :
                                            week.week === 2 ? 'bg-green-100 text-green-600' :
                                                week.week === 3 ? 'bg-orange-100 text-orange-600' :
                                                    'bg-purple-100 text-purple-600'
                                            }`}>
                                            {week.week}
                                        </div>
                                        <div className="text-left">
                                            <h5 className="font-bold text-gray-900">{week.week}주차</h5>
                                            <p className="text-sm text-gray-500">{week.theme}</p>
                                        </div>
                                    </div>
                                    {expandedWeek === week.week ? (
                                        <ChevronUp size={20} className="text-gray-400" />
                                    ) : (
                                        <ChevronDown size={20} className="text-gray-400" />
                                    )}
                                </button>

                                {expandedWeek === week.week && (
                                    <div className="px-5 pb-5 space-y-4 animate-in slide-in-from-top-2">
                                        {/* 목표 */}
                                        <div>
                                            <h6 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                                                <CheckCircle2 size={14} /> 주간 목표
                                            </h6>
                                            <ul className="space-y-1">
                                                {week.goals.map((goal, idx) => (
                                                    <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                                                        <span className="text-indigo-500">•</span>
                                                        {goal}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* 추천 도서 유형 */}
                                        <div>
                                            <h6 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                                                <BookOpen size={14} /> 추천 도서
                                            </h6>
                                            <div className="grid gap-2">
                                                {week.recommendedBooks.map((book, idx) => (
                                                    <div key={idx} className="p-3 bg-gray-50 rounded-xl">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md text-xs font-bold">
                                                                {book.genre}
                                                            </span>
                                                            <span className="text-sm font-bold text-gray-800">{book.suggestion}</span>
                                                        </div>
                                                        <p className="text-xs text-gray-500">{book.reason}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* 독후 활동 */}
                                        <div>
                                            <h6 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                                                <Activity size={14} /> 독후 활동
                                            </h6>
                                            <div className="flex flex-wrap gap-2">
                                                {week.activities.map((activity, idx) => (
                                                    <span key={idx} className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold">
                                                        {activity}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* 부모님 팁 */}
                    {plan.tips.length > 0 && (
                        <div>
                            <button
                                onClick={() => setShowTips(!showTips)}
                                className="w-full flex items-center justify-between p-4 bg-yellow-50 rounded-xl border border-yellow-100 hover:bg-yellow-100/50 transition-colors"
                            >
                                <span className="flex items-center gap-2 font-bold text-yellow-800">
                                    <Lightbulb size={18} />
                                    부모님을 위한 팁
                                </span>
                                {showTips ? <ChevronUp size={18} className="text-yellow-600" /> : <ChevronDown size={18} className="text-yellow-600" />}
                            </button>
                            {showTips && (
                                <div className="mt-2 p-4 bg-yellow-50/50 rounded-xl animate-in slide-in-from-top-2">
                                    <ul className="space-y-2">
                                        {plan.tips.map((tip, idx) => (
                                            <li key={idx} className="text-sm text-yellow-800 flex items-start gap-2">
                                                <span>💡</span>
                                                {tip}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 새 계획 생성 버튼 */}
                    <button
                        onClick={generatePlan}
                        disabled={loading}
                        className="w-full py-3 text-indigo-600 font-bold text-sm hover:bg-indigo-50 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                        <Sparkles size={16} />
                        새 계획 생성하기
                    </button>
                </div>
            )}
        </div>
    );
}
