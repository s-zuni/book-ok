"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ChevronLeft, MessageSquare, Heart, Eye, Megaphone, MoreVertical } from "lucide-react";
import { useAuth } from "@features/auth/AuthContext";
import { supabase } from "@shared/lib/supabase";
import { Post, Comment } from "@shared/types";

export default function PostDetailPage() {
    const searchParams = useSearchParams();
    const postId = searchParams.get('id') as string;
    const router = useRouter();
    const { user, userProfile } = useAuth();

    const [post, setPost] = useState<Post | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [showMenu, setShowMenu] = useState(false);

    const fetchPost = async () => {
        const { data } = await supabase.from('posts').select('*').eq('id', postId).single();
        if (data) {
            if (data.is_deleted && !userProfile?.is_admin) {
                alert('삭제된 게시글입니다.');
                router.push('/community');
                return;
            }
            setPost(data);
            supabase.from('posts').update({ views: data.views + 1 }).eq('id', postId).then(() => { });
        }
    };

    const fetchComments = async () => {
        const { data } = await supabase.from('comments')
            .select('*')
            .eq('post_id', postId)
            .eq('is_deleted', false)
            .order('created_at', { ascending: true });
        if (data) {
            const blockedUsers = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('blocked_users') || '[]') : [];
            const filtered = data.filter(comment => !blockedUsers.includes(comment.user_id));
            setComments(filtered);
        }
    };

    useEffect(() => {
        if (postId) {
            const loadData = async () => {
                await fetchPost();
                await fetchComments();
            };
            loadData();
        }
    }, [postId]);

    const handleAddComment = async () => {
        if (!newComment.trim() || !user) return;

        const { error } = await supabase.from('comments').insert({
            post_id: postId,
            author_id: user.id,
            author_nickname: userProfile?.nickname || '사용자',
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
        setPost({ ...post, likes: post.likes + 1 });
        await supabase.from('posts').update({ likes: post.likes + 1 }).eq('id', postId);
    };

    const handleReportPost = async () => {
        if (!user) return;
        const reason = prompt("이 게시글을 신고하시겠습니까? 신고 사유를 적어주세요 (스팸, 욕설, 부적절한 홍보 등):");
        if (reason === null) return;
        if (!reason.trim()) {
            alert("신고 사유를 입력해 주세요.");
            return;
        }

        const { error } = await supabase.from('community_reports').insert({
            reporter_id: user.id,
            post_id: String(postId),
            reason: reason,
            status: 'pending'
        });

        if (!error) {
            alert("신고가 접수되었습니다. 관리자 검토 후 24시간 내에 조치됩니다.");
        } else {
            alert("신고 접수 중 오류가 발생했습니다.");
        }
    };

    const handleBlockPostAuthor = () => {
        if (!post || !user) return;
        if (!confirm("이 사용자를 차단하시겠습니까? 차단하면 이 사용자의 모든 글과 댓글이 숨겨집니다.")) return;

        const blockedUsers = JSON.parse(localStorage.getItem('blocked_users') || '[]');
        if (!blockedUsers.includes(post.user_id)) {
            blockedUsers.push(post.user_id);
            localStorage.setItem('blocked_users', JSON.stringify(blockedUsers));
        }
        alert("차단되었습니다.");
        router.push('/community');
    };

    const handleReportComment = async (commentId: number | string) => {
        if (!user) return;
        const reason = prompt("이 댓글을 신고하시겠습니까? 신고 사유를 적어주세요 (스팸, 욕설, 부적절한 홍보 등):");
        if (reason === null) return;
        if (!reason.trim()) {
            alert("신고 사유를 입력해 주세요.");
            return;
        }

        const { error } = await supabase.from('community_reports').insert({
            reporter_id: user.id,
            comment_id: String(commentId),
            reason: reason,
            status: 'pending'
        });

        if (!error) {
            alert("신고가 접수되었습니다. 관리자 검토 후 24시간 내에 조치됩니다.");
        } else {
            alert("신고 접수 중 오류가 발생했습니다.");
        }
    };

    const handleBlockUser = (targetUserId: string) => {
        if (!user) return;
        if (!confirm("이 사용자를 차단하시겠습니까? 차단하면 이 사용자의 모든 글과 댓글이 숨겨집니다.")) return;

        const blockedUsers = JSON.parse(localStorage.getItem('blocked_users') || '[]');
        if (!blockedUsers.includes(targetUserId)) {
            blockedUsers.push(targetUserId);
            localStorage.setItem('blocked_users', JSON.stringify(blockedUsers));
        }
        alert("차단되었습니다.");
        setComments(prev => prev.filter(c => c.user_id !== targetUserId));
    };

    if (!post) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FDFDFD]">
                <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FDFDFD] text-gray-900 font-sans">
            {/* Simple Navigation Bar */}
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
                <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
                    <button onClick={() => router.back()} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors">
                        <ChevronLeft size={22} />
                        <span className="font-bold text-sm">목록</span>
                    </button>
                    {/* More Options for report/block */}
                    {user && post.user_id !== user.id && (
                        <div className="relative">
                            <button onClick={() => setShowMenu(!showMenu)} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                                <MoreVertical size={20} className="text-gray-500" />
                            </button>
                            {showMenu && (
                                <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[140px] z-50">
                                    <button onClick={() => { handleReportPost(); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 font-bold transition-colors">게시글 신고</button>
                                    <button onClick={() => { handleBlockPostAuthor(); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 font-bold transition-colors">작성자 차단</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-2xl mx-auto px-4 py-6">
                {/* Notice Badge */}
                {post.is_notice && (
                    <div className="flex items-center gap-2 mb-4 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                        <Megaphone className="text-emerald-600" size={18} />
                        <span className="font-black text-sm text-emerald-800 tracking-tight">서비스 공지사항입니다.</span>
                    </div>
                )}

                {/* Category & Date */}
                <div className="flex items-center gap-2.5 mb-3">
                    <span className="bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full text-xs font-black">{post.category}</span>
                    <span className="text-gray-400 text-xs">{new Date(post.created_at).toLocaleDateString()}</span>
                </div>

                {/* Title */}
                <h1 className="text-2xl font-black mb-4 leading-tight">{post.title}</h1>

                {/* Author + Stats inline */}
                <div className="flex items-center justify-between pb-4 mb-5 border-b border-gray-100">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center text-green-700 text-xs font-black">{post.author_nickname[0]}</div>
                        <span className="font-bold text-sm text-gray-700">{post.author_nickname}</span>
                    </div>
                    <div className="flex gap-3 text-gray-400 text-xs font-bold">
                        <span className="flex items-center gap-1"><Eye size={14} /> {post.views}</span>
                        <span className="flex items-center gap-1"><Heart size={14} /> {post.likes}</span>
                    </div>
                </div>

                {/* Image */}
                {post.image_url && (
                    <div className="mb-6 rounded-2xl overflow-hidden">
                        <img src={post.image_url} alt="" className="w-full object-cover" />
                    </div>
                )}

                {/* Content */}
                <div className="text-[15px] leading-relaxed text-gray-700 whitespace-pre-wrap mb-8">
                    {post.content}
                </div>

                {/* Like Button */}
                <div className="flex justify-center mb-8">
                    <button onClick={handleLike} className="flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-green-100 text-green-600 font-bold text-sm hover:bg-green-50 active:scale-95 transition-all">
                        <Heart size={18} /> 좋아요 {post.likes}
                    </button>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-100 mb-6" />

                {/* Comments Section */}
                <div>
                    <h3 className="font-black text-base mb-4 flex items-center gap-2"><MessageSquare size={18} /> 댓글 {comments.length}</h3>

                    <div className="space-y-3 mb-6">
                        {comments.map(comment => (
                            <div key={comment.id} className="bg-gray-50 p-4 rounded-2xl">
                                <div className="flex justify-between items-center mb-1.5">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-gray-800">{comment.author_name}</span>
                                        <span className="text-[10px] text-gray-400">{new Date(comment.created_at).toLocaleDateString()}</span>
                                    </div>
                                    {user && comment.user_id !== user.id && (
                                        <div className="flex gap-1.5">
                                            <button onClick={() => handleReportComment(comment.id)} className="text-[10px] text-red-400 hover:text-red-600 font-bold transition">신고</button>
                                            <button onClick={() => handleBlockUser(comment.user_id)} className="text-[10px] text-gray-400 hover:text-gray-600 font-bold transition">차단</button>
                                        </div>
                                    )}
                                </div>
                                <p className="text-sm text-gray-600">{comment.content}</p>
                            </div>
                        ))}
                    </div>

                    {/* Comment Input - sticky at bottom on mobile */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                            placeholder="댓글을 작성하세요..."
                            className="flex-1 bg-gray-50 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-green-200 focus:bg-white border border-transparent focus:border-green-400 text-sm font-medium transition-all"
                            onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                        />
                        <button onClick={handleAddComment} className="bg-gray-900 text-white px-4 py-3 rounded-xl font-black text-sm hover:bg-black active:scale-95 transition-all whitespace-nowrap">등록</button>
                    </div>
                </div>
            </div>

            {/* Click outside to close menu */}
            {showMenu && <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />}
        </div>
    );
}
