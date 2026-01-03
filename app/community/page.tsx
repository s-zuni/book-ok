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
                        <div className="flex items-center justify-between mb-10">
                            <h2 className="text-3xl font-black tracking-tight">{activeSubMenu}</h2>
                            <button onClick={() => router.push('/community/write')} className="bg-green-600 text-white px-6 py-2.5 rounded-full font-bold shadow-md hover:bg-green-700 transition-all flex items-center gap-2 text-sm"><Edit3 size={16} /> 글쓰기</button>
                        </div>

                        <div className="space-y-8">
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
                                                {/* Fallback description or content excerpt */}
                                                {post.content.replace(/<[^>]*>?/gm, '').substring(0, 100)}...
                                            </p>

                                            <div className="flex items-center gap-4 text-xs text-gray-400 font-medium">
                                                <span className="bg-gray-100 px-2 py-1 rounded text-gray-500">{post.category}</span>
                                                <span className="flex items-center gap-1"><Eye size={14} /> {post.views}</span>
                                                <span className="flex items-center gap-1"><Heart size={14} /> {post.likes}</span>
                                            </div>
                                        </div>
                                        {/* Optional: Add random placeholder image or if post has image */}
                                        <div className="w-24 h-24 md:w-32 md:h-32 bg-gray-100 rounded-xl shrink-0 overflow-hidden">
                                            {/* Using a placeholder service or generic colored box */}
                                            <div className="w-full h-full bg-gray-50" />
                                        </div>
                                    </div>
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
