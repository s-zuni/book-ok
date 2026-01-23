"use client";

import { useEffect, useState } from "react";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { Child, Post, MainMenu } from "../../types";
import { Edit3, MessageSquare, Heart, Eye, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import SkeletonLoader from "../../components/SkeletonLoader";
import MobileDrawer from "../../components/MobileDrawer";

export default function CommunityPage() {
    const [activeMenu, setActiveMenu] = useState<MainMenu>('comm');
    const [activeSubMenu, setActiveSubMenu] = useState('전체 게시글');
    const [activeChild, setActiveChild] = useState<Child | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const router = useRouter();
    const { user } = useAuth();

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

            if (filterCategory === '인기 게시판') {
                query = query.order('likes', { ascending: false });
            } else if (filterCategory && filterCategory !== '전체 게시글') {
                query = query.eq('category', filterCategory);
            } else {
                query = query.order('created_at', { ascending: false });
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
        } catch (err) {
            console.error("Error fetching posts:", err);
            // Ideally define success/error state to show user feedback
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
        <div className="min-h-screen bg-[#FDFDFD] text-gray-900 font-sans pb-24 lg:pb-0">
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

            <div className="max-w-7xl mx-auto px-6 py-8 lg:py-12 flex flex-col lg:flex-row gap-12">
                <div className="hidden lg:flex">
                    <Sidebar
                        activeChild={activeChild}
                        activeMenu="comm"
                        activeSubMenu={activeSubMenu}
                        setActiveSubMenu={setActiveSubMenu}
                    />
                </div>

                <main className="flex-1 min-h-[600px]">
                    <div className="animate-in fade-in max-w-2xl mx-auto">
                        <div className="flex items-center justify-between mb-6 lg:mb-10">
                            <div className="flex items-center gap-3">
                                {/* Mobile Menu Trigger */}
                                <button
                                    onClick={() => setIsDrawerOpen(true)}
                                    className="lg:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full"
                                >
                                    <Menu size={24} />
                                </button>
                                <h2 className="text-2xl lg:text-3xl font-black tracking-tight">{activeSubMenu}</h2>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={async () => {
                                        if (!user) {
                                            alert("로그인이 필요합니다.");
                                            return;
                                        }
                                        if (!confirm("임의의 게시글 5개를 생성하시겠습니까?")) return;

                                        try {
                                            const dummyPosts = Array.from({ length: 5 }).map((_, i) => ({
                                                category: ['자유게시판', '질문과 답변', '정보 공유'][Math.floor(Math.random() * 3)],
                                                title: `테스트 게시글 ${Date.now()}_${i + 1}`,
                                                content: `이것은 테스트를 위해 자동으로 생성된 게시글 내용입니다. ${i + 1}`,
                                                author_id: user.id,
                                                author_nickname: user.user_metadata?.name || '익명',
                                                views: Math.floor(Math.random() * 100),
                                                likes: Math.floor(Math.random() * 20),
                                            }));

                                            const { error } = await supabase.from('posts').insert(dummyPosts);
                                            if (error) throw error;
                                            alert("게시글이 생성되었습니다. 새로고침 해주세요.");
                                            window.location.reload();
                                        } catch (e) {
                                            console.error(e);
                                            alert("생성 실패: " + (e as any).message);
                                        }
                                    }}
                                    className="bg-gray-100 text-gray-600 px-4 py-2 rounded-full font-bold shadow-sm hover:bg-gray-200 transition-all text-xs"
                                >
                                    더미 데이터 생성
                                </button>
                                <button onClick={() => router.push('/community/write')} className="bg-green-600 text-white px-5 py-2 lg:px-6 lg:py-2.5 rounded-full font-bold shadow-md hover:bg-green-700 transition-all flex items-center gap-2 text-sm"><Edit3 size={16} /> <span className="hidden sm:inline">글쓰기</span></button>
                            </div>
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
                                                <span className="text-xs font-bold text-gray-800">{post.author_nickname}</span>
                                                <span className="text-xs text-gray-400">· {new Date(post.created_at).toLocaleDateString()}</span>
                                            </div>

                                            <div className="flex justify-between gap-6">
                                                <div className="flex-1">
                                                    <h3 className="font-black text-xl text-gray-900 group-hover:text-green-600 transition-colors mb-2 leading-tight">{post.title}</h3>
                                                    <p className="text-gray-500 text-sm line-clamp-2 md:line-clamp-3 mb-4 leading-relaxed font-medium">
                                                        {post.content.replace(/<[^>]*>?/gm, '').substring(0, 100)}...
                                                    </p>

                                                    <div className="flex items-center gap-4 text-xs text-gray-400 font-medium">
                                                        <span className="bg-gray-100 px-2 py-1 rounded text-gray-500">{post.category}</span>
                                                        <span className="flex items-center gap-1"><Eye size={14} /> {post.views}</span>
                                                        <span className="flex items-center gap-1"><Heart size={14} /> {post.likes}</span>
                                                    </div>
                                                </div>
                                                {post.image_url ? (
                                                    <div className="w-24 h-24 md:w-32 md:h-32 bg-gray-100 rounded-xl shrink-0 overflow-hidden border border-gray-100">
                                                        <img src={post.image_url} alt="" className="w-full h-full object-cover" />
                                                    </div>
                                                ) : (
                                                    <div className="w-24 h-24 md:w-32 md:h-32 bg-gray-50 rounded-xl shrink-0 overflow-hidden flex items-center justify-center text-gray-200">
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
                                            <button
                                                onClick={handleLoadMore}
                                                className="px-6 py-2.5 bg-white border border-gray-200 rounded-full text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                                            >
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

            {/* Mobile Drawer */}
            <MobileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title="커뮤니티 메뉴">
                <Sidebar
                    activeChild={activeChild}
                    activeMenu="comm"
                    activeSubMenu={activeSubMenu}
                    setActiveSubMenu={setActiveSubMenu}
                />
            </MobileDrawer>
        </div>
    );
}
