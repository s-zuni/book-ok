"use client";

import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Header from "../../components/Header";
import { 
    Shield, Users, BookOpen, BarChart3, 
    MessageSquare, Megaphone, Trash2, CheckCircle, 
    XCircle, Plus, Layout, ExternalLink, Calendar, 
    Lock, LogIn, PieChart, TrendingUp
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Post, Comment, Popup } from "../../types";
import { toast } from "sonner";
import AdminStatistics from "@/components/AdminStatistics";

type AdminTab = 'dashboard' | 'statistics' | 'community' | 'popups';

export default function AdminPage() {
    const { user, userProfile, loading, signOut } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
    
    // Data states
    const [posts, setPosts] = useState<Post[]>([]);
    const [comments, setComments] = useState<Comment[]>([]);
    const [popups, setPopups] = useState<Popup[]>([]);
    const [isDataLoading, setIsDataLoading] = useState(false);
    const [communitySubTab, setCommunitySubTab] = useState<'posts' | 'comments'>('posts');

    // Stats states
    const [stats, setStats] = useState<any>(null);

    // Form states for Popups
    const [isPopupModalOpen, setIsPopupModalOpen] = useState(false);
    const [newPopup, setNewPopup] = useState<Partial<Popup>>({
        title: '',
        content: '',
        image_url: '',
        link_url: '',
        is_active: true
    });

    useEffect(() => {
        if (userProfile?.is_admin) {
            if (activeTab === 'community') {
                if (communitySubTab === 'posts') fetchPosts();
                else fetchComments();
            }
            if (activeTab === 'popups') fetchPopups();
            if (activeTab === 'dashboard' || activeTab === 'statistics') fetchStats();
        }
    }, [activeTab, communitySubTab, userProfile]);

    const fetchStats = async () => {
        // We will implement the RPC next, for now use a temporary query
        const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        const { count: totalPosts } = await supabase.from('posts').select('*', { count: 'exact', head: true });
        const { count: todaySignups } = await supabase.from('profiles')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', new Date(new Date().setHours(0,0,0,0)).toISOString());

        setStats({
            totalUsers: totalUsers || 0,
            totalPosts: totalPosts || 0,
            todaySignups: todaySignups || 0,
        });
    };

    const fetchPosts = async () => {
        setIsDataLoading(true);
        const { data, error } = await supabase
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) toast.error('게시글을 불러오지 못했습니다.');
        else setPosts(data || []);
        setIsDataLoading(false);
    };

    const fetchComments = async () => {
        setIsDataLoading(true);
        const { data, error } = await supabase
            .from('comments')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) toast.error('댓글을 불러오지 못했습니다.');
        else setComments(data || []);
        setIsDataLoading(false);
    };

    const fetchPopups = async () => {
        setIsDataLoading(true);
        const { data, error } = await supabase
            .from('popups')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) toast.error('팝업 목록을 불러오지 못했습니다.');
        else setPopups(data || []);
        setIsDataLoading(false);
    };

    const toggleNotice = async (postId: number, currentStatus: boolean) => {
        const { error } = await supabase
            .from('posts')
            .update({ is_notice: !currentStatus })
            .eq('id', postId);
        
        if (error) toast.error('공지 설정 변경 실패');
        else {
            toast.success(currentStatus ? '공지 해제됨' : '공지로 지정됨');
            fetchPosts();
        }
    };

    const toggleDeletePost = async (postId: number, currentStatus: boolean) => {
        const { error } = await supabase
            .from('posts')
            .update({ is_deleted: !currentStatus })
            .eq('id', postId);
        
        if (error) toast.error('상태 변경 실패');
        else {
            toast.success(currentStatus ? '복구됨' : '숨김 처리됨');
            fetchPosts();
        }
    };

    const toggleDeleteComment = async (commentId: number, currentStatus: boolean) => {
        const { error } = await supabase
            .from('comments')
            .update({ is_deleted: !currentStatus })
            .eq('id', commentId);
        
        if (error) toast.error('상태 변경 실패');
        else {
            toast.success(currentStatus ? '복구됨' : '숨김 처리됨');
            fetchComments();
        }
    };

    const handleCreatePopup = async () => {
        if (!newPopup.title) return toast.error('제목을 입력해주세요.');
        
        const { error } = await supabase
            .from('popups')
            .insert([newPopup]);
        
        if (error) toast.error('팝업 생성 실패');
        else {
            toast.success('팝업이 생성되었습니다.');
            setIsPopupModalOpen(false);
            setNewPopup({ title: '', content: '', image_url: '', link_url: '', is_active: true });
            fetchPopups();
        }
    };

    const togglePopupActive = async (popupId: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from('popups')
            .update({ is_active: !currentStatus })
            .eq('id', popupId);
        
        if (error) toast.error('상태 변경 실패');
        else {
            toast.success(currentStatus ? '비활성화됨' : '활성화됨');
            fetchPopups();
        }
    };

    if (loading) {
        return <div className="h-screen flex items-center justify-center bg-gray-50">연결 정보를 확인 중입니다...</div>;
    }

    // Admin Auth Gate with Login Prompt
    if (!user || !userProfile?.is_admin) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50 px-4">
                <main className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-2xl border border-gray-100 text-center animate-in zoom-in-95 duration-500">
                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-8">
                        <Lock size={40} />
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">관리자 전용 공간</h1>
                    <p className="text-gray-500 font-bold mb-10 leading-relaxed">
                        이 구역은 승인된 관리자만 접근 가능합니다.<br/>
                        계정이 있다면 로그인해 주세요.
                    </p>
                    <div className="space-y-4">
                        <button 
                            onClick={() => router.push('/')}
                            className="w-full py-5 bg-gray-900 text-white font-black rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-gray-200 flex items-center justify-center gap-2"
                        >
                            <LogIn size={20} />
                            관리자 로그인하기
                        </button>
                        <button 
                            onClick={() => router.push('/')}
                            className="w-full py-5 bg-white text-gray-400 font-black rounded-2xl hover:bg-gray-50 transition-all"
                        >
                            홈으로 돌아가기
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header 
                view="main" 
                setView={() => {}} 
                activeMenu="intro" 
                setActiveMenu={() => {}} 
                setActiveSubMenu={() => {}} 
                searchQuery="" 
                setSearchQuery={() => {}} 
                handleSearch={() => {}} 
            />
            
            <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 flex flex-col lg:flex-row gap-8">
                <div className="lg:w-64">
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 sticky top-24">
                        <div className="flex items-center gap-3 mb-8 px-2">
                            <Shield className="text-green-600" size={24} />
                            <h2 className="font-black text-xl">관리 메뉴</h2>
                        </div>
                        <nav className="space-y-2">
                            {[
                                { id: 'dashboard', label: '대시보드', icon: BarChart3 },
                                { id: 'statistics', label: '유입/재방문 통계', icon: TrendingUp },
                                { id: 'community', label: '커뮤니티 관리', icon: MessageSquare },
                                { id: 'popups', label: '팝업 관리', icon: Megaphone }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as AdminTab)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === tab.id ? 'bg-green-600 text-white shadow-lg shadow-green-100' : 'text-gray-500 hover:bg-gray-50'}`}
                                >
                                    <tab.icon size={20} />
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                        
                        <div className="mt-8 pt-8 border-t border-gray-50">
                            <button 
                                onClick={() => signOut()}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-red-400 hover:bg-red-50 transition-all"
                            >
                                <XCircle size={20} />
                                로그아웃
                            </button>
                        </div>
                    </div>
                </div>

                <main className="flex-1 space-y-8">
                    {activeTab === 'dashboard' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <header className="mb-8">
                                <h1 className="text-3xl font-black text-gray-900">시스템 현황</h1>
                                <p className="text-gray-500 mt-1">실시간 서비스 지표를 확인합니다.</p>
                            </header>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[
                                    { label: "총 사용자", value: stats?.totalUsers || "...", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
                                    { label: "오늘 가입", value: stats?.todaySignups || "...", icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
                                    { label: "총 게시글", value: stats?.totalPosts || "...", icon: MessageSquare, color: "text-purple-600", bg: "bg-purple-50" },
                                ].map((stat) => (
                                    <div key={stat.label} className="bg-white p-8 rounded-4xl border border-gray-100 shadow-sm flex items-center gap-6">
                                        <div className={`${stat.bg} ${stat.color} p-4 rounded-2xl`}>
                                            <stat.icon size={32} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">{stat.label}</p>
                                            <p className="text-3xl font-black text-gray-900 mt-1">{stat.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'statistics' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <AdminStatistics />
                        </div>
                    )}

                    {activeTab === 'community' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <header className="mb-8 flex justify-between items-end">
                                <div>
                                    <h1 className="text-3xl font-black text-gray-900">커뮤니티 관리</h1>
                                    <p className="text-gray-500 mt-1">게시글과 댓글의 노출 여부를 관리합니다.</p>
                                </div>
                                <div className="flex bg-gray-100 p-1 rounded-xl">
                                    <button 
                                        onClick={() => setCommunitySubTab('posts')}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${communitySubTab === 'posts' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        게시글
                                    </button>
                                    <button 
                                        onClick={() => setCommunitySubTab('comments')}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${communitySubTab === 'comments' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        댓글
                                    </button>
                                </div>
                            </header>

                            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                                {isDataLoading ? (
                                    <div className="py-20 text-center text-gray-400 font-bold">로딩 중...</div>
                                ) : communitySubTab === 'posts' ? (
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-100">
                                                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase">상태</th>
                                                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase">제목</th>
                                                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase">작성자</th>
                                                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase text-right">작업</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {posts.map((post) => (
                                                <tr key={post.id} className={`hover:bg-gray-50/50 transition ${post.is_deleted ? 'opacity-50' : ''}`}>
                                                    <td className="px-6 py-4">
                                                        <div className="flex gap-2">
                                                            {post.is_notice && <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-black rounded-lg">공지</span>}
                                                            {post.is_deleted && <span className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-black rounded-lg">숨김</span>}
                                                            {!post.is_notice && !post.is_deleted && <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-black rounded-lg">정상</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 font-bold text-gray-900 truncate max-w-xs">{post.title}</td>
                                                    <td className="px-6 py-4 text-sm font-medium text-gray-500">{post.author_nickname}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex justify-end gap-2">
                                                            <button 
                                                                onClick={() => toggleNotice(post.id, post.is_notice)}
                                                                className={`p-2 rounded-xl transition-colors ${post.is_notice ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400 hover:bg-amber-50 hover:text-amber-500'}`}
                                                                title="공지 설정/해제"
                                                            >
                                                                <Megaphone size={18} />
                                                            </button>
                                                            <button 
                                                                onClick={() => toggleDeletePost(post.id, post.is_deleted)}
                                                                className={`p-2 rounded-xl transition-colors ${post.is_deleted ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500'}`}
                                                                title={post.is_deleted ? "복구하기" : "숨기기"}
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-100">
                                                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase">상태</th>
                                                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase">내용</th>
                                                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase">작성자</th>
                                                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase text-right">작업</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {comments.map((comment) => (
                                                <tr key={comment.id} className={`hover:bg-gray-50/50 transition ${comment.is_deleted ? 'opacity-50' : ''}`}>
                                                    <td className="px-6 py-4">
                                                        <div className="flex gap-2">
                                                            {comment.is_deleted ? (
                                                                <span className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-black rounded-lg">숨김</span>
                                                            ) : (
                                                                <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-black rounded-lg">정상</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-medium text-gray-900 truncate max-w-xs">{comment.content}</td>
                                                    <td className="px-6 py-4 text-sm font-medium text-gray-500">{comment.author_name}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex justify-end gap-2">
                                                            <button 
                                                                onClick={() => toggleDeleteComment(comment.id, comment.is_deleted)}
                                                                className={`p-2 rounded-xl transition-colors ${comment.is_deleted ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500'}`}
                                                                title={comment.is_deleted ? "복구하기" : "숨기기"}
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                                {(!isDataLoading && ((posts.length === 0 && communitySubTab === 'posts') || (comments.length === 0 && communitySubTab === 'comments'))) ? (
                                    <div className="py-20 text-center text-gray-400 font-bold">목록이 비어있습니다.</div>
                                ) : null}
                            </div>
                        </div>
                    )}

                    {activeTab === 'popups' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <header className="mb-8 flex justify-between items-end">
                                <div>
                                    <h1 className="text-3xl font-black text-gray-900">팝업 관리</h1>
                                    <p className="text-gray-500 mt-1">메인 화면에 노출될 이벤트 팝업을 관리합니다.</p>
                                </div>
                                <button 
                                    onClick={() => setIsPopupModalOpen(true)}
                                    className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-green-100 hover:scale-[1.02] active:scale-95 transition-all"
                                >
                                    <Plus size={20} />
                                    새 팝업 등록
                                </button>
                            </header>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {popups.map((popup) => (
                                    <div key={popup.id} className={`bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden group transition-all ${!popup.is_active ? 'grayscale opacity-70' : ''}`}>
                                        <div className="aspect-video bg-gray-100 relative overflow-hidden">
                                            {popup.image_url ? (
                                                <img src={popup.image_url} alt={popup.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                                                    <Layout size={48} />
                                                    <span className="text-xs font-bold mt-2 font-mono">NO IMAGE</span>
                                                </div>
                                            )}
                                            <div className="absolute top-4 right-4 flex gap-2">
                                                <button 
                                                    onClick={() => togglePopupActive(popup.id, popup.is_active)}
                                                    className={`p-2 rounded-xl shadow-lg backdrop-blur-md transition-all ${popup.is_active ? 'bg-green-500/80 text-white' : 'bg-gray-500/80 text-white'}`}
                                                >
                                                    {popup.is_active ? <CheckCircle size={20} /> : <XCircle size={20} />}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="p-8">
                                            <h3 className="text-xl font-black mb-2">{popup.title}</h3>
                                            <p className="text-gray-500 text-sm line-clamp-2 mb-6">{popup.content}</p>
                                            <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                                                <div className="flex items-center gap-2 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                                                    <Calendar size={14} />
                                                    {new Date(popup.created_at).toLocaleDateString()} 생성
                                                </div>
                                                {popup.link_url && (
                                                    <a href={popup.link_url} target="_blank" className="text-green-600 hover:underline flex items-center gap-1 text-xs font-black">
                                                        링크 확인 <ExternalLink size={12} />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {popups.length === 0 && <div className="py-20 text-center text-gray-400 font-bold bg-white rounded-[2.5rem] border border-dashed">등록된 팝업이 없습니다.</div>}
                        </div>
                    )}
                </main>
            </div>

            {/* Popup Creation Modal */}
            {isPopupModalOpen && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900">새 팝업 등록</h2>
                                <p className="text-sm text-gray-500 mb-0">사용자들에게 보여줄 팝업 정보를 입력하세요.</p>
                            </div>
                            <button onClick={() => setIsPopupModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">팝업 제목</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-gray-900 focus:ring-4 focus:ring-green-100 transition-all outline-none"
                                    placeholder="이벤트 혹은 공지 제목"
                                    value={newPopup.title}
                                    onChange={(e) => setNewPopup({...newPopup, title: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">팝업 설명</label>
                                <textarea 
                                    className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-gray-900 focus:ring-4 focus:ring-green-100 transition-all outline-none h-32"
                                    placeholder="사용자에게 노출될 상세 문구"
                                    value={newPopup.content}
                                    onChange={(e) => setNewPopup({...newPopup, content: e.target.value})}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">이미지 URL</label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-gray-900 focus:ring-4 focus:ring-green-100 transition-all outline-none"
                                        placeholder="https://..."
                                        value={newPopup.image_url}
                                        onChange={(e) => setNewPopup({...newPopup, image_url: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">이동 링크 URL (선택)</label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-gray-900 focus:ring-4 focus:ring-green-100 transition-all outline-none"
                                        placeholder="https://..."
                                        value={newPopup.link_url}
                                        onChange={(e) => setNewPopup({...newPopup, link_url: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="p-8 pt-4 flex gap-4 bg-gray-50/50">
                            <button 
                                onClick={() => setIsPopupModalOpen(false)}
                                className="flex-1 py-4 bg-white text-gray-500 font-black rounded-2xl border hover:bg-gray-100 transition shadow-sm"
                            >
                                취소
                            </button>
                            <button 
                                onClick={handleCreatePopup}
                                className="flex-2 py-4 bg-green-600 text-white font-black rounded-2xl hover:bg-green-700 shadow-lg shadow-green-100 transition-all"
                            >
                                등록하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
