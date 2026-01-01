"use client";

import { useEffect, useState } from "react";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { Child, Post, MainMenu } from "../../types";
import { Edit3, MessageSquare, Heart, Eye } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CommunityPage() {
    const [activeMenu, setActiveMenu] = useState<MainMenu>('comm');
    const [activeSubMenu, setActiveSubMenu] = useState('전체 게시글');
    const [activeChild, setActiveChild] = useState<Child | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const router = useRouter();
    const { user } = useAuth();

    useEffect(() => {
        if (user) {
            supabase.from('children').select('*').eq('profile_id', user.id).then(({ data }) => {
                if (data && data.length > 0) {
                    const child = data[0];
                    const age = new Date().getFullYear() - new Date(child.birthdate).getFullYear();
                    setActiveChild({ ...child, age });
                }
            });
        }
    }, [user]);

    useEffect(() => {
        fetchPosts(activeSubMenu);
    }, [activeSubMenu]);

    const fetchPosts = async (filterCategory?: string) => {
        let query = supabase.from('posts').select('*');

        if (filterCategory === '인기 게시판') {
            query = query.order('likes', { ascending: false });
        } else if (filterCategory && filterCategory !== '전체 게시글') {
            query = query.eq('category', filterCategory);
        } else {
            query = query.order('created_at', { ascending: false });
        }

        const { data } = await query;
        if (data) setPosts(data);
    };

    const handleSearch = () => {
        if (searchQuery.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
        }
    };

    const dummySetView = () => { };

    return (
        <div className="min-h-screen bg-[#FDFDFD] text-gray-900 font-sans">
            <Header
                view="main"
                setView={dummySetView}
                activeMenu={activeMenu}
                setActiveMenu={setActiveMenu} // This might need simple override if we don't want it to break
                setActiveSubMenu={setActiveSubMenu}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                handleSearch={handleSearch}
                activeSubMenu={activeSubMenu}
            />

            <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col lg:flex-row gap-12">
                <div className="hidden lg:flex">
                    <Sidebar
                        activeChild={activeChild}
                        activeMenu="comm"
                        activeSubMenu={activeSubMenu}
                        setActiveSubMenu={setActiveSubMenu}
                    />
                </div>

                <main className="flex-1 min-h-[600px]">
                    <div className="animate-in fade-in">
                        <div className="flex items-center justify-between mb-10">
                            <h2 className="text-4xl font-black tracking-tight">{activeSubMenu}</h2>
                            <button onClick={() => router.push('/community/write')} className="bg-gray-900 text-white px-8 py-4 rounded-[1.5rem] font-black shadow-xl hover:bg-black transition-all flex items-center gap-2"><Edit3 size={18} /> 글쓰기</button>
                        </div>

                        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                            <div className="grid grid-cols-[80px_1fr_100px_80px_80px] gap-4 px-8 py-5 bg-gray-50 border-b text-xs font-black text-gray-400 uppercase tracking-widest hidden md:grid">
                                <div className="text-center">번호</div><div>제목</div><div className="text-center">작성자</div><div className="text-center">조회수</div><div className="text-center">좋아요</div>
                            </div>

                            {posts.map((post, idx) => (
                                <div key={post.id} className="grid grid-cols-1 md:grid-cols-[80px_1fr_100px_80px_80px] gap-4 px-8 py-6 border-b hover:bg-green-50/30 transition-all cursor-pointer group"
                                    onClick={() => router.push(`/community/${post.id}`)}>
                                    <div className="text-center text-gray-400 font-bold hidden md:block">{idx + 1}</div>
                                    <div>
                                        <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs font-bold mb-1 md:hidden">{post.category}</span>
                                        <h3 className="font-bold text-lg text-gray-800 group-hover:text-green-600 transition-colors line-clamp-1">{post.title}</h3>
                                        <div className="md:hidden flex items-center gap-3 mt-2 text-xs text-gray-400">
                                            <span>{post.author_nickname}</span>
                                            <span>조회 {post.views}</span>
                                            <span>좋아요 {post.likes}</span>
                                        </div>
                                    </div>
                                    <div className="text-center text-sm text-gray-600 hidden md:block">{post.author_nickname}</div>
                                    <div className="text-center text-sm text-gray-400 hidden md:block">{post.views}</div>
                                    <div className="text-center text-sm text-gray-400 font-bold hidden md:block">{post.likes}</div>
                                </div>
                            ))}

                            {posts.length === 0 && (
                                <div className="py-20 text-center text-gray-400 font-bold">게시글이 없습니다.</div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
