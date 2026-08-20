"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase, supabaseUrl, supabaseAnonKey } from "@shared/lib/supabase";
import { Book, Review, Child, MainMenu } from "@shared/types";
import { Star, ChevronLeft, Bookmark, BookOpen, Check, Building, MapPin, ExternalLink, Copy } from "lucide-react";
import Header from "@shared/ui/Header";
import Sidebar from "@shared/ui/Sidebar";
import { useAuth } from "@features/auth/AuthContext";
import { useLoginModal } from "@features/auth/LoginModalContext";
import ChildSelectionModal from "@features/children/ChildSelectionModal";
import LibraryDetailModal, { LibraryStatusDetail } from "@features/books/LibraryDetailModal";
import { toast } from "sonner";
import { apiUrl, safeFetch } from "@shared/lib/api";
import { getOptimizedImageUrl } from "@shared/lib/image-utils";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Capacitor } from "@capacitor/core";

export default function BookDetailContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    // Static export fallback: useSearchParams may be empty on initial hydration in Capacitor WebView
    const bookId = (params?.id || searchParams?.get('id') || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('id') : null)) as string;
    const router = useRouter();

    const [book, setBook] = useState<Book | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [isApiBook, setIsApiBook] = useState(false);

    // Auth & Sidebar state
    const { user, children, userProfile } = useAuth();
    
    // Library holding status state
    const [libraryStatus, setLibraryStatus] = useState<LibraryStatusDetail[]>([]);
    const [libraryStatusLoading, setLibraryStatusLoading] = useState(false);
    const [selectedLibraryModal, setSelectedLibraryModal] = useState<LibraryStatusDetail | null>(null);
    const [showLibraryModal, setShowLibraryModal] = useState(false);

    const { openLoginModal } = useLoginModal();
    const [userChildren, setUserChildren] = useState<Child[]>([]);
    const [activeChild, setActiveChild] = useState<Child | null>(null);
    const [activeMenu, setActiveMenu] = useState<MainMenu>('rec');
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
        let cancelled = false;

        const fetchBook = async () => {
            if (!bookId || bookId === 'placeholder') {
                setLoading(false);
                return;
            }

            setLoading(true);
            let success = false;

            // 1. Primary: Fetch accurate & rich details from Aladin API via Edge Function
            try {
                const response = await safeFetch(`${supabaseUrl}/functions/v1/recommendations`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': supabaseAnonKey
                    },
                    body: JSON.stringify({ itemId: bookId, apiType: 'ItemLookUp' })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data && data.item) {
                        const rawItem = data.item;
                        const formattedBook: Book = {
                            id: rawItem.isbn13 || rawItem.isbn || bookId,
                            bookid: rawItem.isbn13 || rawItem.isbn || bookId,
                            title: rawItem.title?.split(" - ")?.[0] || rawItem.title,
                            author: rawItem.author?.replace(/\s*\(지은이\)|\s*\(그림\)|\s*\(글\)/g, "")?.split(",")?.[0]?.trim() || rawItem.author || '저자 미상',
                            imgsrc: rawItem.cover,
                            category: rawItem.categoryName?.split('>')?.[1]?.trim() || rawItem.categoryName || '기타',
                            description: rawItem.description || data.description || '',
                            pubDate: rawItem.pubDate || '',
                            publisher: rawItem.publisher || '',
                        };

                        if (!cancelled) {
                            setBook(formattedBook);
                            setIsApiBook(true);
                            setLoading(false);
                        }
                        success = true;
                    }
                }
            } catch (err) {
                console.warn("Aladin API fetch failed, trying Supabase fallback:", err);
            }

            // 2. Fallback: Query Supabase DB if Aladin API is unavailable or returns no item
            if (!success) {
                try {
                    const { data: sbBookByIsbn, error: isbnError } = await supabase.from('books').select('*').eq('bookid', bookId).maybeSingle();
                    if (sbBookByIsbn && !isbnError) {
                        if (!cancelled) {
                            setBook(sbBookByIsbn);
                            setIsApiBook(false);
                            setLoading(false);
                        }
                        success = true;
                    }

                    if (!success && /^\d+$/.test(bookId)) {
                        const { data: sbBookById, error: idError } = await supabase.from('books').select('*').eq('id', bookId).maybeSingle();
                        if (sbBookById && !idError) {
                            if (!cancelled) {
                                setBook(sbBookById);
                                setIsApiBook(false);
                                setLoading(false);
                            }
                            success = true;
                        }
                    }
                } catch (dbErr) {
                    console.error("Supabase fallback fetch book error:", dbErr);
                } finally {
                    if (!cancelled) {
                        if (!success) setBook(null);
                        setLoading(false);
                    }
                }
            }
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
            const isbn = String(book.bookid || book.id || bookId);

            // 1. Check Scrap Status
            try {
                const { data: scrapData } = await supabase
                    .from('book_scraps')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('isbn', isbn)
                    .maybeSingle();

                if (scrapData) {
                    setIsScrapped(true);
                } else {
                    setIsScrapped(false);
                }
            } catch (scrapErr) {
                console.warn("Error checking scrap status:", scrapErr);
            }

            // 2. Check Read Status
            try {
                // Check if book exists in DB to get its integer id
                const { data: existingBook } = await supabase
                    .from('books')
                    .select('id')
                    .eq('bookid', isbn)
                    .maybeSingle();

                if (existingBook) {
                    const { data: readData } = await supabase
                        .from('read_books')
                        .select('id')
                        .eq('book_id', existingBook.id)
                        .eq('user_id', user.id)
                        .limit(1);

                    if (readData && readData.length > 0) {
                        setIsRead(true);
                        return;
                    }
                }

                // Fallback check by observation_data isbn
                const { data: readByMeta } = await supabase
                    .from('read_books')
                    .select('id')
                    .eq('user_id', user.id)
                    .contains('observation_data', { book_isbn: isbn })
                    .limit(1);

                if (readByMeta && readByMeta.length > 0) {
                    setIsRead(true);
                }
            } catch (readErr) {
                console.warn("Error checking read status:", readErr);
            }
        };

        checkInteractions();
    }, [user, book, bookId]);

    // Fetch holding status for favorite libraries
    useEffect(() => {
        const checkLibraryHoldings = async () => {
            const rawLibs = userProfile?.favorite_libraries;
            const favoriteLibs = Array.isArray(rawLibs) ? rawLibs : [];
            
            if (!book || favoriteLibs.length === 0) {
                setLibraryStatus([]);
                setLibraryStatusLoading(false);
                return;
            }

            const isbn = book.id || book.bookid || bookId;
            const libCodes = favoriteLibs.map(l => l.libCode).join(',');
            const cacheKey = `book_lib_status_${isbn}_${libCodes}`;

            // Check cache first for instant rendering
            try {
                const cached = typeof window !== 'undefined' ? sessionStorage.getItem(cacheKey) : null;
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setLibraryStatus(parsed);
                        setLibraryStatusLoading(false);
                        return;
                    }
                }
            } catch (e) {
                // Ignore cache read error
            }

            setLibraryStatusLoading(true);
            try {
                const response = await safeFetch(`${supabaseUrl}/functions/v1/library`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': supabaseAnonKey,
                        'Authorization': `Bearer ${supabaseAnonKey}`
                    },
                    body: JSON.stringify({ apiType: 'book-status', isbn: isbn, libCodes: libCodes })
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                
                // Map the results back to include library details, call number, and shelf locations
                const statusResults = (data.results || []).map((result: any) => {
                    const libInfo = favoriteLibs.find(l => String(l.libCode) === String(result.libCode));
                    return {
                        libCode: result.libCode,
                        libName: libInfo?.libName || "알 수 없는 도서관",
                        hasBook: result.hasBook || 'N',
                        loanAvailable: result.loanAvailable || 'N',
                        callNumber: result.callNumber || '',
                        shelfLocName: result.shelfLocName || '',
                        separateShelfName: result.separateShelfName || '',
                        homepage: result.homepage || (libInfo as any)?.homepage || '',
                        operatingTime: result.operatingTime || (libInfo as any)?.operatingTime || '',
                        closed: result.closed || (libInfo as any)?.closed || '',
                        tel: result.tel || (libInfo as any)?.tel || '',
                        address: result.address || (libInfo as any)?.address || '',
                    };
                });
                
                setLibraryStatus(statusResults);
                try {
                    sessionStorage.setItem(cacheKey, JSON.stringify(statusResults));
                } catch (e) {
                    // Ignore cache write error
                }
            } catch (err) {
                console.error("Library holding fetch error:", err);
                // Fallback default status so UI never hangs in skeleton
                const fallbackResults = favoriteLibs.map(lib => ({
                    libCode: lib.libCode,
                    libName: lib.libName,
                    hasBook: 'N',
                    loanAvailable: 'N',
                    callNumber: '',
                    shelfLocName: '',
                    separateShelfName: '',
                    homepage: '',
                    operatingTime: '',
                    closed: '',
                    tel: '',
                    address: '',
                }));
                setLibraryStatus(fallbackResults);
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

        if (data) setReviews(data as unknown as Review[]);
    };

    // Helper to ensure book exists in DB and return the integer ID
    const ensureBookInDB = async (): Promise<number | null> => {
        if (!book) return null;
        const bookIsbn = String(book.bookid || book.id || bookId);

        // 1. Check if already exists in books table by bookid (ISBN)
        const { data: existingBook } = await supabase
            .from('books')
            .select('id')
            .eq('bookid', bookIsbn)
            .maybeSingle();

        if (existingBook) {
            return Number(existingBook.id);
        }

        // 2. If bookId is a number, check by id
        if (/^\d+$/.test(bookIsbn)) {
            const { data: existingById } = await supabase
                .from('books')
                .select('id')
                .eq('id', Number(bookIsbn))
                .maybeSingle();
            if (existingById) return Number(existingById.id);
        }

        // 3. Insert new book into books table
        const { data: newBook, error: insertError } = await supabase.from('books').insert({
            bookid: bookIsbn,
            title: book.title,
            author: book.author || '저자 미상',
            imgsrc: book.imgsrc || '',
            category: book.category || '기타',
            description: book.description || '',
            pubDate: book.pubDate || null,
            publisher: book.publisher || null,
        }).select('id').maybeSingle();

        if (insertError) {
            console.warn("Failed to insert book to DB:", insertError);
            return null;
        }

        return newBook ? Number(newBook.id) : null;
    };

    const handleScrap = async () => {
        if (!user) return openLoginModal();
        if (!book) return;

        if (Capacitor.isNativePlatform()) {
            await Haptics.impact({ style: ImpactStyle.Light });
        }

        const isbn = String(book.bookid || book.id || bookId);
        const nextScrap = !isScrapped;
        setIsScrapped(nextScrap);

        try {
            if (nextScrap) {
                const dbBookId = await ensureBookInDB();
                const { error } = await supabase.from('book_scraps').upsert({
                    user_id: user.id,
                    book_id: dbBookId,
                    isbn: isbn,
                    title: book.title,
                    author: book.author || '',
                    imgsrc: book.imgsrc || '',
                    category: book.category || '기타'
                }, { onConflict: 'user_id,isbn' });

                if (error) throw error;
                toast.success("책을 찜 목록에 저장했습니다!");
            } else {
                const { error } = await supabase
                    .from('book_scraps')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('isbn', isbn);

                if (error) throw error;
                toast.success("찜하기를 취소했습니다.");
            }
        } catch (err) {
            console.error("Scrap error:", err);
            setIsScrapped(!nextScrap);
            toast.error("찜하기 처리에 실패했습니다.");
        }
    };

    const handleMarkRead = async () => {
        if (!user) return openLoginModal();
        if (Capacitor.isNativePlatform()) {
            await Haptics.impact({ style: ImpactStyle.Light });
        }
        if (userChildren.length === 0) {
            toast.error("먼저 자녀 프로필을 등록해주세요.", {
                action: {
                    label: "마이페이지 이동",
                    onClick: () => router.push('/mypage')
                }
            });
            return;
        }

        await ensureBookInDB();
        setShowChildModal(true);
    };

    const handleChildSelect = async (childId: string, recordData?: { rating?: number; difficulty_rating?: '쉬움' | '적당' | '어려움'; reading_time_minutes?: number; observations?: Record<string, string> }) => {
        if (!book || !user) return;

        if (Capacitor.isNativePlatform()) {
            await Haptics.impact({ style: ImpactStyle.Medium });
        }

        try {
            const dbBookId = await ensureBookInDB();
            const bookIsbn = String(book.bookid || book.id || bookId);

            const { error } = await supabase.from('read_books').insert({
                user_id: user.id,
                child_id: Number(childId),
                book_id: dbBookId,
                read_date: new Date().toISOString(),
                rating: recordData?.rating || null,
                difficulty_rating: recordData?.difficulty_rating || null,
                reading_time_minutes: recordData?.reading_time_minutes || null,
                observation_data: {
                    ...(recordData?.observations || {}),
                    book_title: book.title,
                    book_author: book.author,
                    book_isbn: bookIsbn,
                    book_cover: book.imgsrc
                }
            });

            if (error) throw error;

            toast.success("읽은 책으로 기록되었습니다!");
            setIsRead(true);
            setShowChildModal(false);
        } catch (err) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류';
            toast.error("저장 중 오류가 발생했습니다: " + errorMessage);
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
                                    <img src={getOptimizedImageUrl(book.imgsrc, 'detail')} alt={book.title} className="w-40 md:w-48 h-56 md:h-64 object-cover rounded-xl shadow-md" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                                        <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-black self-start">{book.category}</span>
                                        <div className="flex gap-2 shrink-0">
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
                                    <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-gray-900 mb-2">{book.title}</h1>
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

                                    const getTargetLink = () => {
                                        let rawHomepage = status.homepage?.trim() || '';
                                        const name = status.libName || '';

                                        // 1. 도서관 정보나루 API에서 넘겨주는 공식 홈페이지 URL이 존재하는 경우 최우선 사용
                                        if (rawHomepage && rawHomepage !== '') {
                                            if (!rawHomepage.startsWith('http://') && !rawHomepage.startsWith('https://')) {
                                                return 'http://' + rawHomepage;
                                            }
                                            return rawHomepage;
                                        }

                                        // 2. 도서관 이름 기반 주요 지자체/구립 도서관 포털 스마트 매퍼
                                        if (name.includes('휘경') || name.includes('동대문') || name.includes('이문') || name.includes('답십리') || name.includes('장안')) {
                                            return 'https://www.l4d.or.kr'; // 동대문구 구립도서관 (www.l4d.or.kr)
                                        }
                                        if (name.includes('강남')) return 'https://library.gangnam.go.kr';
                                        if (name.includes('서초')) return 'https://seocholib.or.kr';
                                        if (name.includes('송파')) return 'https://www.splib.or.kr';
                                        if (name.includes('마포')) return 'https://mapolib.or.kr';
                                        if (name.includes('은평')) return 'https://www.eplib.or.kr';
                                        if (name.includes('노원')) return 'https://www.nowonlib.kr';
                                        if (name.includes('성북')) return 'https://www.sblib.seoul.kr';
                                        if (name.includes('중구')) return 'https://www.e-junggu.or.kr';
                                        if (name.includes('부천') || name.includes('상동')) return 'https://www.bcl.go.kr';
                                        if (name.includes('수원')) return 'https://www.suwonlib.go.kr';
                                        if (name.includes('성남')) return 'https://www.snlib.go.kr';
                                        if (name.includes('고양')) return 'https://www.goyanglib.or.kr';
                                        if (name.includes('용인')) return 'https://lib.yongin.go.kr';
                                        if (name.includes('대구')) return 'https://library.daegu.go.kr';
                                        if (name.includes('부산')) return 'https://home.pen.go.kr/siminlib';

                                        return `https://search.naver.com/search.naver?query=${encodeURIComponent(name + ' 공식 홈페이지')}`;
                                    };

                                    const handleDirectLinkClick = (e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        const textToCopy = status.callNumber 
                                            ? `[${status.libName}] 청구기호: ${status.callNumber} (${book?.title || ''})`
                                            : `[${status.libName}] ${book?.title || ''}`;

                                        try {
                                            navigator.clipboard.writeText(textToCopy);
                                        } catch (err) {
                                            console.warn("Clipboard copy warning:", err);
                                        }
                                        toast.success("청구기호가 클립보드에 복사되었습니다! 도서관 검색창에 활용해보세요.", { duration: 4000 });
                                    };

                                    const targetUrl = getTargetLink();

                                    return (
                                        <div
                                            key={status.libCode}
                                            className="flex flex-col sm:flex-row sm:items-center justify-between p-4.5 rounded-2xl bg-gray-50/80 hover:bg-gray-100/60 border border-gray-100 transition-all gap-3 shadow-2xs group"
                                        >
                                            <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                                                <div className="w-10 h-10 rounded-2xl bg-white text-green-600 flex items-center justify-center font-black shadow-sm shrink-0 border border-gray-100 group-hover:bg-green-50 transition-colors">
                                                    <Building size={18} />
                                                </div>
                                                <div className="text-left min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className="font-bold text-sm text-gray-900 truncate">{status.libName}</div>
                                                        {status.operatingTime && (
                                                            <span className="hidden md:inline-block text-[10px] text-gray-400 font-medium truncate">
                                                                · {status.operatingTime}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Call number & Shelf location Pill */}
                                                    {status.hasBook === 'Y' && status.callNumber && (
                                                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100/80 font-mono">
                                                                청구기호: {status.callNumber}
                                                            </span>
                                                            {(status.shelfLocName || status.separateShelfName) && (
                                                                <span className="text-[10px] font-medium text-gray-500 truncate">
                                                                    {[status.separateShelfName, status.shelfLocName].filter(Boolean).join(' ')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                                {isNotHeld && (
                                                    <span className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-black rounded-xl border border-red-100">
                                                        미소장
                                                    </span>
                                                )}
                                                {isLoanable && (
                                                    <a
                                                        href={targetUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={handleDirectLinkClick}
                                                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-black rounded-xl shadow-sm shadow-green-200 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer no-underline inline-flex"
                                                        title="클릭 시 도서관 공식 홈페이지로 이동하며 청구기호가 복사됩니다"
                                                    >
                                                        <span>대출 가능</span>
                                                        <ExternalLink size={13} />
                                                    </a>
                                                )}
                                                {isCheckedOut && (
                                                    <a
                                                        href={targetUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={handleDirectLinkClick}
                                                        className="px-3 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-800 text-xs font-black rounded-xl border border-orange-200 flex items-center gap-1.5 transition-all cursor-pointer no-underline inline-flex"
                                                    >
                                                        <span>대출 중</span>
                                                        <ExternalLink size={13} />
                                                    </a>
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

            <LibraryDetailModal
                isOpen={showLibraryModal}
                onClose={() => setShowLibraryModal(false)}
                bookTitle={book?.title || ''}
                bookAuthor={book?.author}
                bookIsbn={book?.bookid || book?.id}
                status={selectedLibraryModal}
            />
        </div>
    );
}
