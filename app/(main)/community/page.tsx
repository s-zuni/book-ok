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

export default function CommunityPage() {
    const [activeMenu, setActiveMenu] = useState<MainMenu>('comm');
    const [activeSubMenu, setActiveSubMenu] = useState('전체 게시글');
    const [activeChild, setActiveChild] = useState<Child | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const router = useRouter();
    const { user, userProfile } = useAuth();

    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const POSTS_PER_PAGE = 10;

    useEffect(() => {
        if (user) {
            supabase.from('children').select('*').eq('parent_id', user.id).then(({ data }) => {
                if (data && data.length > 0) {
                    const child = data[0];
                    const age = new Date().getFullYear() - new Date(child.birthdate).getFullYear();
                    setActiveChild({ ...child, age });
                }
            });
        }
    }, [user]);

    // Reset posts when sub-menu (category) changes
    useEffect(() => {
        setPosts([]);
        setPage(0);
        setHasMore(true);
        fetchPosts(activeSubMenu, 0, true);
        setIsDrawerOpen(false);
    }, [activeSubMenu]);

    const fetchPosts = async (filterCategory: string, pageNum: number, isInitial: boolean = false) => {
        if (isInitial) setLoading(true);

        try {
            let query = supabase.from('posts').select('*', { count: 'exact' });

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

            if (error) throw error;

            if (data) {
                if (isInitial) {
                    setPosts(data);
                } else {
                    setPosts(prev => [...prev, ...data]);
                }

                // Check if we have more data
                if (count !== null && (from + data.length) >= count) {
                    setHasMore(false);
                } else if (data.length < POSTS_PER_PAGE) {
                    setHasMore(false);
                }
            }
        } catch (err: any) {
            console.error("Error fetching posts:", err);
            toast.error("게시글을 불러오는데 실패했습니다: " + (err.message || "알 수 없는 오류"));
        } finally {
            if (isInitial) setLoading(false);
        }
    };

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
                                    {posts.map((post) => (
                                        <div key={post.id} className="border-b border-gray-100 pb-8 cursor-pointer group"
                                            onClick={() => router.push(`/community/${post.id}`)}>
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="w-6 h-6 rounded-full bg-gray-200" />
                                                <span className="text-xs font-bold text-gray-800">{post.author_nickname || '익명'}</span>
                                                <span className="text-xs text-gray-400">· {new Date(post.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex justify-between gap-6">
                                                <div className="flex-1">
                                                    {post.is_notice && (
                                                        <div className="flex items-center gap-1.5 mb-2">
                                                            <Megaphone size={14} className="text-emerald-600 fill-emerald-50" />
                                                            <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 shadow-sm shadow-emerald-50">NOTICE</span>
                                                        </div>
                                                    )}
                                                    <h3 className={`font-black text-xl group-hover:text-green-600 transition-colors mb-2 leading-tight ${post.is_notice ? 'text-emerald-700' : 'text-gray-900'}`}>
                                                        {post.title}
                                                    </h3>
                                                    <p className="text-gray-500 text-sm line-clamp-3 mb-4 leading-relaxed font-medium">
                                                        {post.content.replace(/<[^>]*>?/gm, '').substring(0, 100)}...
                                                    </p>
                                                    <div className="flex items-center gap-4 text-xs text-gray-400 font-medium">
                                                        <span className="bg-gray-100 px-2 py-1 rounded text-gray-500">{post.category}</span>
                                                        <span className="flex items-center gap-1"><Eye size={14} /> {post.views}</span>
                                                        <span className="flex items-center gap-1"><Heart size={14} /> {post.likes}</span>
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
                <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-40 shrink-0">
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
                            {posts.map((post) => {
                                const isNotice = post.is_notice;
                                const isPopular = post.views > 20 || activeSubMenu === '인기 게시판';
                                
                                return (
                                    <div
                                        key={post.id}
                                        onClick={() => router.push(`/community/${post.id}`)}
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
                                                    <span className="text-[9.5px] font-bold text-gray-400">2시간 전</span> {/* Hardcoded mockup time similar to screenshot */}
                                                </div>
                                            </div>

                                            {/* Tag badges */}
                                            {isNotice ? (
                                                <span className="bg-emerald-50 text-emerald-700 text-[9.5px] font-black px-2 py-0.5 rounded-full border border-emerald-100">공지</span>
                                            ) : isPopular ? (
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
                                            <span className="flex items-center gap-1.5"><Heart size={14} className="text-red-400 fill-red-50" /> 24</span>
                                            <span className="flex items-center gap-1.5"><MessageSquare size={14} /> 12</span>
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
        </div>
    );
}
