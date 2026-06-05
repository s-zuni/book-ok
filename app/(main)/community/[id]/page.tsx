"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, MessageSquare, Heart, Eye, Megaphone } from "lucide-react";
import Header from "@shared/ui/Header";
import Sidebar from "@shared/ui/Sidebar";
import { useAuth } from "@features/auth/AuthContext";
import { supabase } from "@shared/lib/supabase";
import { Child, Post, Comment } from "@shared/types";

export default function PostDetailPage() {
    const params = useParams();
    const postId = params.id as string;
    const router = useRouter();
    const { user, userProfile } = useAuth();

    const [post, setPost] = useState<Post | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [activeChild, setActiveChild] = useState<Child | null>(null);
    const [activeMenu, setActiveMenu] = useState<any>('comm');
    const [activeSubMenu, setActiveSubMenu] = useState('');

    useEffect(() => {
        if (user) {
            supabase.from('children').select('*').eq('profile_id', user.id).then(({ data }) => {
                if (data && data.length > 0) setActiveChild(data[0]);
            });
        }
    }, [user]);

    useEffect(() => {
        fetchPost();
        fetchComments();
    }, [postId]);

    const fetchPost = async () => {
        const { data } = await supabase.from('posts').select('*').eq('id', postId).single();
        if (data) {
            if (data.is_deleted && !userProfile?.is_admin) {
                alert('삭제된 게시글입니다.');
                router.push('/community');
                return;
            }
            setPost(data);
            // Update views (simple increment, ideally should handle concurrency/dedup)
            supabase.from('posts').update({ views: data.views + 1 }).eq('id', postId).then(() => { });
        }
    };

    const fetchComments = async () => {
        const { data } = await supabase.from('comments')
            .select('*')
            .eq('post_id', postId)
            .eq('is_deleted', false)
            .order('created_at', { ascending: true });
        if (data) setComments(data);
    };

    const handleAddComment = async () => {
        if (!newComment.trim() || !user) return;

        const { error } = await supabase.from('comments').insert({
            post_id: postId,
            user_id: user.id,
            author_name: userProfile?.nickname || '사용자',
            content: newComment
        });

        if (!error) {
            setNewComment("");
            fetchComments();
        } else {
            alert('댓글 작성 실패');
        }
    };

    const handleLike = async () => {
        if (!post) return;
        // Optimistic update
        setPost({ ...post, likes: post.likes + 1 });
        await supabase.from('posts').update({ likes: post.likes + 1 }).eq('id', postId);
    };

    const dummySetView = () => { };

    if (!post) return <div className="p-20 text-center">Loading...</div>;

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
                    activeMenu="comm"
                    activeSubMenu={activeSubMenu}
                    setActiveSubMenu={setActiveSubMenu}
                />

                <main className="flex-1 min-h-[600px]">
                    <button onClick={() => router.back()} className="mb-6 flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold">
                        <ChevronLeft size={20} /> 목록으로 돌아가기
                    </button>

                    <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100 mb-8">
                        {post.is_notice && (
                            <div className="flex items-center gap-2 mb-6 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                <Megaphone className="text-emerald-600" size={20} />
                                <span className="font-black text-emerald-800 tracking-tight">서비스 공지사항입니다.</span>
                            </div>
                        )}
                        <div className="flex items-center gap-3 mb-4">
                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-black">{post.category}</span>
                            <span className="text-gray-400 text-sm">{new Date(post.created_at).toLocaleDateString()}</span>
                        </div>
                        <h1 className="text-3xl font-black mb-6">{post.title}</h1>
                        <div className="flex items-center justify-between border-b pb-6 mb-8">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-xs font-black">{post.author_nickname[0]}</div>
                                <span className="font-bold text-gray-700">{post.author_nickname}</span>
                            </div>
                            <div className="flex gap-4 text-gray-400 text-sm font-bold">
                                <span className="flex items-center gap-1"><Eye size={16} /> {post.views}</span>
                                <span className="flex items-center gap-1"><Heart size={16} /> {post.likes}</span>
                            </div>
                        </div>

                        {post.image_url && (
                            <div className="mb-10 rounded-2xl overflow-hidden border border-gray-100">
                                <img src={post.image_url} alt="Post Attachment" className="w-full object-cover" />
                            </div>
                        )}

                        <div className="prose prose-lg max-w-none mb-12 text-gray-700 whitespace-pre-wrap">
                            {post.content}
                        </div>

                        <div className="flex justify-center">
                            <button onClick={handleLike} className="flex items-center gap-2 px-6 py-3 rounded-full border-2 border-green-100 text-green-600 font-bold hover:bg-green-50 transition">
                                <Heart size={20} /> 좋아요 {post.likes}
                            </button>
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-[2.5rem] p-8">
                        <h3 className="font-black text-xl mb-6 flex items-center gap-2"><MessageSquare size={20} /> 댓글 {comments.length}</h3>

                        <div className="space-y-4 mb-8">
                            {comments.map(comment => (
                                <div key={comment.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                                    <div className="flex justify-between mb-2">
                                        <span className="font-bold text-gray-800">{comment.author_name}</span>
                                        <span className="text-xs text-gray-400">{new Date(comment.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-gray-600">{comment.content}</p>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-4">
                            <input
                                type="text"
                                value={newComment}
                                onChange={e => setNewComment(e.target.value)}
                                placeholder="댓글을 작성하세요..."
                                className="flex-1 bg-white px-5 py-4 rounded-xl outline-none focus:ring-2 focus:ring-green-200 border border-transparent focus:border-green-500 font-medium"
                                onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                            />
                            <button onClick={handleAddComment} className="bg-gray-900 text-white px-6 py-4 rounded-xl font-black hover:bg-black transition whitespace-nowrap">등록</button>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
