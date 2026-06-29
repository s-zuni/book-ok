"use client";

import { useAuth } from "@features/auth/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Header from "@shared/ui/Header";
import { useLoginModal } from "@features/auth/LoginModalContext";
import { 
    Shield, Users, BookOpen, BarChart3, 
    MessageSquare, Megaphone, Trash2, CheckCircle, 
    XCircle, Plus, Layout, ExternalLink, Calendar, 
    Lock, LogIn, PieChart, TrendingUp, Search,
    ChevronDown, ChevronUp, AlertTriangle, RefreshCw
} from "lucide-react";
import { supabase } from "@shared/lib/supabase";
import { Post, Comment, Popup, Profile, Report, Book } from "@shared/types";
import { toast } from "sonner";
import AdminStatistics from "@widgets/admin/AdminStatistics";

type AdminTab = 'dashboard' | 'statistics' | 'community' | 'popups' | 'users' | 'books' | 'reports';

export default function AdminPage() {
    const { user, userProfile, loading, isInitialized, signOut } = useAuth();
    const { openLoginModal } = useLoginModal();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
    
    // Data states
    const [posts, setPosts] = useState<Post[]>([]);
    const [comments, setComments] = useState<Comment[]>([]);
    const [popups, setPopups] = useState<Popup[]>([]);
    const [users, setUsers] = useState<Profile[]>([]);
    const [books, setBooks] = useState<Book[]>([]);
    const [reports, setReports] = useState<Report[]>([]);
    const [isDataLoading, setIsDataLoading] = useState(false);
    const [communitySubTab, setCommunitySubTab] = useState<'posts' | 'comments'>('posts');

    // Search & Filter states
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [bookSearchQuery, setBookSearchQuery] = useState('');
    const [reportFilter, setReportFilter] = useState<'all' | 'pending' | 'resolved' | 'rejected'>('all');

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

    // Form states for Books
    const [isBookModalOpen, setIsBookModalOpen] = useState(false);
    const [newBook, setNewBook] = useState<Partial<Book>>({
        bookid: '',
        title: '',
        author: '',
        imgsrc: '',
        category: '소설',
        description: '',
        toc: ''
    });

    // Replying report state
    const [replyingReportId, setReplyingReportId] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState('');

    useEffect(() => {
        if (userProfile?.is_admin) {
            if (activeTab === 'community') {
                if (communitySubTab === 'posts') fetchPosts();
                else fetchComments();
            }
            if (activeTab === 'popups') fetchPopups();
            if (activeTab === 'dashboard' || activeTab === 'statistics') fetchStats();
            if (activeTab === 'users') fetchUsers();
            if (activeTab === 'books') fetchBooks();
            if (activeTab === 'reports') fetchReports();
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

    const fetchUsers = async () => {
        setIsDataLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            toast.error('사용자 목록을 불러오지 못했습니다: ' + error.message);
        } else {
            setUsers(data || []);
        }
        setIsDataLoading(false);
    };

    const toggleAdminStatus = async (userId: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from('profiles')
            .update({ is_admin: !currentStatus })
            .eq('id', userId);
        
        if (error) {
            toast.error('관리자 권한 변경 실패: ' + error.message);
        } else {
            toast.success(!currentStatus ? '관리자 권한이 부여되었습니다.' : '관리자 권한이 회수되었습니다.');
            fetchUsers();
        }
    };

    const changeUserRole = async (userId: string, newRole: string) => {
        const { error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', userId);
        
        if (error) {
            toast.error('역할 변경 실패: ' + error.message);
        } else {
            toast.success('역할이 변경되었습니다.');
            fetchUsers();
        }
    };

    const toggleUserActive = async (userId: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from('profiles')
            .update({ is_active: !currentStatus })
            .eq('id', userId);
        
        if (error) {
            toast.error('사용자 상태 변경 실패: ' + error.message);
        } else {
            toast.success(!currentStatus ? '사용자 계정이 활성화되었습니다.' : '사용자 계정이 비활성화되었습니다.');
            fetchUsers();
        }
    };

    const fetchBooks = async () => {
        setIsDataLoading(true);
        const { data, error } = await supabase
            .from('books')
            .select('*')
            .order('title', { ascending: true });
        
        if (error) {
            toast.error('도서 목록을 불러오지 못했습니다: ' + error.message);
        } else {
            setBooks(data || []);
        }
        setIsDataLoading(false);
    };

    const handleCreateBook = async () => {
        if (!newBook.title || !newBook.author || !newBook.bookid) {
            return toast.error('도서 ID, 제목, 저자는 필수 항목입니다.');
        }
        
        const { error } = await supabase
            .from('books')
            .insert([newBook]);
        
        if (error) {
            toast.error('도서 등록 실패: ' + error.message);
        } else {
            toast.success('도서가 등록되었습니다.');
            setIsBookModalOpen(false);
            setNewBook({
                bookid: '',
                title: '',
                author: '',
                imgsrc: '',
                category: '소설',
                description: '',
                toc: ''
            });
            fetchBooks();
        }
    };

    const handleDeleteBook = async (bookId: string) => {
        if (!confirm('정말 이 도서를 삭제하시겠습니까?')) return;
        
        const { error } = await supabase
            .from('books')
            .delete()
            .eq('id', bookId);
        
        if (error) {
            toast.error('도서 삭제 실패: ' + error.message);
        } else {
            toast.success('도서가 삭제되었습니다.');
            fetchBooks();
        }
    };

    const fetchReports = async () => {
        setIsDataLoading(true);
        const { data, error } = await supabase
            .from('reports')
            .select(`
                *,
                profiles (
                    nickname,
                    email
                )
            `)
            .order('created_at', { ascending: false });
        
        if (error) {
            toast.error('신고/문의 내역을 불러오지 못했습니다: ' + error.message);
        } else {
            const mappedData = (data || []).map((item: any) => ({
                ...item,
                profiles: item.profiles ? {
                    nickname: item.profiles.nickname,
                    email: item.profiles.email
                } : undefined
            }));
            setReports(mappedData);
        }
        setIsDataLoading(false);
    };

    const handleResolveReport = async (reportId: string, reply: string) => {
        if (!reply.trim()) return toast.error('답변 내용을 입력해주세요.');
        
        const { error } = await supabase
            .from('reports')
            .update({ 
                status: 'resolved', 
                reply_content: reply,
                updated_at: new Date().toISOString()
            })
            .eq('id', reportId);
        
        if (error) {
            toast.error('처리 실패: ' + error.message);
        } else {
            toast.success('해결 완료 및 답변이 등록되었습니다.');
            setReplyingReportId(null);
            setReplyContent('');
            fetchReports();
        }
    };

    const handleRejectReport = async (reportId: string) => {
        if (!confirm('이 신고/문의를 반려 처리하시겠습니까?')) return;
        
        const { error } = await supabase
            .from('reports')
            .update({ 
                status: 'rejected',
                updated_at: new Date().toISOString()
            })
            .eq('id', reportId);
        
        if (error) {
            toast.error('처리 실패: ' + error.message);
        } else {
            toast.success('반려 처리되었습니다.');
            fetchReports();
        }
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

    // Show full screen loader during initial authentication check
    if (!isInitialized || (user && loading && !userProfile)) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
                <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
                <div className="text-gray-500 font-bold animate-pulse">관리자 권한을 확인하고 있습니다...</div>
            </div>
        );
    }

    // Admin Auth Gate with Redirect Prompt
    if (!user || !userProfile?.is_admin) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50 px-4">
                <main className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-2xl border border-gray-100 text-center animate-in zoom-in-95 duration-500">
                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-8">
                        <Lock size={40} />
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">관리자 전용 공간</h1>
                    <p className="text-gray-500 font-bold mb-10 leading-relaxed text-sm">
                        이 구역은 승인된 관리자만 접근 가능합니다.<br/>
                        계정이 있다면 {user ? "관리자 계정으로 다시 " : ""}로그인해 주세요.
                    </p>
                    <div className="space-y-3">
                        <button 
                            onClick={async () => {
                                if (user) {
                                    await signOut();
                                }
                                router.push('/admin/login');
                            }}
                            className="w-full py-5 bg-[#1e2939] text-white font-black rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-[#1e2939]/10 flex items-center justify-center gap-2"
                        >
                            <LogIn size={20} />
                            {user ? "다른 계정으로 로그인" : "관리자 로그인하기"}
                        </button>
                        <button 
                            onClick={() => router.push('/')}
                            className="w-full py-4 text-gray-400 font-bold text-sm hover:text-gray-600 transition-all"
                        >
                            홈으로 돌아가기
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
            {/* Sidebar (Dark Theme) */}
            <aside className="w-72 bg-slate-900 text-slate-300 flex flex-col transition-all duration-300">
                <div className="p-6 flex items-center gap-3 border-b border-slate-800">
                    <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-500/30">
                        <Shield size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-white tracking-tight">Admin Center</h1>
                        <p className="text-xs font-medium text-slate-400">Book,ok Management</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1 custom-scrollbar">
                    <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">메인</p>
                    <nav className="space-y-1 mb-8">
                        {[
                            { id: 'dashboard', label: '대시보드', icon: BarChart3 },
                            { id: 'statistics', label: '서비스 통계', icon: TrendingUp },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as AdminTab)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === tab.id ? 'bg-green-500 text-white shadow-md shadow-green-500/20' : 'hover:bg-slate-800 hover:text-white'}`}
                            >
                                <tab.icon size={18} />
                                {tab.label}
                            </button>
                        ))}
                    </nav>

                    <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">관리</p>
                    <nav className="space-y-1">
                        {[
                            { id: 'users', label: '사용자 관리', icon: Users },
                            { id: 'books', label: '도서/콘텐츠', icon: BookOpen },
                            { id: 'community', label: '커뮤니티 관리', icon: MessageSquare },
                            { id: 'reports', label: '신고/문의', icon: Shield },
                            { id: 'popups', label: '팝업 배너', icon: Megaphone }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as AdminTab)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === tab.id ? 'bg-green-500 text-white shadow-md shadow-green-500/20' : 'hover:bg-slate-800 hover:text-white'}`}
                            >
                                <tab.icon size={18} />
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-4 border-t border-slate-800">
                    <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-xl mb-4">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300">
                            {userProfile?.nickname?.charAt(0) || 'A'}
                        </div>
                        <div className="flex-1 truncate">
                            <p className="text-sm font-bold text-white truncate">{userProfile?.nickname || '관리자'}</p>
                            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                        </div>
                    </div>
                    <button 
                        onClick={async () => {
                            try {
                                await signOut();
                                window.location.href = '/admin/login';
                            } catch (e) {
                                window.location.href = '/';
                            }
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-red-400 hover:bg-red-400/10 hover:text-red-300 transition-all"
                    >
                        <XCircle size={18} />
                        로그아웃
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Topbar */}
                <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 shadow-sm z-10">
                    <h2 className="text-lg font-black text-gray-800">
                        {activeTab === 'dashboard' && '시스템 대시보드'}
                        {activeTab === 'statistics' && '서비스 통계'}
                        {activeTab === 'users' && '사용자 관리'}
                        {activeTab === 'books' && '도서 및 콘텐츠 관리'}
                        {activeTab === 'community' && '커뮤니티 관리'}
                        {activeTab === 'reports' && '신고 및 문의 내역'}
                        {activeTab === 'popups' && '메인 팝업 배너 관리'}
                    </h2>
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">v1.0.0</span>
                    </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="max-w-6xl mx-auto space-y-8">
                        {activeTab === 'dashboard' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                    {[
                                        { label: "총 사용자", value: stats?.totalUsers || "...", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
                                        { label: "오늘 가입", value: stats?.todaySignups || "...", icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
                                        { label: "총 게시글", value: stats?.totalPosts || "...", icon: MessageSquare, color: "text-purple-600", bg: "bg-purple-50" },
                                    ].map((stat) => (
                                        <div key={stat.label} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-6 hover:shadow-md transition-all">
                                            <div className={`${stat.bg} ${stat.color} p-4 rounded-xl`}>
                                                <stat.icon size={28} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-gray-400 uppercase tracking-wider">{stat.label}</p>
                                                <p className="text-3xl font-black text-gray-900 mt-1">{stat.value}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm min-h-[400px] flex flex-col items-center justify-center text-gray-400">
                                    <BarChart3 size={48} className="mb-4 opacity-50" />
                                    <p className="font-bold">추가 대시보드 지표를 여기에 구성할 수 있습니다.</p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'statistics' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <AdminStatistics />
                            </div>
                        )}
                        
                        {activeTab === 'users' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div>
                                        <p className="text-gray-500 font-medium">서비스에 가입된 회원들의 권한과 상태를 조율합니다.</p>
                                    </div>
                                    <div className="relative w-full md:w-80">
                                        <input 
                                            type="text" 
                                            placeholder="닉네임 또는 이메일 검색..." 
                                            value={userSearchQuery}
                                            onChange={(e) => setUserSearchQuery(e.target.value)}
                                            className="w-full bg-white border border-gray-100 rounded-2xl pl-12 pr-4 py-3 font-bold text-gray-900 shadow-sm focus:ring-4 focus:ring-green-100 transition-all outline-none"
                                        />
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    </div>
                                </header>

                                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                                    {isDataLoading ? (
                                        <div className="py-20 text-center text-gray-400 font-bold">로딩 중...</div>
                                    ) : (
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="bg-gray-50 border-b border-gray-100">
                                                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase">가입 정보</th>
                                                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase">연락처 / 가입일</th>
                                                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase">역할 (Role)</th>
                                                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase">관리자 권한</th>
                                                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase">계정 상태</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {users
                                                    .filter(u => 
                                                        (u.nickname?.toLowerCase().includes(userSearchQuery.toLowerCase())) ||
                                                        (u.email?.toLowerCase().includes(userSearchQuery.toLowerCase()))
                                                    )
                                                    .map((u) => (
                                                        <tr key={u.id} className="hover:bg-gray-50/50 transition">
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-black flex items-center justify-center">
                                                                        {u.nickname?.charAt(0) || 'U'}
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-bold text-gray-900">{u.nickname || '닉네임 없음'}</div>
                                                                        <div className="text-xs text-gray-400 font-medium">{u.email || '이메일 없음'}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="text-sm font-medium text-gray-700">{u.phone || '-'}</div>
                                                                <div className="text-[10px] text-gray-400 font-bold mt-0.5 uppercase tracking-wider">
                                                                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <select 
                                                                    value={u.role} 
                                                                    onChange={(e) => changeUserRole(u.id, e.target.value)}
                                                                    className="bg-gray-50 border-none rounded-xl px-3 py-2 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-green-100 transition-all outline-none"
                                                                >
                                                                    <option value="user">일반 사용자 (User)</option>
                                                                    <option value="parent">학부모 (Parent)</option>
                                                                    <option value="children">어린이 (Children)</option>
                                                                </select>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <button
                                                                    onClick={() => toggleAdminStatus(u.id, u.is_admin)}
                                                                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                                                                        u.is_admin 
                                                                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' 
                                                                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                                                    }`}
                                                                >
                                                                    {u.is_admin ? '관리자 회수' : '관리자 부여'}
                                                                </button>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <button
                                                                    onClick={() => toggleUserActive(u.id, u.is_active ?? true)}
                                                                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                                                                        (u.is_active ?? true)
                                                                            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                                                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                                                                    }`}
                                                                >
                                                                    {(u.is_active ?? true) ? '활성' : '비활성'}
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    )}
                                    {!isDataLoading && users.length === 0 && (
                                        <div className="py-20 text-center text-gray-400 font-bold">회원 목록이 비어있습니다.</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'books' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div>
                                        <p className="text-gray-500 font-medium">플랫폼의 추천 도서 및 전체 도서 데이터를 관리합니다.</p>
                                    </div>
                                    <div className="flex w-full md:w-auto gap-3 items-center">
                                        <div className="relative w-full md:w-64">
                                            <input 
                                                type="text" 
                                                placeholder="도서 제목 또는 저자 검색..." 
                                                value={bookSearchQuery}
                                                onChange={(e) => setBookSearchQuery(e.target.value)}
                                                className="w-full bg-white border border-gray-100 rounded-2xl pl-12 pr-4 py-3 font-bold text-gray-900 shadow-sm focus:ring-4 focus:ring-green-100 transition-all outline-none"
                                            />
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        </div>
                                        <button 
                                            onClick={() => setIsBookModalOpen(true)}
                                            className="flex items-center gap-2 bg-[#1e2939] text-white px-5 py-3 rounded-2xl font-bold hover:bg-[#2e3b4e] hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-[#1e2939]/10 shrink-0"
                                        >
                                            <Plus size={18} />
                                            도서 등록
                                        </button>
                                    </div>
                                </header>

                                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                                    {isDataLoading ? (
                                        <div className="py-20 text-center text-gray-400 font-bold">로딩 중...</div>
                                    ) : (
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="bg-gray-50 border-b border-gray-100">
                                                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase">도서 정보</th>
                                                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase">저자 / 분류</th>
                                                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase">설명 / 목차</th>
                                                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase text-right">관리</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {books
                                                    .filter(b => 
                                                        (b.title?.toLowerCase().includes(bookSearchQuery.toLowerCase())) ||
                                                        (b.author?.toLowerCase().includes(bookSearchQuery.toLowerCase()))
                                                    )
                                                    .map((b) => (
                                                        <tr key={b.id} className="hover:bg-gray-50/50 transition">
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-4 max-w-sm">
                                                                    <div className="w-12 h-16 bg-gray-100 rounded-lg overflow-hidden shrink-0 border border-gray-100 shadow-sm">
                                                                        {b.imgsrc ? (
                                                                            <img src={b.imgsrc} alt={b.title} className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center text-gray-300"><BookOpen size={20} /></div>
                                                                        )}
                                                                    </div>
                                                                    <div className="truncate">
                                                                        <div className="font-bold text-gray-900 truncate" title={b.title}>{b.title}</div>
                                                                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">ID: {b.bookid}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="text-sm font-bold text-gray-800">{b.author}</div>
                                                                <span className="inline-block px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-black rounded-lg mt-1">
                                                                    {b.category || '기타'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 max-w-xs">
                                                                <div className="text-xs text-gray-500 line-clamp-2" title={b.description}>{b.description || '-'}</div>
                                                                {b.toc && <div className="text-[10px] text-gray-400 font-medium truncate mt-1">목차 포함</div>}
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <button
                                                                    onClick={() => handleDeleteBook(b.id)}
                                                                    className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 hover:text-red-700 transition-colors"
                                                                    title="도서 삭제"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    )}
                                    {!isDataLoading && books.length === 0 && (
                                        <div className="py-20 text-center text-gray-400 font-bold">등록된 도서가 없습니다.</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'reports' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div>
                                        <p className="text-gray-500 font-medium">사용자들이 접수한 서비스 문의 및 게시글/댓글 신고 내역입니다.</p>
                                    </div>
                                    <div className="flex bg-gray-100 p-1 rounded-xl">
                                        {[
                                            { id: 'all', label: '전체' },
                                            { id: 'pending', label: '대기중' },
                                            { id: 'resolved', label: '해결완료' },
                                            { id: 'rejected', label: '반려됨' }
                                        ].map((t) => (
                                            <button
                                                key={t.id}
                                                onClick={() => setReportFilter(t.id as any)}
                                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${reportFilter === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                            >
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </header>

                                <div className="space-y-4">
                                    {isDataLoading ? (
                                        <div className="py-20 text-center text-gray-400 font-bold bg-white rounded-3xl border border-gray-100 shadow-sm">로딩 중...</div>
                                    ) : (
                                        reports
                                            .filter(r => reportFilter === 'all' || r.status === reportFilter)
                                            .map((r) => {
                                                const isOpen = replyingReportId === r.id;
                                                return (
                                                    <div 
                                                        key={r.id} 
                                                        className={`bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-300 ${
                                                            r.status === 'pending' ? 'border-l-4 border-l-amber-500' : 
                                                            r.status === 'resolved' ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-red-500'
                                                        }`}
                                                    >
                                                        <div 
                                                            onClick={() => {
                                                                if (isOpen) {
                                                                    setReplyingReportId(null);
                                                                } else {
                                                                    setReplyingReportId(r.id);
                                                                    setReplyContent(r.reply_content || '');
                                                                }
                                                            }}
                                                            className="p-6 flex items-center justify-between cursor-pointer hover:bg-gray-50/30 transition-colors"
                                                        >
                                                            <div className="flex-1 min-w-0 pr-4">
                                                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                                                                        r.type === 'report' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                                                                    }`}>
                                                                        {r.type === 'report' ? '신고' : '문의'}
                                                                    </span>
                                                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                                                                        r.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                                                        r.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                                    }`}>
                                                                        {r.status === 'pending' ? '대기중' :
                                                                        r.status === 'resolved' ? '해결완료' : '반려됨'}
                                                                    </span>
                                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                                                        {new Date(r.created_at).toLocaleString()}
                                                                    </span>
                                                                </div>
                                                                <h4 className="text-base font-black text-gray-900 truncate">{r.title}</h4>
                                                                <p className="text-xs font-bold text-gray-400 mt-1">
                                                                    작성자: {r.profiles?.nickname || '알 수 없음'} ({r.profiles?.email || '-'})
                                                                </p>
                                                            </div>
                                                            <div className="text-gray-400">
                                                                {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                            </div>
                                                        </div>

                                                        {isOpen && (
                                                            <div className="px-6 pb-6 pt-2 border-t border-gray-50 bg-gray-50/30">
                                                                <div className="bg-white p-5 rounded-2xl border border-gray-100 mb-5">
                                                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">상세 내용</p>
                                                                    <p className="text-sm font-medium text-gray-800 whitespace-pre-wrap leading-relaxed">{r.content}</p>
                                                                    {r.target_type && (
                                                                        <div className="mt-4 pt-3 border-t border-gray-50 flex items-center gap-2 text-xs font-bold text-amber-600">
                                                                            <AlertTriangle size={14} />
                                                                            신고 대상: {r.target_type} (ID: {r.target_id})
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {r.type === 'inquiry' ? (
                                                                    <div className="space-y-3">
                                                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">답변 등록</label>
                                                                        <textarea
                                                                            value={replyContent}
                                                                            onChange={(e) => setReplyContent(e.target.value)}
                                                                            placeholder="답변 내용을 작성해 주세요..."
                                                                            className="w-full bg-white border border-gray-100 rounded-2xl p-4 font-bold text-sm text-gray-900 focus:ring-4 focus:ring-green-100 transition-all outline-none h-32"
                                                                        />
                                                                        <div className="flex justify-end gap-2">
                                                                            {r.status === 'pending' && (
                                                                                <button
                                                                                    onClick={() => handleRejectReport(r.id)}
                                                                                    className="px-5 py-2.5 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition"
                                                                                >
                                                                                    반려하기
                                                                                </button>
                                                                            )}
                                                                            <button
                                                                                onClick={() => handleResolveReport(r.id, replyContent)}
                                                                                className="px-5 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition"
                                                                            >
                                                                                {r.status === 'resolved' ? '답변 수정' : '답변 등록 (해결)'}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex justify-end gap-2">
                                                                        {r.status === 'pending' && (
                                                                            <>
                                                                                <button
                                                                                    onClick={() => handleRejectReport(r.id)}
                                                                                    className="px-5 py-2.5 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition"
                                                                                >
                                                                                    신고 반려
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleResolveReport(r.id, '신고 처리 완료')}
                                                                                    className="px-5 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition"
                                                                                >
                                                                                    신고 처리 (해결)
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                        {r.status !== 'pending' && (
                                                                            <div className="text-xs font-bold text-gray-400 py-2">
                                                                                이미 처리 완료된 신고 항목입니다. ({r.reply_content})
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                    )}
                                    {!isDataLoading && reports.filter(r => reportFilter === 'all' || r.status === reportFilter).length === 0 && (
                                        <div className="py-20 text-center text-gray-400 font-bold bg-white rounded-3xl border border-gray-100 shadow-sm">내역이 없습니다.</div>
                                    )}
                                </div>
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
                                    <p className="text-gray-500 font-medium">메인 화면에 노출될 이벤트 팝업을 관리합니다.</p>
                                </div>
                                <button 
                                    onClick={() => setIsPopupModalOpen(true)}
                                    className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-sm"
                                >
                                    <Plus size={18} />
                                    새 팝업 등록
                                </button>
                            </header>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {popups.map((popup) => (
                                    <div key={popup.id} className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group transition-all hover:shadow-md ${!popup.is_active ? 'grayscale opacity-70' : ''}`}>
                                        <div className="aspect-video bg-gray-100 relative overflow-hidden">
                                            {popup.image_url ? (
                                                <img src={popup.image_url} alt={popup.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                                                    <Layout size={32} />
                                                    <span className="text-[10px] font-bold mt-2 font-mono">NO IMAGE</span>
                                                </div>
                                            )}
                                            <div className="absolute top-3 right-3 flex gap-2">
                                                <button 
                                                    onClick={() => togglePopupActive(popup.id, popup.is_active)}
                                                    className={`p-2 rounded-lg shadow-sm backdrop-blur-md transition-all ${popup.is_active ? 'bg-green-500 text-white' : 'bg-gray-500/80 text-white'}`}
                                                >
                                                    {popup.is_active ? <CheckCircle size={16} /> : <XCircle size={16} />}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="p-5">
                                            <h3 className="text-lg font-black mb-1 truncate">{popup.title}</h3>
                                            <p className="text-gray-500 text-xs line-clamp-2 mb-4 h-8">{popup.content}</p>
                                            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                                <div className="flex items-center gap-1.5 text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                                                    <Calendar size={12} />
                                                    {new Date(popup.created_at).toLocaleDateString()}
                                                </div>
                                                {popup.link_url && (
                                                    <a href={popup.link_url} target="_blank" className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-[10px] font-black bg-blue-50 px-2 py-1 rounded-md transition-colors">
                                                        링크 확인 <ExternalLink size={10} />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {popups.length === 0 && <div className="py-20 text-center text-gray-400 font-bold bg-white rounded-2xl border border-dashed border-gray-200">등록된 팝업이 없습니다.</div>}
                        </div>
                    )}
                    </div>
                </div>
            </main>

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

            {/* Book Creation Modal */}
            {isBookModalOpen && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900">새 도서 등록</h2>
                                <p className="text-sm text-gray-500 mb-0">도서 정보 데이터를 입력하세요.</p>
                            </div>
                            <button onClick={() => setIsBookModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <div className="p-8 space-y-5 overflow-y-auto max-h-[60vh] custom-scrollbar">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">도서 ID (영문/숫자)</label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-gray-900 focus:ring-4 focus:ring-green-100 transition-all outline-none"
                                        placeholder="예: book_01"
                                        value={newBook.bookid}
                                        onChange={(e) => setNewBook({...newBook, bookid: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">카테고리</label>
                                    <select 
                                        className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-gray-900 focus:ring-4 focus:ring-green-100 transition-all outline-none"
                                        value={newBook.category}
                                        onChange={(e) => setNewBook({...newBook, category: e.target.value})}
                                    >
                                        <option value="소설">소설</option>
                                        <option value="시/에세이">시/에세이</option>
                                        <option value="인문">인문</option>
                                        <option value="역사">역사</option>
                                        <option value="과학">과학</option>
                                        <option value="예술">예술</option>
                                        <option value="아동">아동</option>
                                        <option value="기타">기타</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">도서 제목</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-gray-900 focus:ring-4 focus:ring-green-100 transition-all outline-none"
                                    placeholder="도서 제목을 입력하세요"
                                    value={newBook.title}
                                    onChange={(e) => setNewBook({...newBook, title: e.target.value})}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">저자</label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-gray-900 focus:ring-4 focus:ring-green-100 transition-all outline-none"
                                        placeholder="저자 이름"
                                        value={newBook.author}
                                        onChange={(e) => setNewBook({...newBook, author: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">표지 이미지 URL (선택)</label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-gray-900 focus:ring-4 focus:ring-green-100 transition-all outline-none"
                                        placeholder="https://..."
                                        value={newBook.imgsrc}
                                        onChange={(e) => setNewBook({...newBook, imgsrc: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">도서 상세 설명 (선택)</label>
                                <textarea 
                                    className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-gray-900 focus:ring-4 focus:ring-green-100 transition-all outline-none h-24"
                                    placeholder="책에 대한 상세 소개 문구"
                                    value={newBook.description}
                                    onChange={(e) => setNewBook({...newBook, description: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">목차 (선택)</label>
                                <textarea 
                                    className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-gray-900 focus:ring-4 focus:ring-green-100 transition-all outline-none h-24"
                                    placeholder="목차를 입력하세요 (줄바꿈 구분 가능)"
                                    value={newBook.toc}
                                    onChange={(e) => setNewBook({...newBook, toc: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="p-8 pt-4 flex gap-4 bg-gray-50/50">
                            <button 
                                onClick={() => setIsBookModalOpen(false)}
                                className="flex-1 py-4 bg-white text-gray-500 font-black rounded-2xl border hover:bg-gray-100 transition shadow-sm"
                            >
                                취소
                            </button>
                            <button 
                                onClick={handleCreateBook}
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
