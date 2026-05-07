import { useEffect, useState } from "react";
import { Book } from "@shared/types";
import BookGrid from "@features/books/BookGrid";
import { ChevronRight, BookX } from "lucide-react";
import { useRouter } from "next/navigation";
import { RECOMMENDATION_TABS } from "@shared/lib/constants";
import EmptyState from "@shared/ui/EmptyState";
import SkeletonLoader from "@shared/ui/SkeletonLoader";

interface RecommendationSectionProps {
    title: string;
    subtitle?: string;
    query: string;
    categoryId?: string;
    backgroundColor?: string;
    limit?: number;
    apiType?: string;
    queryType?: string;
}

export default function RecommendationSection({ title, subtitle, query, categoryId = "1108", backgroundColor = "bg-white", limit, apiType, queryType }: RecommendationSectionProps) {
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // Determine sub-tabs based on the title (which matches the key in RECOMMENDATION_TABS)
    const tabs = RECOMMENDATION_TABS[title] || [];
    const [activeTab, setActiveTab] = useState(tabs.length > 0 ? tabs[0].label : '전체');
    const [sortBy, setSortBy] = useState('SalesPoint'); // Default to Best Selling to ensure results

    // Determine the actual query to use
    // Determine the actual query to use
    const activeTabConfig = tabs.find(t => t.label === activeTab);
    const currentQuery = activeTabConfig?.query || query;
    const currentCategoryId = activeTabConfig?.categoryId || categoryId;
    const currentApiType = activeTabConfig?.apiType || 'ItemSearch';
    const currentQueryType = (currentApiType === 'ItemList') 
        ? (sortBy === 'PublishTime' ? 'ItemNewAll' : 'Bestseller')
        : (activeTabConfig?.queryType || 'Bestseller');

    const [displayCount, setDisplayCount] = useState(12); // Initial display count

    // Reset display count when tab or sort changes
    useEffect(() => {
        setDisplayCount(12);
    }, [currentQuery, sortBy, currentCategoryId]);

    const handleShowMore = () => {
        setDisplayCount(prev => prev + 12);
    };

    useEffect(() => {
        const fetchBooks = async () => {
            setLoading(true);
            try {
                let items = [];

                // Existing logic for Aladin API
                // Determine sort param
                // PublishTime: Newest, SalesPoint: Best Selling, Accuracy: Relevance
                const fetchUrl = `/api/recommendations?query=${encodeURIComponent(currentQuery)}&categoryId=${currentCategoryId}&sort=${sortBy}&apiType=${currentApiType}&queryType=${currentQueryType}&_t=${Date.now()}`;
                console.log(`Fetching Aladin: ${fetchUrl}`);
                const res = await fetch(fetchUrl);
                if (!res.ok) throw new Error("Failed");
                const data = await res.json();
                console.log('Aladin Data:', data);
                if (data.item) {
                    items = limit ? data.item.slice(0, limit) : data.item;
                    const mappedBooks: Book[] = items.map((item: any) => ({
                        id: String(item.isbn13 || item.isbn),
                        bookid: String(item.isbn13 || item.isbn),
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
    }, [currentQuery, currentCategoryId, sortBy, limit, title, activeTab]);

    if (!loading && books.length === 0) return (
        <section className={`py-16 px-6 ${backgroundColor}`}>
            <div className="max-w-7xl mx-auto">
                <EmptyState
                    icon={BookX}
                    title={title}
                    description="추천 도서를 불러올 수 없거나, 조건에 맞는 책이 없습니다."
                    actionLabel="홈으로 돌아가기"
                    onAction={() => router.push('/')}
                />
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
                    <SkeletonLoader count={4} type="card" />
                ) : (
                    <>
                        <BookGrid books={books.slice(0, limit || displayCount)} onSelectBook={(book) => router.push(`/book/${book.id}`)} size="small" />

                        {/* Show More Button */}
                        {!limit && books.length > displayCount && (
                            <div className="mt-10 text-center">
                                <button
                                    onClick={handleShowMore}
                                    className="px-8 py-3 bg-white border border-gray-200 rounded-full text-gray-600 font-bold hover:bg-gray-50 hover:text-gray-900 transition-all shadow-sm"
                                >
                                    더보기 ({Math.min(displayCount, books.length)} / {books.length})
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </section>
    );
}
