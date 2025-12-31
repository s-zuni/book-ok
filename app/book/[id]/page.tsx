"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { Book, Review, Child } from "../../../types";
import { Star, ChevronLeft } from "lucide-react";
import Header from "../../../components/Header";
import Sidebar from "../../../components/Sidebar";
import { useAuth } from "../../../context/AuthContext";

export default function BookDetailPage() {
    const params = useParams();
    const bookId = params.id as string;
    const router = useRouter();

    const [book, setBook] = useState<Book | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);

    // Auth & Sidebar state
    const { user } = useAuth();
    const [activeChild, setActiveChild] = useState<Child | null>(null);
    const [activeMenu, setActiveMenu] = useState<any>('rec');
    const [activeSubMenu, setActiveSubMenu] = useState('');

    // Review form state
    const [newRating, setNewRating] = useState(0);
    const [newReviewText, setNewReviewText] = useState("");


    useEffect(() => {
        // 1. Fetch Book Details
        // Logic: If ID is numeric, try Supabase. If not, we might need a different strategy. 
        // For this prototype, we'll try Supabase first.
        // Ideally, we should have a transparent 'getBookById' API.

        // Fallback: If passed via state (not possible with refresh).
        // Let's implement Supabase fetch for now.

        const fetchBook = async () => {
            setLoading(true);

            // Try Supabase first
            const { data: sbBook } = await supabase.from('books').select('*').eq('id', bookId).single();
            if (sbBook) {
                setBook(sbBook);
                setLoading(false);
                return;
            }

            // If not found in Supabase, and it's an ISBN (Search result), we might need to query API again.
            // For now, if not in DB, we can't show it easily on refresh without an external API lookup function.
            // We will assume for this step that we are dealing with DB books or allow passing data via query params in future updates.

            // Mock fallback for non-DB books for demonstration if needed:
            // if (bookId.startsWith('http')) { ... }

            setLoading(false);
        };

        fetchBook();
        fetchReviews();

        // Fetch active child for context
        if (user) {
            supabase.from('children').select('*').eq('profile_id', user.id).then(({ data }) => {
                if (data && data.length > 0) setActiveChild(data[0]);
            });
        }

    }, [bookId, user]);

    const fetchReviews = async () => {
        const { data } = await supabase.from('reviews')
            .select('*, profiles(nickname)')
            .eq('book_id', bookId)
            .order('created_at', { ascending: false });

        if (data) setReviews(data as any);
    };

    const handleSubmitReview = async () => {
        if (!user || !newRating || !newReviewText) return;

        const { error } = await supabase.from('reviews').insert({
            book_id: bookId,
            user_id: user.id,
            rating: newRating,
            review_text: newReviewText,
            profile_id: user.id
        });

        if (!error) {
            setNewRating(0);
            setNewReviewText("");
            fetchReviews();
        } else {
            alert("리뷰 작성 실패: " + error.message);
        }
    };

    const dummySetView = () => { };

    if (loading) return <div className="p-20 text-center">Loading...</div>;
    if (!book && !loading) return <div className="p-20 text-center">Book not found. (Note: Only Supabase books persist on refresh currently)</div>;

    return (
        <div className="min-h-screen bg-[#FDFDFD] text-gray-900 font-sans">
            <Header
                view="main"
                setView={dummySetView}
                activeMenu={activeMenu}
                setActiveMenu={setActiveMenu}
                setActiveSubMenu={setActiveSubMenu}
                searchQuery=""
                setSearchQuery={() => { }}
                handleSearch={() => { }}
            />

            <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col lg:flex-row gap-12">
                <Sidebar
                    activeChild={activeChild}
                    activeMenu={activeMenu}
                    activeSubMenu={activeSubMenu}
                    setActiveSubMenu={setActiveSubMenu}
                />

                <main className="flex-1 min-h-[600px]">
                    <button onClick={() => router.back()} className="mb-6 flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold">
                        <ChevronLeft size={20} /> 목록으로 돌아가기
                    </button>

                    <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100 flex gap-8 mb-10">
                        <img src={book?.imgsrc} alt={book?.title} className="w-48 h-64 object-cover rounded-xl shadow-md" />
                        <div>
                            <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-black mb-3">{book?.category}</span>
                            <h1 className="text-3xl font-black text-gray-900 mb-2">{book?.title}</h1>
                            <p className="text-gray-500 font-medium mb-6">{book?.author} | {book?.pubDate}</p>
                            {book?.description && <p className="text-gray-600 leading-relaxed mb-6">{book.description}</p>}
                        </div>
                    </div>

                    {/* Reviews */}
                    <div className="mb-20">
                        <h3 className="text-xl font-black mb-6">리뷰 ({reviews.length})</h3>

                        {user && (
                            <div className="bg-gray-50 p-6 rounded-2xl mb-8">
                                <div className="flex gap-2 mb-4">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button key={star} onClick={() => setNewRating(star)} className={`${newRating >= star ? 'text-yellow-400' : 'text-gray-300'}`}>
                                            <Star size={24} fill={newRating >= star ? "currentColor" : "none"} />
                                        </button>
                                    ))}
                                </div>
                                <textarea
                                    className="w-full p-4 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-green-200 mb-3"
                                    placeholder="이 책에 대한 평을 남겨주세요..."
                                    value={newReviewText}
                                    onChange={(e) => setNewReviewText(e.target.value)}
                                />
                                <button onClick={handleSubmitReview} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700">리뷰 등록</button>
                            </div>
                        )}

                        <div className="space-y-4">
                            {reviews.map(review => (
                                <div key={review.id} className="bg-white p-6 rounded-2xl border border-gray-100">
                                    <div className="flex justify-between mb-2">
                                        <span className="font-bold">{review.profiles?.nickname || '사용자'}</span>
                                        <div className="flex text-yellow-400">
                                            {[...Array(review.rating)].map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
                                        </div>
                                    </div>
                                    <p className="text-gray-600">{review.review_text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
