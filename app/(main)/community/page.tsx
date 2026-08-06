"use client";

import { useEffect, useState } from "react";
import Header from "@shared/ui/Header";
import Sidebar from "@shared/ui/Sidebar";
import { useAuth } from "@features/auth/AuthContext";
import { supabase } from "@shared/lib/supabase";
import { Child, Post, MainMenu } from "@shared/types";
import { Edit3, MessageSquare, Heart, Eye, Menu, Megaphone, ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import SkeletonLoader from "@shared/ui/SkeletonLoader";
import MobileDrawer from "@shared/ui/MobileDrawer";
import { toast } from "sonner";
import ChildSafetyBanner from "@shared/ui/ChildSafetyBanner";

const getRelativeTime = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "방금 전";
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    return date.toLocaleDateString();
};

export default function CommunityPage() {
    const [activeMenu, setActiveMenu] = useState<MainMenu>('comm');
    const [activeSubMenu, setActiveSubMenu] = useState('전체 게시글');
    const [activeChild, setActiveChild] = useState<Child | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [showEulaModal, setShowEulaModal] = useState(false);

    const router = useRouter();
    const { user, userProfile, children, isInitialized, loading: authLoading } = useAuth();

    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const POSTS_PER_PAGE = 10;

    useEffect(() => {
        if (user) {
            const hasAgreed = localStorage.getItem(`bookok_eula_agreed_${user.id}`);
            if (!hasAgreed) {
                setShowEulaModal(true);
            }
        }
    }, [user]);

    useEffect(() => {
        if (children && children.length > 0) {
            const child = children[0];
            const age = new Date().getFullYear() - new Date(child.birthdate).getFullYear();
            setActiveChild({ ...child, age });
        } else {
            setActiveChild(null);
        }
    }, [children]);

    const fetchPosts = async (filterCategory: string, pageNum: number, isInitial: boolean = false, cancelledCheck?: () => boolean) => {
        if (isInitial) setLoading(true);

        try {
            let query = supabase.from('posts').select('*, comments(count)', { count: 'exact' });

            // Filter out hidden posts
            query = query.eq('is_deleted', false);

            if (filterCategory === '인기 게시판') {
                query = query.order('is_notice', { ascending: false }).order('views', { ascending: false });
            } else if (filterCategory && filterCategory !== '전체 게시글') {
                query = query.eq('category', filterCategory).order('is_notice', { ascending: false }).order('created_at', { ascending: false });
            } else {
                query = query.order('is_notice', { ascending: false }).order('created_at', { ascending: false });
            }

            // Pagination range
            const from = pageNum * POSTS_PER_PAGE;
            const to = from + POSTS_PER_PAGE - 1;

            const { data, error, count } = await query.range(from, to);

            if (cancelledCheck && cancelledCheck()) return;

            if (error) throw error;

            if (data) {
                let blockedUsers: string[] = [];
                try {
                    blockedUsers = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('blocked_users') || '[]') : [];
                } catch (e) {
                    console.warn("Failed to parse blocked_users:", e);
                }
                const filteredData = data.filter((post: { user_id: string }) => !blockedUsers.includes(post.user_id));

                if (isInitial) {
                    setPosts(filteredData);
                } else {
                    setPosts(prev => [...prev, ...filteredData]);
                }

                // Check if we have more data
                if (count !== null && (from + data.length) >= count) {
                    setHasMore(false);
                } else if (data.length < POSTS_PER_PAGE) {
                    setHasMore(false);
                }
            }
        } catch (err) {
            if (!cancelledCheck || !cancelledCheck()) {
                console.error("Error fetching posts:", err);
                toast.error("게시글을 불러오는데 실패했습니다.");
            }
        } finally {
            if (isInitial) {
                setLoading(false);
            }
        }
    };

    // Reset posts when sub-menu (category) changes or auth initializes
    useEffect(() => {
        if (!isInitialized || authLoading) return;

        let cancelled = false;
        setPosts([]);
        setPage(0);
        setHasMore(true);
        setIsDrawerOpen(false);

        fetchPosts(activeSubMenu, 0, true, () => cancelled);

        return () => { cancelled = true; };
    }, [activeSubMenu, isInitialized, authLoading]);

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchPosts(activeSubMenu, nextPage, false);
    };

    const handleSearch = () => {
        if (searchQuery.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
        }
    };

    const dummySetView = () => { };
    const notices = posts.filter(p => p.is_notice);
    const regularPosts = posts.filter(p => !p.is_notice);

    return (
        <div className="min-h-screen bg-[#F8F9FA] text-gray-900 font-sans pb-24 lg:pb-0">
            {/* Desktop View Header */}
            <div className="hidden lg:block">
                <Header
                    view="main"
                    setView={dummySetView}
                    activeMenu={activeMenu}
                    setActiveMenu={setActiveMenu}
                    setActiveSubMenu={setActiveSubMenu}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    handleSearch={handleSearch}
                    activeSubMenu={activeSubMenu}
                />
            </div>

            {/* Desktop View Content */}
            <div className="hidden lg:flex max-w-7xl mx-auto px-6 py-12 flex-row gap-12 bg-[#FDFDFD]">
                <Sidebar
                    activeChild={activeChild}
                    activeMenu="comm"
                    activeSubMenu={activeSubMenu}
                    setActiveSubMenu={setActiveSubMenu}
                />

                <main className="flex-1 min-h-[600px]">
                    <div className="animate-in fade-in max-w-2xl mx-auto">
                        <div className="flex items-center justify-between mb-10">
                            <h2 className="text-3xl font-black tracking-tight">{activeSubMenu}</h2>
                            <button onClick={() => router.push('/community/write')} className="bg-green-600 text-white px-6 py-2.5 rounded-full font-bold shadow-md hover:bg-green-700 transition-all flex items-center gap-2 text-sm">
                                <Edit3 size={16} /> <span>글쓰기</span>
                            </button>
                        </div>

                        <div className="space-y-8">
                            {loading ? (
                                <SkeletonLoader count={5} type="list" />
                            ) : (
                                <>
                                    {/* Notices Pinned at Top (Small & Compact) */}
                                    {notices.length > 0 && (
                                        <div className="bg-emerald-50/20 border border-emerald-100/50 rounded-3xl p-5 mb-8 space-y-3">
                                            {notices.map((notice) => (
                                                <div key={notice.id} className="flex items-center gap-3 py-2 cursor-pointer hover:bg-emerald-50/55 px-3 rounded-xl transition"
                                                    onClick={() => router.push(`/community/post?id=${notice.id}`)}>
                                                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded border border-emerald-200 shadow-sm shrink-0">공지</span>
                                                    <h4 className="font-extrabold text-sm text-gray-800 hover:text-emerald-700 transition truncate flex-1">{notice.title}</h4>
                                                    <span className="text-xs text-gray-400 shrink-0 font-medium">{getRelativeTime(notice.created_at)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Regular Posts List */}
                                    {regularPosts.map((post) => (
                                        <div key={post.id} className="border-b border-gray-100 pb-8 cursor-pointer group"
                                            onClick={() => router.push(`/community/post?id=${post.id}`)}>
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="w-6 h-6 rounded-full bg-gray-200" />
                                                <span className="text-xs font-bold text-gray-800">{post.author_nickname || '익명'}</span>
                                                <span className="text-xs text-gray-400">· {getRelativeTime(post.created_at)}</span>
                                            </div>
                                            <div className="flex justify-between gap-6">
                                                <div className="flex-1">
                                                    <h3 className="font-black text-xl group-hover:text-green-600 transition-colors mb-2 leading-tight text-gray-900">
                                                        {post.title}
                                                    </h3>
                                                    <p className="text-gray-500 text-sm line-clamp-3 mb-4 leading-relaxed font-medium">
                                                        {post.content.replace(/<[^>]*>?/gm, '').substring(0, 100)}...
                                                     </p>
                                                    <div className="flex items-center gap-4 text-xs text-gray-400 font-medium">
                                                        <span className="bg-gray-100 px-2 py-1 rounded text-gray-500">{post.category}</span>
                                                        <span className="flex items-center gap-1"><Eye size={14} /> {post.views}</span>
                                                        <span className="flex items-center gap-1"><Heart size={14} /> {post.likes}</span>
                                                        <span className="flex items-center gap-1"><MessageSquare size={14} /> {post.comments?.[0]?.count || 0}</span>
                                                    </div>
                                                </div>
                                                {post.image_url ? (
                                                    <div className="w-32 h-32 bg-gray-100 rounded-xl shrink-0 overflow-hidden border border-gray-100">
                                                        <img src={post.image_url} alt="" className="w-full h-full object-cover" />
                                                    </div>
                                                ) : (
                                                    <div className="w-32 h-32 bg-gray-55 rounded-xl shrink-0 overflow-hidden flex items-center justify-center text-gray-200">
                                                        <MessageSquare size={32} />
                                                     </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {!loading && posts.length === 0 && (
                                        <div className="py-20 text-center text-gray-400 font-bold">게시글이 없습니다.</div>
                                    )}
                                    {!loading && hasMore && posts.length > 0 && (
                                        <div className="text-center pt-8">
                                            <button onClick={handleLoadMore} className="px-6 py-2.5 bg-white border border-gray-200 rounded-full text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
                                                더 보기 +
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </main>
            </div>

            {/* ============================================================== */}
            {/* Mobile / Hybrid App View (lg:hidden) */}
            {/* ============================================================== */}
            <div className="lg:hidden flex flex-col min-h-screen bg-[#F8F9FA] pb-24">
                {/* Mobile Header */}
                <header className="bg-white border-b border-gray-100 px-4 pb-3 flex items-center justify-between sticky top-0 z-40 shrink-0 pt-[calc(0.75rem+env(safe-area-inset-top,0px))]">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.back()}
                            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-700"
                        >
                            <ChevronLeft size={22} />
                        </button>
                        <h1 className="text-[17px] font-black tracking-tight text-gray-900">커뮤니티</h1>
                    </div>
                    <button
                        onClick={() => router.push('/community/write')}
                        className="p-2 text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <Edit3 size={20} />
                    </button>
                </header>

                {/* Categories Tab Bar */}
                <div className="bg-white px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide border-b border-gray-100 shrink-0">
                    {[
                        { label: "전체", key: "전체 게시글" },
                        { label: "🔥 인기", key: "인기 게시판" },
                        { label: "교육 고민", key: "교육 고민" },
                        { label: "독서 고민", key: "독서 고민" }
                    ].map((tab, idx) => {
                        const isTabActive = activeSubMenu === tab.key;
                        return (
                            <button
                                key={idx}
                                onClick={() => setActiveSubMenu(tab.key)}
                                className={`px-4 py-1.5 rounded-full text-[12px] font-extrabold whitespace-nowrap transition-all border ${
                                    isTabActive
                                        ? 'bg-[#1A1A1A] border-[#1A1A1A] text-white font-black shadow-sm'
                                        : 'bg-white border-gray-150 text-gray-400 font-bold'
                                }`}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Posts Feed list */}
                <div className="flex-1 p-4 space-y-4">
                    {loading ? (
                        <SkeletonLoader count={4} type="list" />
                    ) : (
                        <>
                            {/* Notices Pinned at Top (Small & Compact) */}
                            {notices.length > 0 && (
                                <div className="space-y-2 mb-4 bg-emerald-50/20 border border-emerald-100/50 rounded-3xl p-4">
                                    {notices.map((notice) => (
                                        <div
                                            key={notice.id}
                                            onClick={() => router.push(`/community/post?id=${notice.id}`)}
                                            className="bg-white border border-emerald-100/40 rounded-xl px-4 py-3 active:scale-[0.99] transition-transform duration-200 flex items-center justify-between cursor-pointer gap-3"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <span className="bg-emerald-100 text-emerald-800 text-[9.5px] font-black px-1.5 py-0.5 rounded-md shrink-0">공지</span>
                                                <h4 className="font-extrabold text-[13px] text-gray-900 truncate leading-tight tracking-tight">{notice.title}</h4>
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-400 shrink-0">{getRelativeTime(notice.created_at)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Regular Posts List */}
                            {regularPosts.map((post) => {
                                const isPopular = post.views > 20 || activeSubMenu === '인기 게시판';
                                
                                return (
                                    <div
                                        key={post.id}
                                        onClick={() => router.push(`/community/post?id=${post.id}`)}
                                        className="bg-white border border-gray-100 rounded-[28px] p-5 shadow-[0_4px_12px_rgba(0,0,0,0.02)] active:scale-[0.99] transition-transform duration-200 flex flex-col cursor-pointer"
                                    >
                                        {/* Profile and Meta */}
                                        <div className="flex items-center justify-between mb-3 shrink-0">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-xs font-black">
                                                    {(post.author_nickname?.charAt(0) || '익').toUpperCase()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[12px] font-black text-gray-800">{post.author_nickname || '익명'}</span>
                                                    <span className="text-[9.5px] font-bold text-gray-400">{getRelativeTime(post.created_at)}</span>
                                                </div>
                                            </div>

                                            {/* Tag badges */}
                                            {isPopular ? (
                                                <span className="bg-red-50 text-[#EF4444] text-[9.5px] font-black px-2 py-0.5 rounded-full">🔥 인기</span>
                                            ) : (
                                                <span className="bg-sky-50 text-sky-700 text-[9.5px] font-black px-2 py-0.5 rounded-full">{post.category}</span>
                                            )}
                                        </div>

                                        {/* Post title */}
                                        <h3 className="font-extrabold text-[15px] text-gray-900 leading-tight mb-2 tracking-tight">
                                            {post.title}
                                        </h3>

                                        {/* Post inline image if exists */}
                                        {post.image_url && (
                                            <div className="relative w-full h-[140px] rounded-[16px] overflow-hidden mb-3 border border-gray-50">
                                                <img src={post.image_url} alt="" className="w-full h-full object-cover" />
                                            </div>
                                        )}

                                        {/* Post content body summary */}
                                        <p className="text-gray-500 text-[12.5px] font-medium leading-relaxed mb-4 line-clamp-2 md:line-clamp-3">
                                            {post.content.replace(/<[^>]*>?/gm, '')}
                                        </p>

                                        {/* Post footer interactions */}
                                        <div className="flex items-center gap-4 text-[11px] font-bold text-gray-400 mt-auto border-t border-gray-50 pt-3">
                                            <span className="flex items-center gap-1.5"><Heart size={14} className="text-red-400 fill-red-50" /> {post.likes}</span>
                                            <span className="flex items-center gap-1.5"><MessageSquare size={14} /> {post.comments?.[0]?.count || 0}</span>
                                        </div>
                                    </div>
                                );
                            })}

                            {!loading && posts.length === 0 && (
                                <div className="py-20 text-center text-gray-400 font-extrabold text-sm">게시글이 없습니다.</div>
                            )}

                            {!loading && hasMore && posts.length > 0 && (
                                <div className="text-center pt-4">
                                    <button
                                        onClick={handleLoadMore}
                                        className="px-5 py-2 bg-white border border-gray-150 rounded-full text-xs font-black text-gray-500 shadow-sm"
                                    >
                                        더 보기 +
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* EULA Agreement Modal */}
            {showEulaModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-black text-gray-900 mb-3 flex items-center gap-2">
                            <span>📜</span> 커뮤니티 이용 규약 동의 (EULA)
                        </h3>
                        <p className="text-xs text-gray-500 font-medium mb-4 leading-relaxed">
                            북콕 커뮤니티는 청정하고 건강한 교육·독서 정보 교류를 지향합니다. 깨끗한 서비스 이용을 위해 다음 이용 규약(EULA) 동의가 필요합니다.
                        </p>
                        
                        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-[11px] text-gray-600 space-y-2.5 max-h-[200px] overflow-y-auto mb-5 scrollbar-thin">
                            <p className="font-extrabold text-amber-700 text-xs mb-1">🛡️ 커뮤니티 아동 안전 및 이용 가이드라인 (Google Play 규정)</p>
                            <p>1. <strong>아동 온라인 안전 지침:</strong> 게시글 작성 시 실명, 전화번호, 주소, 학교 등 개인 식별 정보를 절대로 공유하지 마세요. 온라인 낯선 사람과의 오프라인 만남은 심각한 위험을 초래할 수 있습니다.</p>
                            <p>2. <strong>1:1 개인 메시지(DM) 미제공:</strong> 본 서비스는 모든 사용자가 함께 이용하는 <strong>전체 공개 게시판</strong>입니다. 알 수 없는 사용자와의 1:1 비공개 대화 기능은 제공되지 않습니다.</p>
                            <p>3. <strong>유해 콘텐츠 게시 금지:</strong> 타인에 대한 비방, 욕설, 음란물, 불법 홍보물 등 유해 콘텐츠를 금지합니다.</p>
                            <p>4. <strong>무관용 원칙 (No Tolerance Policy):</strong> 부적절한 게시글은 회원 신고 시 24시간 이내 즉시 삭제 처리되며 해당 계정은 경고 없이 영구 제재(추방)됩니다.</p>
                        </div>
                        
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    toast.error("이용 규약에 동의하셔야 커뮤니티를 이용하실 수 있습니다.");
                                    router.push('/');
                                }}
                                className="flex-1 py-3 bg-gray-100 text-gray-500 font-bold rounded-xl text-sm hover:bg-gray-200 active:scale-95 transition-all"
                            >
                                동의 안 함 (나가기)
                            </button>
                            <button
                                onClick={() => {
                                    if (user) {
                                        localStorage.setItem(`bookok_eula_agreed_${user.id}`, "true");
                                    }
                                    setShowEulaModal(false);
                                    toast.success("이용 규약에 동의하셨습니다. 환영합니다! 🎉");
                                }}
                                className="flex-1 py-3 bg-gray-900 text-white font-black rounded-xl text-sm hover:bg-black active:scale-95 transition-all"
                            >
                                동의하고 계속하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
