"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { Book, Review, Child } from "../../../types";
import { Star, ChevronLeft, Bookmark, BookOpen, Check } from "lucide-react";
import Header from "../../../components/Header";
import Sidebar from "../../../components/Sidebar";
import { useAuth } from "../../../context/AuthContext";
import ChildSelectionModal from "../../../components/ChildSelectionModal";

export default function BookDetailPage() {
    const params = useParams();
    const bookId = params.id as string;
    const router = useRouter();

    const [book, setBook] = useState<Book | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [isApiBook, setIsApiBook] = useState(false);

    // Auth & Sidebar state
    const { user } = useAuth();
    const [userChildren, setUserChildren] = useState<Child[]>([]);
    const [activeChild, setActiveChild] = useState<Child | null>(null);
    const [activeMenu, setActiveMenu] = useState<any>('rec');
    const [activeSubMenu, setActiveSubMenu] = useState('');

    // Additional Actions State
    const [isScrapped, setIsScrapped] = useState(false);
    const [isRead, setIsRead] = useState(false);
    const [showChildModal, setShowChildModal] = useState(false);

    // Review form state
    const [newRating, setNewRating] = useState(0);
    const [newReviewText, setNewReviewText] = useState("");


    useEffect(() => {
        const fetchBook = async () => {
            setLoading(true);

            // 1. Try Supabase first
            const { data: sbBook } = await supabase.from('books').select('*').eq('id', bookId).single();
            if (sbBook) {
                setBook(sbBook);
                setIsApiBook(false);
                setLoading(false);
                return;
            }

            // 2. If not in DB, try Aladin API
            try {
                const res = await fetch(`/api/book?isbn=${bookId}`);
                if (!res.ok) throw new Error('Failed to fetch from API');

                const data = await res.json();
                if (data.item && data.item.length > 0) {
                    const apiItem = data.item[0];
                    const mappedBook: Book = {
                        id: apiItem.isbn13 || apiItem.isbn,
                        bookid: apiItem.isbn13 || apiItem.isbn,
                        title: apiItem.title,
                        author: apiItem.author,
                        imgsrc: apiItem.cover, // API usually returns generic, but searched items might have big cover if specified
                        category: apiItem.categoryName,
                        pubDate: apiItem.pubDate,
                        description: apiItem.description
                    };
                    setBook(mappedBook);
                    setIsApiBook(true);
                }
            } catch (error) {
                console.error(error);
            }

            setLoading(false);
        };

        fetchBook();
        fetchReviews();

        // Fetch user children
        if (user) {
            supabase.from('children').select('*').eq('profile_id', user.id).then(({ data }) => {
                if (data && data.length > 0) {
                    setUserChildren(data);
                    setActiveChild(data[0]); // Default active for sidebar
                }
            });
            // Check if book is already read (simplified check)
            // In a real app, we'd check `read_books` table for any of the user's children
        }

    }, [bookId, user]);

    const fetchReviews = async () => {
        const { data } = await supabase.from('reviews')
            .select('*, profiles(nickname)')
            .eq('book_id', bookId)
            .order('created_at', { ascending: false });

        if (data) setReviews(data as any);
    };

    // Helper to ensure book exists in DB before linking actions
    const ensureBookInDB = async () => {
        if (isApiBook && book) {
            const { error: insertError } = await supabase.from('books').upsert({
                id: book.id,
                title: book.title,
                author: book.author,
                imgsrc: book.imgsrc,
                category: book.category,
                description: book.description,
            }, { onConflict: 'id' });

            if (insertError) {
                alert("도서 저장 실패: " + insertError.message);
                return false;
            }
            setIsApiBook(false);
            return true;
        }
        return true; // Already in DB
    };

    const handleScrap = async () => {
        if (!user) return alert("로그인이 필요합니다.");
        await ensureBookInDB();
        setIsScrapped(!isScrapped);
        // Implement actual scrap logic if needed
        alert(isScrapped ? "스크랩을 취소했습니다." : "책을 스크랩했습니다!");
    };

    const handleMarkRead = async () => {
        if (!user) return alert("로그인이 필요합니다.");
        if (userChildren.length === 0) return alert("먼저 자녀 프로필을 등록해주세요.");

        await ensureBookInDB();
        setShowChildModal(true);
    };

    const handleChildSelect = async (childId: string) => {
        if (!book) return;

        try {
            const { error } = await supabase.from('read_books').insert({
                user_id: user?.id,
                child_id: childId,
                book_id: book.id,
                read_date: new Date().toISOString()
            });

            if (error) throw error;

            alert("읽은 책으로 기록되었습니다!");
            setIsRead(true);
            setShowChildModal(false);
        } catch (err: any) {
            console.error(err);
            alert("저장 중 오류가 발생했습니다: " + err.message);
        }
    };

    const handleSubmitReview = async () => {
        if (!user || !newRating || !newReviewText) return;

        await ensureBookInDB(); // Ensure book is saved first

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

    return (
        <div className="min-h-screen bg-[#FDFDFD] text-gray-900 font-sans pb-24 lg:pb-0">
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

            <div className="max-w-7xl mx-auto px-6 py-8 lg:py-12 flex flex-col lg:flex-row gap-8 lg:gap-12">
                <div className="hidden lg:block">
                    <Sidebar
                        activeChild={activeChild}
                        activeMenu={activeMenu}
                        activeSubMenu={activeSubMenu}
                        setActiveSubMenu={setActiveSubMenu}
                    />
                </div>

                <main className="flex-1 min-h-[600px]">
                    <button onClick={() => router.back()} className="mb-6 flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold">
                        <ChevronLeft size={20} /> 목록으로 돌아가기
                    </button>

                    <div className="bg-white rounded-[2.5rem] p-6 lg:p-10 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-8 mb-10 transition-all">
                        {loading && !book ? (
                            // Inline Loading Skeleton
                            <>
                                <div className="w-40 md:w-48 h-56 md:h-64 bg-gray-100 rounded-xl animate-pulse mx-auto md:mx-0" />
                                <div className="flex-1 space-y-4 pt-4">
                                    <div className="h-6 w-20 bg-gray-100 rounded-full animate-pulse" />
                                    <div className="h-10 w-3/4 bg-gray-100 rounded-xl animate-pulse" />
                                    <div className="h-4 w-1/2 bg-gray-100 rounded-full animate-pulse" />
                                    <div className="h-24 w-full bg-gray-100 rounded-xl animate-pulse" />
                                </div>
                            </>
                        ) : book ? (
                            <>
                                <div className="flex justify-center md:block">
                                    <img src={book.imgsrc} alt={book.title} className="w-40 md:w-48 h-56 md:h-64 object-cover rounded-xl shadow-md" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-start justify-between">
                                        <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-black mb-3">{book.category}</span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleScrap}
                                                className={`p-2 rounded-full border transition-all ${isScrapped ? 'bg-yellow-50 border-yellow-200 text-yellow-500' : 'border-gray-100 text-gray-400 hover:bg-gray-50'}`}
                                                title="스크랩"
                                            >
                                                <Bookmark size={20} fill={isScrapped ? "currentColor" : "none"} />
                                            </button>
                                            <button
                                                onClick={handleMarkRead}
                                                className={`p-2 rounded-full border transition-all ${isRead ? 'bg-green-50 border-green-200 text-green-600' : 'border-gray-100 text-gray-400 hover:bg-gray-50'}`}
                                                title="읽은 책 표시"
                                            >
                                                {isRead ? <Check size={20} /> : <BookOpen size={20} />}
                                            </button>
                                        </div>
                                    </div>
                                    <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">{book.title}</h1>
                                    <p className="text-gray-500 font-medium mb-6">{book.author} | {book.pubDate}</p>
                                    {book.description && <p className="text-gray-600 leading-relaxed mb-6 text-sm">{book.description}</p>}
                                </div>
                            </>
                        ) : (
                            <div className="p-10 text-center text-gray-400 font-bold w-full">도서 정보를 찾을 수 없습니다.</div>
                        )}
                    </div>

                    {/* Reviews */}
                    <div className="mb-20">
                        <h3 className="text-xl font-black mb-6">리뷰 ({reviews.length})</h3>

                        {user ? (
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
                        ) : (
                            <div className="bg-gray-50 p-6 rounded-2xl mb-8 text-center text-gray-500 font-bold">
                                리뷰를 작성하려면 로그인이 필요합니다.
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
                            {reviews.length === 0 && <p className="text-gray-400 font-medium text-center py-8">아직 작성된 리뷰가 없습니다. 첫 리뷰를 남겨주세요!</p>}
                        </div>
                    </div>
                </main>
            </div>

            <ChildSelectionModal
                isOpen={showChildModal}
                onClose={() => setShowChildModal(false)}
                childrenList={userChildren}
                onSelect={handleChildSelect}
            />
        </div>
    );
}
