"use client";

import { useEffect, useState } from "react";
import { Book } from "../../types";
import BookGrid from "../BookGrid";
import { Sparkles, TrendingUp, AlertCircle, BarChart3 } from "lucide-react";

interface AIRecommendationListProps {
    keywords: string[];
    readBooks?: Book[]; // 아이가 읽은 책 목록 (장르 분석용)
}

interface GenreDistribution {
    genre: string;
    count: number;
    percentage: number;
}

// 주요 장르 카테고리 매핑
const GENRE_CATEGORIES: Record<string, { keywords: string[]; label: string; categoryId: string }> = {
    '창작동화': { keywords: ['창작동화', '동화', '문학'], label: '창작/문학', categoryId: '1108' },
    '과학': { keywords: ['과학', '자연', '실험'], label: '과학/자연', categoryId: '1137' },
    '역사': { keywords: ['역사', '인물', '위인'], label: '역사/인물', categoryId: '1109' },
    '예술': { keywords: ['예술', '음악', '미술', '그림'], label: '예술/음악', categoryId: '1177' },
    '사회': { keywords: ['사회', '직업', '경제'], label: '사회/경제', categoryId: '1181' },
    '철학': { keywords: ['철학', '사고력', '인성'], label: '철학/인성', categoryId: '1132' },
    '수학': { keywords: ['수학', '논리', '숫자'], label: '수학/논리', categoryId: '1175' },
    '영어': { keywords: ['영어', 'English', '외국어'], label: '영어/외국어', categoryId: '1186' },
};

// 모든 장르 목록
const ALL_GENRES = Object.keys(GENRE_CATEGORIES);

export default function AIRecommendationList({ keywords, readBooks = [] }: AIRecommendationListProps) {
    const [preferredBooks, setPreferredBooks] = useState<Book[]>([]);
    const [balancedBooks, setBalancedBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);
    const [genreDistribution, setGenreDistribution] = useState<GenreDistribution[]>([]);
    const [missingGenres, setMissingGenres] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<'preferred' | 'balanced'>('preferred');

    // 장르 분석 함수
    const analyzeGenreDistribution = (books: Book[]): GenreDistribution[] => {
        const genreCount: Record<string, number> = {};

        books.forEach(book => {
            const category = book.category || '';
            let matched = false;

            for (const [genre, config] of Object.entries(GENRE_CATEGORIES)) {
                if (config.keywords.some(kw => category.includes(kw))) {
                    genreCount[genre] = (genreCount[genre] || 0) + 1;
                    matched = true;
                    break;
                }
            }

            if (!matched && category) {
                genreCount['기타'] = (genreCount['기타'] || 0) + 1;
            }
        });

        const total = books.length || 1;
        return Object.entries(genreCount)
            .map(([genre, count]) => ({
                genre,
                count,
                percentage: Math.round((count / total) * 100)
            }))
            .sort((a, b) => b.count - a.count);
    };

    // 부족한 장르 찾기
    const findMissingGenres = (distribution: GenreDistribution[]): string[] => {
        const readGenres = distribution.map(d => d.genre);
        return ALL_GENRES.filter(g => !readGenres.includes(g));
    };

    useEffect(() => {
        const fetchBooks = async () => {
            setLoading(true);

            try {
                // 1. 장르 분석
                const distribution = analyzeGenreDistribution(readBooks);
                setGenreDistribution(distribution);

                const missing = findMissingGenres(distribution);
                setMissingGenres(missing);

                // 2. 선호 장르 기반 추천 (기존 키워드 + 선호 장르)
                const query = keywords.slice(0, 2).join(' ');
                const preferredRes = await fetch(
                    `/api/recommendations?query=${encodeURIComponent(query)}&categoryId=1108&sort=SalesPoint`
                );

                if (preferredRes.ok) {
                    const data = await preferredRes.json();
                    if (data.item) {
                        const mapped: Book[] = data.item.map((item: any) => ({
                            id: item.isbn13 || item.isbn,
                            bookid: item.isbn13 || item.isbn,
                            title: item.title,
                            author: item.author,
                            imgsrc: item.cover,
                            category: item.categoryName,
                            pubDate: item.pubDate,
                            description: item.description
                        }));
                        setPreferredBooks(mapped);
                    }
                }

                // 3. 부족한 장르 기반 균형 추천
                if (missing.length > 0) {
                    const balancedBooksResult: Book[] = [];

                    // 부족한 장르별로 2권씩 추천
                    for (const genre of missing.slice(0, 3)) {
                        const config = GENRE_CATEGORIES[genre];
                        if (!config) continue;

                        const balancedRes = await fetch(
                            `/api/recommendations?query=${encodeURIComponent(config.keywords[0])}&categoryId=${config.categoryId}&sort=SalesPoint&maxResults=4`
                        );

                        if (balancedRes.ok) {
                            const data = await balancedRes.json();
                            if (data.item) {
                                const mapped: Book[] = data.item.slice(0, 2).map((item: any) => ({
                                    id: item.isbn13 || item.isbn,
                                    bookid: item.isbn13 || item.isbn,
                                    title: item.title,
                                    author: item.author,
                                    imgsrc: item.cover,
                                    category: item.categoryName,
                                    pubDate: item.pubDate,
                                    description: item.description
                                }));
                                balancedBooksResult.push(...mapped);
                            }
                        }
                    }

                    setBalancedBooks(balancedBooksResult);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (keywords.length > 0) {
            fetchBooks();
        }
    }, [keywords, readBooks]);

    if (!loading && preferredBooks.length === 0 && balancedBooks.length === 0) return null;

    return (
        <div className="mt-12 space-y-6 animate-in slide-in-from-bottom-10">
            {/* 장르 분석 요약 */}
            {genreDistribution.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <BarChart3 size={20} className="text-blue-500" />
                        <h4 className="font-bold text-gray-900">독서 장르 분포</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {genreDistribution.slice(0, 5).map((item) => (
                            <div
                                key={item.genre}
                                className="px-3 py-2 bg-blue-50 rounded-xl text-sm"
                            >
                                <span className="font-bold text-blue-700">{item.genre}</span>
                                <span className="text-blue-500 ml-1">{item.percentage}%</span>
                            </div>
                        ))}
                    </div>
                    {missingGenres.length > 0 && (
                        <div className="mt-4 flex items-start gap-2 text-sm">
                            <AlertCircle size={16} className="text-orange-500 shrink-0 mt-0.5" />
                            <p className="text-gray-600">
                                <span className="font-bold text-orange-600">부족한 분야: </span>
                                {missingGenres.slice(0, 4).map(g => GENRE_CATEGORIES[g]?.label || g).join(', ')}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* 탭 전환 */}
            <div className="flex gap-2">
                <button
                    onClick={() => setActiveTab('preferred')}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'preferred'
                            ? 'bg-green-600 text-white shadow-lg'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    <Sparkles size={16} className="inline mr-1" />
                    선호 분야 추천
                </button>
                <button
                    onClick={() => setActiveTab('balanced')}
                    disabled={balancedBooks.length === 0}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'balanced'
                            ? 'bg-orange-500 text-white shadow-lg'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    <TrendingUp size={16} className="inline mr-1" />
                    균형 독서 추천
                </button>
            </div>

            {/* 추천 도서 목록 */}
            <div className={`rounded-[2.5rem] border p-8 lg:p-10 ${activeTab === 'preferred'
                    ? 'bg-green-50 border-green-100'
                    : 'bg-orange-50 border-orange-100'
                }`}>
                <div className="flex items-center gap-3 mb-6">
                    <div className={`p-2.5 rounded-xl shadow-sm ${activeTab === 'preferred'
                            ? 'bg-white text-green-600'
                            : 'bg-white text-orange-500'
                        }`}>
                        {activeTab === 'preferred' ? <Sparkles size={24} fill="currentColor" /> : <TrendingUp size={24} />}
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-gray-900">
                            {activeTab === 'preferred' ? 'AI 맞춤 추천 도서' : '균형 독서 추천'}
                        </h3>
                        <p className={`text-sm font-bold ${activeTab === 'preferred' ? 'text-green-600/80' : 'text-orange-600/80'
                            }`}>
                            {activeTab === 'preferred'
                                ? '분석된 성향을 바탕으로 엄선했습니다'
                                : '부족한 분야를 보완하는 책들입니다'}
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="space-y-3">
                                <div className="aspect-[1/1.4] bg-white/50 rounded-2xl animate-pulse" />
                                <div className="h-4 bg-white/50 rounded w-3/4 animate-pulse" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        <BookGrid
                            books={(activeTab === 'preferred' ? preferredBooks : balancedBooks).slice(0, 8)}
                            onSelectBook={(book) => window.open(`/book/${book.id}`, '_self')}
                            size="small"
                        />
                        <p className={`text-center text-xs font-bold mt-6 opacity-60 ${activeTab === 'preferred' ? 'text-green-600' : 'text-orange-600'
                            }`}>
                            * 도서 클릭 시 상세 페이지로 이동합니다
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}

