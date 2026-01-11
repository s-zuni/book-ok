import { useEffect, useState } from "react";
import { Book } from "../types";
import BookGrid from "./BookGrid";
import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { RECOMMENDATION_TABS } from "../lib/constants";

interface RecommendationSectionProps {
    title: string;
    subtitle?: string;
    query: string;
    categoryId?: string;
    backgroundColor?: string;
    limit?: number;
}

export default function RecommendationSection({ title, subtitle, query, categoryId = "1108", backgroundColor = "bg-white", limit }: RecommendationSectionProps) {
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // Determine sub-tabs based on the title (which matches the key in RECOMMENDATION_TABS)
    const tabs = RECOMMENDATION_TABS[title] || [];
    const [activeTab, setActiveTab] = useState(tabs.length > 0 ? tabs[0].label : '전체');
    const [sortBy, setSortBy] = useState('PublishTime'); // Default to Latest

    // Determine the actual query to use
    const currentQuery = tabs.find(t => t.label === activeTab)?.query || query;

    useEffect(() => {
        const fetchBooks = async () => {
            setLoading(true);
            try {
                // Determine sort param
                // PublishTime: Newest, SalesPoint: Best Selling, Accuracy: Relevance
                const res = await fetch(`/api/recommendations?query=${encodeURIComponent(currentQuery)}&categoryId=${categoryId}&sort=${sortBy}`);
                if (!res.ok) throw new Error("Failed");
                const data = await res.json();
                if (data.item) {
                    const items = limit ? data.item.slice(0, limit) : data.item;
                    const mappedBooks: Book[] = items.map((item: any) => ({
                        id: item.isbn13 || item.isbn,
                        bookid: item.isbn13 || item.isbn,
                        title: item.title,
                        author: item.author,
                        imgsrc: item.cover, // Ensures high res if available
                        category: item.categoryName,
                        pubDate: item.pubDate,
                        description: item.description
                    }));
                    setBooks(mappedBooks);
                } else {
                    setBooks([]);
                }
            } catch (err) {
                console.error(err);
                setBooks([]);
            } finally {
                setLoading(false);
            }
        };
        fetchBooks();
    }, [currentQuery, categoryId, sortBy, limit]);

    if (!loading && books.length === 0) return (
        <section className={`py-16 px-6 ${backgroundColor}`}>
            <div className="max-w-7xl mx-auto text-center text-gray-500">
                <h2 className="text-2xl font-black text-gray-900 mb-2">{title}</h2>
                <p>추천 도서 정보를 불러올 수 없습니다.</p>
            </div>
        </section>
    );

    return (
        <section className={`py-8 bg-transparent`}>
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 mb-2">{title}</h2>
                        {subtitle && <p className="text-gray-500">{subtitle}</p>}
                    </div>
                </div>

                {/* Sub-tabs & Filter */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    {/* Tabs */}
                    {tabs.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.label}
                                    onClick={() => setActiveTab(tab.label)}
                                    className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${activeTab === tab.label
                                            ? 'bg-gray-900 text-white shadow-lg shadow-gray-200'
                                            : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Sort Filter */}
                    <div className="flex items-center gap-2 bg-white rounded-xl p-1 border border-gray-100 shadow-sm ml-auto md:ml-0">
                        <button
                            onClick={() => setSortBy('PublishTime')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${sortBy === 'PublishTime' ? 'bg-green-100 text-green-700' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            최신순
                        </button>
                        <div className="w-px h-3 bg-gray-200"></div>
                        <button
                            onClick={() => setSortBy('SalesPoint')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${sortBy === 'SalesPoint' ? 'bg-green-100 text-green-700' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            인기순
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="space-y-3">
                                <div className="aspect-[1/1.4] bg-white rounded-2xl animate-pulse shadow-sm border border-gray-50" />
                                <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse" />
                                <div className="h-3 bg-gray-50 rounded w-1/2 animate-pulse" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <BookGrid books={books} onSelectBook={(book) => router.push(`/book/${book.id}`)} size="small" />
                )}
            </div>
        </section>
    );
}
