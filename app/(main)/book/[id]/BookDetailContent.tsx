"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@shared/lib/supabase";
import { Book, Review, Child } from "@shared/types";
import { Star, ChevronLeft, Bookmark, BookOpen, Check, Building, MapPin } from "lucide-react";
import Header from "@shared/ui/Header";
import Sidebar from "@shared/ui/Sidebar";
import { useAuth } from "@features/auth/AuthContext";
import { useLoginModal } from "@features/auth/LoginModalContext";
import ChildSelectionModal from "@features/children/ChildSelectionModal";
import { toast } from "sonner";

export default function BookDetailContent() {
    const params = useParams();
    const bookId = params.id as string;
    const router = useRouter();

    const [book, setBook] = useState<Book | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [isApiBook, setIsApiBook] = useState(false);

    // Auth & Sidebar state
    const { user, children, userProfile } = useAuth();
    
    // Library holding status state
    const [libraryStatus, setLibraryStatus] = useState<Array<{ libCode: string; libName: string; hasBook: string; loanAvailable: string }>>([]);
    const [libraryStatusLoading, setLibraryStatusLoading] = useState(false);
    const { openLoginModal } = useLoginModal();
    const [userChildren, setUserChildren] = useState<Child[]>([]);
    const [activeChild, setActiveChild] = useState<Child | null>(null);
    const [activeMenu, setActiveMenu] = useState<any>('rec');
    const [activeSubMenu, setActiveSubMenu] = useState('');

    // Additional Actions State
    const [isScrapped, setIsScrapped] = useState(false);
    const [isRead, setIsRead] = useState(false);
    const [showChildModal, setShowChildModal] = useState(false);

    // Sync activeChild with global children list
    useEffect(() => {
        if (!activeChild && children.length > 0) {
            setActiveChild(children[0]);
        }
        setUserChildren(children); // Keep local for modal if needed, or switch modal to use global
    }, [children, activeChild]);

    // Review form state
    const [newRating, setNewRating] = useState(0);
    const [newReviewText, setNewReviewText] = useState("");


    useEffect(() => {
        const fetchBook = async () => {
            setLoading(true);

            // 1. Try Supabase first
            const { data: sbBook } = await supabase.from('books').select('*').eq('id', bookId).maybeSingle();
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
                        imgsrc: apiItem.cover,
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
            supabase.from('children').select('*').eq('parent_id', user.id).then(({ data }) => {
                if (data && data.length > 0) {
                    setUserChildren(data);
                    setActiveChild(data[0]);
                } else {
                    setUserChildren([]);
                    setActiveChild(null);
                }
            });
        } else {
            setUserChildren([]);
            setActiveChild(null);
        }
    }, [bookId, user]);

    // Check interaction status (Read/Scrap)
    useEffect(() => {
        if (!user || !book) return;

        const checkInteractions = async () => {
            // Check Read Status (Any child read this book?)
            const { data } = await supabase.from('read_books')
                .select('id')
                .eq('book_id', book.id)
                .eq('user_id', user.id)
                .limit(1);

            if (data && data.length > 0) {
                setIsRead(true);
            }
        };

        checkInteractions();
    }, [user, book]);

    // Fetch holding status for favorite libraries
    useEffect(() => {
        const checkLibraryHoldings = async () => {
            const rawLibs = userProfile?.favorite_libraries;
            const favoriteLibs = Array.isArray(rawLibs) ? rawLibs : [];
            if (!book || favoriteLibs.length === 0) {
                setLibraryStatus([]);
                return;
            }

            setLibraryStatusLoading(true);
            try {
                const libCodes = favoriteLibs.map(l => l.libCode).join(',');
                const isbn = book.id || book.bookid || bookId;
                
                const res = await fetch(`/api/library/book-status?isbn=${isbn}&libCodes=${libCodes}`);
                if (!res.ok) throw new Error("도서관 소장 여부 조회 실패");
                const data = await res.json();
                
                // Map the results back to include the library names
                const statusResults = (data.results || []).map((result: any) => {
                    const libInfo = favoriteLibs.find(l => String(l.libCode) === String(result.libCode));
                    return {
                        libCode: result.libCode,
                        libName: libInfo?.libName || "알 수 없는 도서관",
                        hasBook: result.hasBook,
                        loanAvailable: result.loanAvailable
                    };
                });
                
                setLibraryStatus(statusResults);
            } catch (err) {
                console.error(err);
            } finally {
                setLibraryStatusLoading(false);
            }
        };

        checkLibraryHoldings();
    }, [userProfile, book, bookId]);

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
                bookid: book.bookid || book.id, // Ensure bookid is present
                title: book.title,
                author: book.author,
                imgsrc: book.imgsrc,
                category: book.category,
                description: book.description,
            }, { onConflict: 'id' });

            if (insertError) {
                toast.error("도서 저장 실패: " + insertError.message);
                return false;
            }
            setIsApiBook(false);
            return true;
        }
        return true; // Already in DB
    };

    const handleScrap = async () => {
        if (!user) return openLoginModal();
        await ensureBookInDB();
        setIsScrapped(!isScrapped);
        // Implement actual scrap logic if needed
        toast.success(isScrapped ? "스크랩을 취소했습니다." : "책을 스크랩했습니다!");
    };

    const handleMarkRead = async () => {
        if (!user) return openLoginModal();
        if (userChildren.length === 0) return toast.error("먼저 자녀 프로필을 등록해주세요.");

        await ensureBookInDB();
        setShowChildModal(true);
    };

    const handleChildSelect = async (childId: string, recordData?: { rating?: number; difficulty_rating?: '쉬움' | '적당' | '어려움'; reading_time_minutes?: number; observations?: Record<string, string> }) => {
        if (!book) return;

        try {
            const { error } = await supabase.from('read_books').insert({
                user_id: user?.id,
                child_id: childId,
                book_id: book.id,
                read_date: new Date().toISOString(),
                rating: recordData?.rating || null,
                difficulty_rating: recordData?.difficulty_rating || null,
                reading_time_minutes: recordData?.reading_time_minutes || null,
                observation_data: recordData?.observations || null
            });

            if (error) throw error;

            toast.success("읽은 책으로 기록되었습니다!");
            setIsRead(true);
            setShowChildModal(false);
        } catch (err: any) {
            console.error(err);
            toast.error("저장 중 오류가 발생했습니다: " + err.message);
        }
    };

    const handleSubmitReview = async () => {
        if (!user) return openLoginModal();
        if (!newRating || !newReviewText) return;

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
            toast.error("리뷰 작성 실패: " + error.message);
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
                        setActiveChild={setActiveChild}
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
                                                className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all font-bold text-sm ${isScrapped ? 'bg-yellow-50 border-yellow-200 text-yellow-600' : 'border-gray-100 text-gray-500 hover:bg-gray-50'}`}
                                            >
                                                <Bookmark size={18} fill={isScrapped ? "currentColor" : "none"} />
                                                {isScrapped ? "찜 완료" : "찜하기"}
                                            </button>
                                            <button
                                                onClick={handleMarkRead}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all font-bold text-sm ${isRead ? 'bg-green-50 border-green-200 text-green-600' : 'border-gray-100 text-gray-500 hover:bg-gray-50'}`}
                                            >
                                                {isRead ? <Check size={18} /> : <BookOpen size={18} />}
                                                {isRead ? "읽은 책" : "읽었어요"}
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

                    {/* 우리 동네 도서관 소장 현황 */}
                    <div className="bg-white rounded-[2.5rem] p-6 lg:p-10 shadow-sm border border-gray-100 mb-10 animate-in fade-in duration-500">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2.5 bg-green-50 text-green-600 rounded-xl">
                                <MapPin size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">우리 동네 도서관 소장 현황</h3>
                        </div>

                        {!user ? (
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-gray-50 rounded-3xl border border-transparent">
                                <div>
                                    <p className="font-bold text-sm text-gray-800">로그인하고 소장 정보를 확인해 보세요!</p>
                                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">자주가는 도서관을 등록하면 검색한 책의 대출 가능 여부를 실시간으로 알 수 있습니다.</p>
                                </div>
                                <button
                                    onClick={openLoginModal}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-full transition-all shrink-0 cursor-pointer"
                                >
                                    로그인하기
                                </button>
                            </div>
                        ) : !userProfile?.favorite_libraries || userProfile.favorite_libraries.length === 0 ? (
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-gray-50 rounded-3xl border border-transparent">
                                <div>
                                    <p className="font-bold text-sm text-gray-800">등록된 자주가는 도서관이 없습니다.</p>
                                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">마이페이지에서 자주가는 도서관을 등록하면 소장 현황을 보여드릴게요!</p>
                                </div>
                                <button
                                    onClick={() => router.push('/mypage')}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-full transition-all shrink-0 cursor-pointer"
                                >
                                    도서관 등록하러 가기
                                </button>
                            </div>
                        ) : libraryStatusLoading ? (
                            <div className="flex flex-col gap-3">
                                {[1, 2, 3].slice(0, userProfile.favorite_libraries.length).map((_, i) => (
                                    <div key={i} className="h-16 bg-gray-50 rounded-2xl animate-pulse" />
                                ))}
                            </div>
                        ) : libraryStatus.length > 0 ? (
                            <div className="space-y-3">
                                {libraryStatus.map(status => {
                                    const isNotHeld = status.hasBook === 'N';
                                    const isLoanable = status.hasBook === 'Y' && status.loanAvailable === 'Y';
                                    const isCheckedOut = status.hasBook === 'Y' && status.loanAvailable === 'N';

                                    return (
                                        <div
                                            key={status.libCode}
                                            className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-transparent hover:border-gray-100 transition-all"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-10 h-10 rounded-full bg-white text-green-600 flex items-center justify-center font-black shadow-sm shrink-0">
                                                    <Building size={18} />
                                                </div>
                                                <div className="text-left min-w-0">
                                                    <div className="font-bold text-sm text-gray-900 truncate">{status.libName}</div>
                                                    <div className="text-[10px] text-gray-400 mt-0.5">코드: {status.libCode}</div>
                                                </div>
                                            </div>

                                            <div className="shrink-0 ml-3">
                                                {isNotHeld && (
                                                    <span className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-black rounded-lg border border-red-100">
                                                        미소장
                                                    </span>
                                                )}
                                                {isLoanable && (
                                                    <span className="px-3 py-1.5 bg-green-500 text-white text-xs font-black rounded-lg shadow-sm shadow-green-100">
                                                        대출 가능
                                                    </span>
                                                )}
                                                {isCheckedOut && (
                                                    <span className="px-3 py-1.5 bg-orange-100 text-orange-700 text-xs font-black rounded-lg border border-orange-200">
                                                        대출중
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 text-center py-4">소장 정보를 불러오지 못했습니다.</p>
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
