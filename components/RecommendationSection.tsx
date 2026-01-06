"use client";

import { useEffect, useState } from "react";
import { Book } from "../types";
import BookGrid from "./BookGrid";
import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface RecommendationSectionProps {
    title: string;
    subtitle?: string;
    query: string;
    categoryId?: string;
    backgroundColor?: string;
}

export default function RecommendationSection({ title, subtitle, query, categoryId = "1108", backgroundColor = "bg-white" }: RecommendationSectionProps) {
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchBooks = async () => {
            try {
                const res = await fetch(`/api/recommendations?query=${encodeURIComponent(query)}&categoryId=${categoryId}`);
                if (!res.ok) throw new Error("Failed");
                const data = await res.json();
                if (data.item) {
                    const mappedBooks: Book[] = data.item.slice(0, 4).map((item: any) => ({ // Limit to 4 for homepage
                        id: item.isbn13 || item.isbn,
                        bookid: item.isbn13 || item.isbn,
                        title: item.title,
                        author: item.author,
                        imgsrc: item.cover,
                        category: item.categoryName,
                        pubDate: item.pubDate,
                        description: item.description
                    }));
                    setBooks(mappedBooks);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchBooks();
    }, [query, categoryId]);

    if (!loading && books.length === 0) return null;

    return (
        <section className={`py-16 px-6 ${backgroundColor}`}>
            <div className="max-w-7xl mx-auto">
                <div className="flex items-end justify-between mb-8">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">{title}</h2>
                        {subtitle && <p className="text-gray-500">{subtitle}</p>}
                    </div>
                    {/* View All - For now just a placeholder or could link to search */}
                    <button onClick={() => router.push(`/search?q=${encodeURIComponent(query)}`)} className="text-gray-400 hover:text-green-600 font-bold flex items-center gap-1 text-sm transition-colors">
                        전체보기 <ChevronRight size={16} />
                    </button>
                </div>

                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="space-y-3">
                                <div className="aspect-[1/1.4] bg-gray-100 rounded-2xl animate-pulse" />
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
