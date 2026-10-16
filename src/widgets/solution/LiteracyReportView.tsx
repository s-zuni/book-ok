"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Legend,
    Tooltip,
} from "recharts";
import {
    Sparkles,
    Award,
    Clock,
    CheckCircle2,
    XCircle,
    BookOpen,
    ChevronDown,
    ChevronUp,
    MessageSquareHeart,
    RotateCcw,
    ArrowUpRight,
    ShieldCheck,
} from "lucide-react";
import { Child, LiteracyAssessment } from "@shared/types";
import { AREA_METADATA, buildRadarChartData } from "@features/literacy/scoring";
import OptimizedImage from "@shared/ui/OptimizedImage";
import BookRating from "@shared/ui/BookRating";
import { marked } from "marked";

interface LiteracyReportViewProps {
    assessment: LiteracyAssessment;
    child?: Child | null;
    onRetake?: () => void;
    onConsultAI?: (assessment: LiteracyAssessment) => void;
    compact?: boolean;
}

export default function LiteracyReportView({
    assessment,
    child,
    onRetake,
    onConsultAI,
    compact = false,
}: LiteracyReportViewProps) {
    const router = useRouter();
    const [expandedQIdx, setExpandedQIdx] = useState<number | null>(0);
    const childName = child?.name || "우리 아이";
    const radarData = buildRadarChartData(assessment);

    const weakestMeta = AREA_METADATA[assessment.weakest_area] || AREA_METADATA.inferential;
    const strengthMeta = AREA_METADATA[assessment.strength_area] || AREA_METADATA.vocabulary;

    // Highlight evidence sentence inside passage content
    const renderHighlightedPassage = (content: string | undefined, evidence: string) => {
        if (!content) return null;
        const cleanEvidence = evidence.trim();
        if (!cleanEvidence || !content.includes(cleanEvidence)) {
            return <p className="text-xs lg:text-sm text-gray-600 leading-relaxed">{content}</p>;
        }
        const parts = content.split(cleanEvidence);
        return (
            <p className="text-xs lg:text-sm text-gray-600 leading-relaxed break-keep">
                {parts[0]}
                <mark className="bg-[#16A34A]/15 text-[#2E5A44] font-extrabold px-1.5 py-0.5 rounded-md border border-[#16A34A]/30">
                    {cleanEvidence}
                </mark>
                {parts.slice(1).join(cleanEvidence)}
            </p>
        );
    };

    const normWpm = assessment.norm_wpm || 135;
    const wpmPercent = Math.min(Math.round((assessment.effective_wpm / normWpm) * 100), 140);

    return (
        <div className="space-y-5 animate-in fade-in duration-300">
            {/* 1. Top Summary Hero Card */}
            <div className="bg-linear-to-br from-[#2E5A44] to-[#1E3F2F] text-white rounded-[32px] p-6 lg:p-8 shadow-lg relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full blur-xl pointer-events-none" />
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-extrabold tracking-tight text-emerald-100">
                        <ShieldCheck size={14} />
                        Book,ok 문해력 지수 (BLI) 진단 리포트
                    </span>
                    <span className="text-[11px] font-bold text-emerald-200/80">
                        {assessment.grade_label || `${assessment.grade_level}학년`} 기준 ·{" "}
                        {new Date(assessment.created_at).toLocaleDateString("ko-KR")}
                    </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <p className="text-emerald-100/90 text-xs lg:text-sm font-bold mb-1">
                            {childName}의 종합 문해력 지수
                        </p>
                        <div className="flex items-baseline gap-2.5">
                            <span className="text-4xl lg:text-5xl font-black tracking-tight text-white">
                                {assessment.total_bli_score}
                            </span>
                            <span className="text-base font-bold text-emerald-200">/ 100점</span>
                            <span className="ml-1 bg-[#FACC15] text-[#1A1A1A] text-xs font-black px-3 py-1 rounded-full shadow-xs inline-flex items-center gap-1">
                                <Award size={13} />
                                {assessment.bli_tier}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 sm:w-auto w-full">
                        <div className="bg-white/10 backdrop-blur-xs rounded-2xl px-3.5 py-2.5 border border-white/10">
                            <span className="text-[10px] font-bold text-emerald-200 block">🌟 강점 역량</span>
                            <span className="text-sm font-black text-white">{strengthMeta.label}</span>
                        </div>
                        <div className="bg-white/10 backdrop-blur-xs rounded-2xl px-3.5 py-2.5 border border-white/10">
                            <span className="text-[10px] font-bold text-amber-200 block">🌱 집중 보완</span>
                            <span className="text-sm font-black text-[#FACC15]">{weakestMeta.label}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. 5-Axis Radar Chart & Fluency WPM Card */}
            <div className={`grid ${compact ? "grid-cols-1" : "lg:grid-cols-12"} gap-4`}>
                {/* 5-Axis Radar Chart */}
                <div className={`${compact ? "" : "lg:col-span-7"} bg-white rounded-[32px] border border-gray-100 p-5 lg:p-7 shadow-[0_4px_20px_rgba(0,0,0,0.03)]`}>
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <h3 className="font-extrabold text-base lg:text-lg text-[#1A1A1A] tracking-tight">
                                5각형 문해력 밸런스 차트
                            </h3>
                            <p className="text-xs text-gray-400 font-medium">
                                어휘 · 사실 · 추론 · 비판 · 읽기 유창성 5대 영역
                            </p>
                            <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                                지문 1편 기준의 참고용 점검 결과이며, 전문적인 진단이 아닙니다.
                            </p>
                        </div>
                    </div>

                    <div className="w-full h-[270px] lg:h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
                                <PolarGrid stroke="#E5E7EB" />
                                <PolarAngleAxis
                                    dataKey="subject"
                                    tick={{ fill: "#1F2937", fontSize: 12, fontWeight: 800 }}
                                />
                                <PolarRadiusAxis
                                    angle={90}
                                    domain={[0, 100]}
                                    tick={{ fontSize: 10, fill: "#9CA3AF" }}
                                    tickCount={5}
                                />
                                <Radar
                                    name={`${childName} 점수`}
                                    dataKey="childScore"
                                    stroke="#16A34A"
                                    strokeWidth={2.5}
                                    fill="#16A34A"
                                    fillOpacity={0.35}
                                />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: "16px",
                                        border: "1px solid #F3F4F6",
                                        fontSize: "12px",
                                        fontWeight: 700,
                                    }}
                                />
                                <Legend wrapperStyle={{ fontSize: "12px", fontWeight: 700 }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* 5 Area Score Pills */}
                    <div className="grid grid-cols-5 gap-1.5 pt-2 border-t border-gray-100">
                        {radarData.map((item) => {
                            const isWeakest = item.key === assessment.weakest_area;
                            return (
                                <div
                                    key={item.key}
                                    className={`rounded-2xl p-2 text-center border ${
                                        isWeakest
                                            ? "bg-amber-50/70 border-amber-200"
                                            : "bg-gray-50/80 border-gray-100"
                                    }`}
                                >
                                    <span className="text-[10px] font-bold text-gray-500 block truncate">
                                        {item.subject.replace("적 이해", "").replace("읽기 ", "")}
                                    </span>
                                    <span
                                        className={`text-sm font-black ${
                                            isWeakest ? "text-amber-600" : "text-[#2E5A44]"
                                        }`}
                                    >
                                        {item.childScore}점
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Fluency (WPM) & Passage Info Card */}
                <div className={`${compact ? "" : "lg:col-span-5"} bg-white rounded-[32px] border border-gray-100 p-5 lg:p-7 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between space-y-4`}>
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-[#16A34A] flex items-center justify-center">
                                <Clock size={18} />
                            </div>
                            <div>
                                <h3 className="font-extrabold text-base text-[#1A1A1A] tracking-tight">
                                    읽기 유창성 (WPM) 분석
                                </h3>
                                <p className="text-[11px] text-gray-400 font-semibold">
                                    정확도를 반영한 분당 유효 독서 어절 수
                                </p>
                            </div>
                        </div>

                        <div className="bg-[#F9FAFB] rounded-2xl p-4 border border-gray-100 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-500">응시 지문</span>
                                <span className="text-xs font-extrabold text-gray-900 truncate max-w-[180px]">
                                    {assessment.passage_title || "맞춤 진단 지문"}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-500">지문 분량 / 소요 시간</span>
                                <span className="text-xs font-extrabold text-gray-900">
                                    {assessment.word_count || 90}어절 · {assessment.reading_time_seconds}초
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-500">유효 읽기 속도</span>
                                <span className="text-sm font-black text-[#16A34A]">
                                    {assessment.effective_wpm} WPM{" "}
                                    <span className="text-[11px] font-bold text-gray-400">
                                        (권장 {normWpm} WPM)
                                    </span>
                                </span>
                            </div>

                            {/* WPM Gauge Bar */}
                            <div className="pt-1">
                                <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-linear-to-r from-[#2E5A44] to-[#16A34A] rounded-full transition-all duration-700"
                                        style={{ width: `${Math.min(wpmPercent, 100)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-[10px] font-bold text-gray-400 mt-1">
                                    <span>천천히 꼼꼼히</span>
                                    <span className="text-[#16A34A]">또래 권장 속도 ({normWpm} WPM)</span>
                                    <span>빠른 독해</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Weak Area Coaching Callout */}
                    <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-4">
                        <div className="flex items-center gap-1.5 text-xs font-black text-[#2E5A44] mb-1">
                            <Sparkles size={14} className="text-[#16A34A]" />
                            맞춤 가정 지도 팁 ({weakestMeta.label})
                        </div>
                        <p className="text-xs text-gray-700 font-medium leading-relaxed break-keep">
                            {assessment.coaching_tip || weakestMeta.coachingGuide}
                        </p>
                    </div>
                </div>
            </div>

            {/* 3. AI Diagnosis Expert Summary */}
            <div className="bg-white rounded-[32px] border border-gray-100 p-6 lg:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                <div
                    className="prose prose-sm lg:prose-base max-w-none text-gray-700 leading-relaxed break-keep prose-headings:text-[#2E5A44] prose-headings:font-black prose-strong:text-gray-900"
                    dangerouslySetInnerHTML={{
                        __html: marked.parse(assessment.ai_diagnosis_summary || "") as string,
                    }}
                />
            </div>

            {/* 4. Prescriptive RAG Book Recommendations (처방형 맞춤 도서 3권) */}
            {assessment.prescribed_books && assessment.prescribed_books.length > 0 && (
                <div className="bg-white rounded-[32px] border border-emerald-100 p-6 lg:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
                        <div>
                            <span className="text-[11px] font-black text-[#16A34A] uppercase tracking-wider block">
                                Prescriptive RAG Curation
                            </span>
                            <h3 className="text-lg lg:text-xl font-black text-[#1A1A1A] tracking-tight mt-0.5">
                                {childName}의{" "}
                                <span className="text-[#16A34A] underline decoration-emerald-200 decoration-4 underline-offset-4">
                                    {weakestMeta.label}
                                </span>
                                을 키워줄 처방 도서
                            </h3>
                        </div>
                        <span className="text-xs font-bold text-gray-400">
                            클릭 시 도서관 대출 현황 및 최저가 구매 연결
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {assessment.prescribed_books.map((book, idx) => (
                            <div
                                key={book.id || idx}
                                onClick={() =>
                                    router.push(`/book/?id=${book.id || book.bookid || "9788997984848"}`)
                                }
                                className="group bg-[#F9FAFB] hover:bg-white rounded-[24px] p-4 border border-gray-100 hover:border-[#16A34A]/40 transition-all duration-300 cursor-pointer flex sm:flex-col gap-4 hover:shadow-md"
                            >
                                <div className="relative w-24 sm:w-full h-32 sm:h-48 rounded-xl overflow-hidden bg-white border border-gray-100 shrink-0">
                                    <OptimizedImage
                                        src={book.coverUrl || book.imgsrc}
                                        alt={book.title}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                                        sizes="(max-width: 640px) 96px, 220px"
                                        sizePreset="thumbnail"
                                    />
                                    <span className="absolute top-2 left-2 bg-[#2E5A44] text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-xs">
                                        {book.prescriptionArea || weakestMeta.shortLabel} 처방
                                    </span>
                                </div>

                                <div className="flex-1 flex flex-col justify-between">
                                    <div>
                                        <h4 className="font-extrabold text-sm text-[#1A1A1A] line-clamp-2 group-hover:text-[#16A34A] transition-colors">
                                            {book.title}
                                        </h4>
                                        <p className="text-xs text-gray-400 font-bold mt-1 truncate">
                                            {book.author} · {book.publisher}
                                        </p>
                                        <p className="text-[11px] text-gray-600 font-medium mt-2 line-clamp-2 leading-relaxed">
                                            {book.prescriptionReason ||
                                                `${weakestMeta.label} 영역을 보완하는 맞춤 추천 도서입니다.`}
                                        </p>
                                    </div>

                                    <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
                                        <BookRating rating={book.rating || 4.8} iconSize={11} className="text-xs" />
                                        <span className="text-[11px] font-extrabold text-[#16A34A] inline-flex items-center gap-0.5">
                                            상세·도서관 확인 <ArrowUpRight size={13} />
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 5. Question-by-Question Review & Grounded Evidence Highlighter */}
            {assessment.answers && assessment.answers.length > 0 && (
                <div className="bg-white rounded-[32px] border border-gray-100 p-6 lg:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                    <div className="flex items-center gap-2 mb-4">
                        <BookOpen size={18} className="text-[#2E5A44]" />
                        <h3 className="font-extrabold text-base lg:text-lg text-[#1A1A1A] tracking-tight">
                            영역별 문항 해설 및 지문 근거 확인
                        </h3>
                    </div>

                    <div className="space-y-3">
                        {assessment.answers.map((ans, idx) => {
                            const isOpen = expandedQIdx === idx;
                            const areaInfo = AREA_METADATA[ans.area] || AREA_METADATA.vocabulary;
                            return (
                                <div
                                    key={ans.question_id || idx}
                                    className="rounded-2xl border border-gray-100 overflow-hidden bg-[#F9FAFB]"
                                >
                                    <button
                                        type="button"
                                        onClick={() => setExpandedQIdx(isOpen ? null : idx)}
                                        className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-100/70 transition-colors"
                                    >
                                        <div className="flex items-center gap-2.5 pr-2">
                                            {ans.is_correct ? (
                                                <CheckCircle2 size={18} className="text-[#16A34A] shrink-0" />
                                            ) : (
                                                <XCircle size={18} className="text-red-500 shrink-0" />
                                            )}
                                            <span
                                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border shrink-0 ${areaInfo.badgeColor}`}
                                            >
                                                {areaInfo.label}
                                            </span>
                                            <span className="text-xs lg:text-sm font-bold text-gray-900 line-clamp-1">
                                                Q{idx + 1}. {ans.question}
                                            </span>
                                        </div>
                                        {isOpen ? (
                                            <ChevronUp size={18} className="text-gray-400 shrink-0" />
                                        ) : (
                                            <ChevronDown size={18} className="text-gray-400 shrink-0" />
                                        )}
                                    </button>

                                    {isOpen && (
                                        <div className="px-4 pb-4 pt-2 bg-white border-t border-gray-100 space-y-3">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {ans.options.map((opt, oIdx) => {
                                                    const isCorrectOpt = oIdx === ans.correct_answer;
                                                    const isSelectedOpt = oIdx === ans.selected;
                                                    return (
                                                        <div
                                                            key={oIdx}
                                                            className={`p-2.5 rounded-xl text-xs font-bold border flex items-start gap-2 ${
                                                                isCorrectOpt
                                                                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                                                                    : isSelectedOpt
                                                                    ? "bg-red-50 border-red-200 text-red-700"
                                                                    : "bg-gray-50 border-gray-100 text-gray-500"
                                                            }`}
                                                        >
                                                            <span className="shrink-0 font-black">
                                                                {oIdx + 1}.
                                                            </span>
                                                            <span className="flex-1">{opt}</span>
                                                            {isCorrectOpt && (
                                                                <span className="text-[10px] font-black text-[#16A34A] shrink-0">
                                                                    정답
                                                                </span>
                                                            )}
                                                            {!isCorrectOpt && isSelectedOpt && (
                                                                <span className="text-[10px] font-black text-red-500 shrink-0">
                                                                    내 선택
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Evidence Highlight Box */}
                                            <div className="bg-emerald-50/40 rounded-xl p-3.5 border border-emerald-100/80 space-y-1.5">
                                                <span className="text-[11px] font-black text-[#2E5A44] block">
                                                    🔍 지문 속 정답 근거 문장 (Grounding Evidence)
                                                </span>
                                                {assessment.passage_content ? (
                                                    renderHighlightedPassage(
                                                        assessment.passage_content,
                                                        ans.evidence
                                                    )
                                                ) : (
                                                    <p className="text-xs font-bold text-[#2E5A44]">
                                                        &ldquo;{ans.evidence}&rdquo;
                                                    </p>
                                                )}
                                            </div>

                                            <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-700 leading-relaxed">
                                                <span className="font-black text-gray-900 mr-1.5">
                                                    💡 해설:
                                                </span>
                                                {ans.explanation}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 6. Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
                {onConsultAI && (
                    <button
                        type="button"
                        onClick={() => onConsultAI(assessment)}
                        className="flex-1 bg-[#16A34A] hover:bg-green-700 text-white font-black py-4 px-6 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 text-sm active:scale-[0.99]"
                    >
                        <MessageSquareHeart size={18} />
                        이 진단 결과로 AI 독서 전문가 상담받기
                    </button>
                )}
                {onRetake && (
                    <button
                        type="button"
                        onClick={onRetake}
                        className="sm:w-auto w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-extrabold py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 text-sm active:scale-[0.99]"
                    >
                        <RotateCcw size={16} />
                        새로운 지문으로 다시 진단하기
                    </button>
                )}
            </div>
        </div>
    );
}

