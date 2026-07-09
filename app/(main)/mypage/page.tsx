"use client";

import { useEffect, useState } from "react";
import Header from "@shared/ui/Header";
import { useAuth } from "@features/auth/AuthContext";
import { supabase } from "@shared/lib/supabase";
import { Child, MainMenu, ReadBook } from "@shared/types";
import { User, Plus, X, BookOpen, Bookmark, BarChart2, ChevronRight, BookMarked, Star, AlertTriangle, Edit2, Check, MapPin, Building } from "lucide-react";
import { REGIONS, SUB_REGIONS } from "@shared/lib/regions";
import { useRouter } from "next/navigation";
import EmptyState from "@shared/ui/EmptyState";
import { toast } from "sonner";
import ReadingGoalWidget from "@features/reading/ReadingGoalWidget";
import MobileDrawer from "@shared/ui/MobileDrawer";
import SkeletonLoader from "@shared/ui/SkeletonLoader";

export default function MyPage() {
    const [activeMenu, setActiveMenu] = useState<MainMenu>('rec');
    const [activeSubMenu, setActiveSubMenu] = useState('');
    const { user, userProfile, signOut, loading: authLoading, refreshChildren, children, refreshProfile } = useAuth();

    const [isEditingNickname, setIsEditingNickname] = useState(false);
    const [editedNickname, setEditedNickname] = useState("");
    const [isSavingNickname, setIsSavingNickname] = useState(false);

    const handleEditNicknameClick = () => {
        setEditedNickname(userProfile?.nickname || user?.email?.split('@')[0] || "");
        setIsEditingNickname(true);
    };

    const handleSaveNickname = async () => {
        if (!editedNickname.trim() || !user) return;
        setIsSavingNickname(true);
        try {
            const { error } = await supabase.from('profiles').update({ nickname: editedNickname.trim() }).eq('id', user.id);
            if (error) throw error;
            await refreshProfile();
            setIsEditingNickname(false);
            toast.success("닉네임이 변경되었습니다.");
        } catch (error: any) {
            toast.error("닉네임 변경 실패: " + error.message);
        } finally {
            setIsSavingNickname(false);
        }
    };
    // const [children, setChildren] = useState<Child[]>([]); // Removed: Using context children
    const router = useRouter();

    // Child creation state
    const [newChildNickname, setNewChildNickname] = useState('');
    const [newChildBirthdate, setNewChildBirthdate] = useState('');
    const [newChildType, setNewChildType] = useState('유아');
    const [isAddingChild, setIsAddingChild] = useState(false);

    // Active Child & Stats
    const [activeChild, setActiveChild] = useState<Child | null>(null);
    const [readBookCount, setReadBookCount] = useState(0);
    const [readBooks, setReadBooks] = useState<ReadBook[]>([]);
    const [showReadBooksModal, setShowReadBooksModal] = useState(false);

    // Library registration state
    const [isAddingLibrary, setIsAddingLibrary] = useState(false);
    const [selectedRegion, setSelectedRegion] = useState("");
    const [selectedSubRegion, setSelectedSubRegion] = useState("");
    const [foundLibraries, setFoundLibraries] = useState<Array<{ libCode: string; libName: string; address: string }>>([]);
    const [isSearchingLibraries, setIsSearchingLibraries] = useState(false);
    const [isSavingLibrary, setIsSavingLibrary] = useState(false);

    useEffect(() => {
        const fetchLibraries = async () => {
            if (!selectedRegion || !selectedSubRegion) {
                setFoundLibraries([]);
                return;
            }
            setIsSearchingLibraries(true);
            try {
                const res = await fetch(`/api/library/search?region=${selectedRegion}&dtl_region=${selectedSubRegion}`);
                if (!res.ok) throw new Error("도서관 검색 실패");
                const data = await res.json();
                setFoundLibraries(data.libraries || []);
            } catch (err: any) {
                console.error(err);
                toast.error("도서관 목록을 불러오지 못했습니다.");
            } finally {
                setIsSearchingLibraries(false);
            }
        };
        fetchLibraries();
    }, [selectedRegion, selectedSubRegion]);

    const handleAddLibrary = async (lib: { libCode: string; libName: string }) => {
        console.log("handleAddLibrary clicked:", lib);
        toast.info("도서관 등록 중...");

        if (!user) {
            console.error("handleAddLibrary failed: user is null");
            toast.error("로그인이 필요합니다.");
            return;
        }

        const rawLibs = userProfile?.favorite_libraries;
        const currentLibs = Array.isArray(rawLibs) ? rawLibs : [];
        console.log("currentLibs:", currentLibs);

        if (currentLibs.length >= 3) {
            toast.error("자주가는 도서관은 최대 3곳까지만 등록할 수 있습니다.");
            return;
        }
        if (currentLibs.some(l => String(l.libCode) === String(lib.libCode))) {
            toast.error("이미 등록된 도서관입니다.");
            return;
        }

        setIsSavingLibrary(true);
        const updatedLibs = [...currentLibs, { libCode: String(lib.libCode), libName: lib.libName }];
        console.log("Saving updated libs:", updatedLibs);

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ favorite_libraries: updatedLibs })
                .eq('id', user.id);
                
            if (error) throw error;
            
            await refreshProfile();
            toast.success(`${lib.libName}이(가) 등록되었습니다.`);
            setIsAddingLibrary(false);
            setSelectedRegion("");
            setSelectedSubRegion("");
            setFoundLibraries([]);
        } catch (err: any) {
            console.error("Supabase update error:", err);
            toast.error("도서관 등록 실패: " + err.message);
        } finally {
            setIsSavingLibrary(false);
        }
    };

    const handleDeleteLibrary = async (libCode: string) => {
        if (!user) return;
        const rawLibs = userProfile?.favorite_libraries;
        const currentLibs = Array.isArray(rawLibs) ? rawLibs : [];
        const updatedLibs = currentLibs.filter(l => String(l.libCode) !== String(libCode));
        
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ favorite_libraries: updatedLibs })
                .eq('id', user.id);
                
            if (error) throw error;
            await refreshProfile();
            toast.success("도서관이 삭제되었습니다.");
        } catch (err: any) {
            console.error("Supabase delete error:", err);
            toast.error("도서관 삭제 실패: " + err.message);
        }
    };

    useEffect(() => {
        if (!authLoading && children.length > 0 && !activeChild) {
            setActiveChild(children[0]);
        }
    }, [authLoading, children, activeChild]);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth');
        }
    }, [authLoading, user, router]);

    // Removed local fetchChildren logic to avoid race conditions with AuthContext

    useEffect(() => {
        if (activeChild) {
            fetchReadBooks();
        } else {
            setReadBookCount(0);
            setReadBooks([]);
        }
    }, [activeChild]);

    const fetchReadBooks = async () => {
        if (!activeChild) return;
        setIsBooksLoading(true);

        try {
            const { data, error, count } = await supabase
                .from('read_books')
                .select('*, books(*)', { count: 'exact' })
                .eq('child_id', activeChild.id)
                .order('read_date', { ascending: false });

            if (error) {
                throw error;
            }

            setReadBookCount(count || 0);
            if (data) setReadBooks(data);
        } catch (error: any) {
            console.error("Error fetching read books:", error);
            toast.error("읽은 책 목록을 불러오는데 실패했습니다: " + error.message);
            setReadBookCount(0);
            setReadBooks([]);
        } finally {
            setIsBooksLoading(false);
        }
    };

    const [isLoading, setIsLoading] = useState(false);
    const [isBooksLoading, setIsBooksLoading] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const handleDeleteAccount = async () => {
        if (isDeletingAccount) return;
        setIsDeletingAccount(true);
        const toastId = toast.loading("계정 삭제 중...");

        try {
            const res = await fetch('/api/auth/delete-account', { method: 'DELETE' });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || '계정 삭제 실패');
            }

            toast.success("계정이 삭제되었습니다. 이용해 주셔서 감사합니다.", { id: toastId, duration: 4000 });
            setTimeout(() => { window.location.href = '/'; }, 2000);
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : '알 수 없는 오류';
            toast.error("계정 삭제 중 오류: " + message, { id: toastId });
            setIsDeletingAccount(false);
            setShowDeleteModal(false);
        }
    };

    const handleChildProfileSubmit = async () => {
        if (!newChildNickname || !newChildBirthdate || !user) {
            toast.error('이름과 생년월일을 모두 입력해주세요.');
            return;
        }

        setIsLoading(true);

        try {
            const { data, error } = await supabase.from('children').insert({
                name: newChildNickname,
                birthdate: newChildBirthdate,
                type: newChildType,
                parent_id: user.id
            }).select().single();

            if (error) {
                toast.error('아이 프로필 추가 실패: ' + error.message);
            } else {
                toast.success('아이 프로필이 추가되었습니다.');
                setNewChildNickname('');
                setNewChildBirthdate('');
                setIsAddingChild(false);
                await refreshChildren(); // Refresh global context
                
                if (data) {
                    const birthYear = new Date(data.birthdate).getFullYear();
                    const age = new Date().getFullYear() - birthYear;
                    setActiveChild({ ...data, age });
                }
            }
        } catch (err: any) {
            toast.error("오류가 발생했습니다: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // ... (rest of code) ...

    const handleLogout = async () => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);
        const toastId = toast.loading("로그아웃 중...");
        
        try {
            await signOut();
            toast.success("로그아웃되었습니다.", { id: toastId });
            window.location.href = '/'; 
        } catch (e) {
            console.error(e);
            toast.error("로그아웃 중 오류가 발생했습니다.", { id: toastId });
            window.location.href = '/';
        }
    };

    const [searchQuery, setSearchQuery] = useState("");

    const handleSearch = () => {
        if (searchQuery.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
        }
    };

    const dummySetView = () => { };

    return (
        <div className="min-h-screen bg-[#FDFDFD] text-gray-900 font-sans pb-24 lg:pb-0">
            <Header
                view="mypage"
                setView={dummySetView}
                activeMenu={activeMenu}
                setActiveMenu={setActiveMenu}
                setActiveSubMenu={setActiveSubMenu}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                handleSearch={handleSearch}
            />


            <div className="max-w-xl mx-auto px-6 py-8">
                {authLoading ? (
                    // Loading Skeleton
                    <div className="space-y-8 animate-pulse">
                        <div className="flex items-center gap-5 mb-10">
                            <div className="w-20 h-20 bg-gray-200 rounded-full"></div>
                            <div>
                                <div className="h-6 w-32 bg-gray-200 rounded mb-2"></div>
                                <div className="h-4 w-24 bg-gray-200 rounded"></div>
                            </div>
                        </div>
                        <div className="h-40 bg-gray-200 rounded-4xl"></div>
                        <div className="space-y-4">
                            <div className="h-24 bg-gray-200 rounded-4xl"></div>
                            <div className="h-24 bg-gray-200 rounded-4xl"></div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Profile Section */}
                        <div className="flex items-center gap-5 mb-10">
                            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 overflow-hidden shrink-0">
                                <User size={40} />
                            </div>
                            <div className="flex-1 min-w-0">
                                {isEditingNickname ? (
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="text" 
                                            value={editedNickname}
                                            onChange={(e) => setEditedNickname(e.target.value)}
                                            className="w-full max-w-[200px] p-2 border border-gray-200 rounded-xl text-lg font-black focus:outline-none focus:ring-2 focus:ring-green-500"
                                            autoFocus
                                            disabled={isSavingNickname}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveNickname();
                                            }}
                                        />
                                        <button onClick={handleSaveNickname} disabled={isSavingNickname} className="p-2 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-50">
                                            {isSavingNickname ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={20} />}
                                        </button>
                                        <button onClick={() => setIsEditingNickname(false)} disabled={isSavingNickname} className="p-2 bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 disabled:opacity-50">
                                            <X size={20} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-2xl font-black text-gray-900 truncate max-w-[200px]">{userProfile?.nickname || user?.email?.split('@')[0]}</h2>
                                        <button onClick={handleEditNicknameClick} className="p-1.5 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors">
                                            <Edit2 size={16} />
                                        </button>
                                    </div>
                                )}
                                <p className="text-gray-400 text-sm mt-1 truncate">{user?.email}</p>
                            </div>
                        </div>

                        {/* Main List Menu */}
                        <div className="space-y-4">
                            {/* Children Section */}
                            <div className="bg-white rounded-4xl p-6 shadow-sm border border-gray-100">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2.5 bg-green-100 text-green-600 rounded-xl"><Plus size={20} /></div>
                                    <h3 className="text-lg font-bold">아이 프로필</h3>
                                </div>

                                {/* List of Children */}
                                <div className="space-y-3 mb-4">
                                    {children.map(child => (
                                        <button
                                            key={child.id}
                                            onClick={() => setActiveChild(child)}
                                            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${activeChild?.id === child.id ? 'bg-green-50 border-2 border-green-100' : 'bg-gray-50 border border-transparent'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black shadow-sm ${activeChild?.id === child.id ? 'bg-green-500 text-white' : 'bg-white text-green-600'}`}>
                                                    {child.name[0]}
                                                </div>
                                                <div className="text-left">
                                                    <div className={`font-bold text-sm ${activeChild?.id === child.id ? 'text-green-900' : 'text-gray-900'}`}>{child.name}</div>
                                                    <div className="text-xs text-gray-400">{child.age}세 · {child.type}</div>
                                                </div>
                                            </div>
                                            {activeChild?.id === child.id && <div className="text-xs font-bold text-green-600 bg-white px-2 py-1 rounded-lg shadow-sm">선택됨</div>}
                                        </button>
                                    ))}
                                </div>

                                {/* Add Child Button / Form */}
                                {!isAddingChild ? (
                                    <button onClick={() => setIsAddingChild(true)} className="w-full py-3 text-center text-sm font-bold text-gray-400 hover:text-green-600 border border-dashed border-gray-200 rounded-xl transition-colors">
                                        + 아이 프로필 추가하기
                                    </button>
                                ) : (
                                    <div className="bg-gray-50 p-5 rounded-2xl animate-in fade-in">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="font-bold text-sm">새 프로필 입력</h4>
                                            <button onClick={() => setIsAddingChild(false)}><X size={16} className="text-gray-400" /></button>
                                        </div>
                                        <div className="space-y-3">
                                            <input type="text" id="childNickname" name="childNickname" placeholder="이름 (닉네임)" value={newChildNickname} onChange={e => setNewChildNickname(e.target.value)} disabled={isLoading} className="w-full p-3 rounded-xl border border-gray-200 text-sm font-bold outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50" />
                                            <input type="date" id="childBirthdate" name="childBirthdate" value={newChildBirthdate} onChange={e => setNewChildBirthdate(e.target.value)} disabled={isLoading} className="w-full p-3 rounded-xl border border-gray-200 text-sm font-bold outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50" />
                                            <select id="childType" name="childType" value={newChildType} onChange={e => setNewChildType(e.target.value)} disabled={isLoading} className="w-full p-3 rounded-xl border border-gray-200 text-sm font-bold outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50">
                                                <option value="영아">영아 (0-4세)</option>
                                                <option value="유아">유아 (5-7세)</option>
                                                <option value="초등저학년">초등 저학년 (8-10세)</option>
                                                <option value="초등고학년">초등 고학년 (11-13세)</option>
                                            </select>
                                            <button
                                                onClick={handleChildProfileSubmit}
                                                disabled={isLoading}
                                                className="w-full bg-green-600 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-green-100 hover:bg-green-700 transition flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                                            >
                                                {isLoading ? (
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    '등록 완료'
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 자주가는 도서관 Section */}
                            <div className="bg-white rounded-4xl p-6 shadow-sm border border-gray-100 animate-in fade-in">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-green-100 text-green-600 rounded-xl">
                                            <MapPin size={20} />
                                        </div>
                                        <h3 className="text-lg font-bold">자주가는 도서관</h3>
                                    </div>
                                    <span className="text-xs text-gray-400 font-bold">
                                        {userProfile?.favorite_libraries?.length || 0} / 3
                                    </span>
                                </div>

                                {/* List of Favorite Libraries */}
                                <div className="space-y-3 mb-4">
                                    {(userProfile?.favorite_libraries || []).map(lib => (
                                        <div
                                            key={lib.libCode}
                                            className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-transparent hover:border-gray-100 transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-white text-green-600 flex items-center justify-center font-black shadow-sm shrink-0">
                                                    <Building size={18} />
                                                </div>
                                                <div className="text-left min-w-0">
                                                    <div className="font-bold text-sm text-gray-900 truncate">{lib.libName}</div>
                                                    <div className="text-[10px] text-gray-400">코드: {lib.libCode}</div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteLibrary(lib.libCode)}
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}

                                    {(!userProfile?.favorite_libraries || userProfile?.favorite_libraries?.length === 0) && !isAddingLibrary && (
                                        <p className="text-sm text-gray-400 text-center py-6 leading-relaxed">
                                            자주가는 도서관을 등록하고<br />도서 소장 및 대출 가능 여부를 확인해 보세요.
                                        </p>
                                    )}
                                </div>

                                {/* Add Library Button / Form */}
                                {!isAddingLibrary ? (
                                    (userProfile?.favorite_libraries?.length || 0) < 3 && (
                                        <button
                                            onClick={() => setIsAddingLibrary(true)}
                                            className="w-full py-3.5 text-center text-sm font-bold text-gray-400 hover:text-green-600 border border-dashed border-gray-200 rounded-xl hover:border-green-300 transition-all cursor-pointer"
                                        >
                                            + 자주가는 도서관 추가하기
                                        </button>
                                    )
                                ) : (
                                    <div className="bg-gray-50 p-5 rounded-2xl animate-in fade-in duration-300">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="font-bold text-sm text-gray-900">도서관 검색 및 추가</h4>
                                            <button onClick={() => {
                                                setIsAddingLibrary(false);
                                                setSelectedRegion("");
                                                setSelectedSubRegion("");
                                                setFoundLibraries([]);
                                            }} className="p-1 hover:bg-gray-200 rounded-lg text-gray-400">
                                                <X size={16} />
                                            </button>
                                        </div>
                                        <div className="space-y-3">
                                            {/* 시도 선택 */}
                                            <select
                                                value={selectedRegion}
                                                onChange={e => {
                                                    setSelectedRegion(e.target.value);
                                                    setSelectedSubRegion("");
                                                    setFoundLibraries([]);
                                                }}
                                                className="w-full p-3 rounded-xl border border-gray-200 text-sm font-bold outline-none bg-white focus:ring-2 focus:ring-green-500"
                                            >
                                                <option value="">시/도 선택</option>
                                                {REGIONS.map(r => (
                                                    <option key={r.code} value={r.code}>{r.name}</option>
                                                ))}
                                            </select>

                                            {/* 구군 선택 */}
                                            <select
                                                value={selectedSubRegion}
                                                onChange={e => setSelectedSubRegion(e.target.value)}
                                                disabled={!selectedRegion}
                                                className="w-full p-3 rounded-xl border border-gray-200 text-sm font-bold outline-none bg-white focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                                            >
                                                <option value="">시/군/구 선택</option>
                                                {selectedRegion && SUB_REGIONS[selectedRegion]?.map(sr => (
                                                    <option key={sr.code} value={sr.code}>{sr.name}</option>
                                                ))}
                                            </select>

                                            {/* 검색 결과 도서관 목록 */}
                                            {selectedSubRegion && (
                                                <div className="mt-4 border-t border-gray-200/50 pt-3">
                                                    <p className="text-xs font-bold text-gray-400 mb-2">검색 결과</p>
                                                    {isSearchingLibraries ? (
                                                        <div className="flex justify-center py-6">
                                            <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                                                        </div>
                                                    ) : foundLibraries.length > 0 ? (
                                                        <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                                            {foundLibraries.map(lib => {
                                                                const isAlreadyAdded = Array.isArray(userProfile?.favorite_libraries) && userProfile?.favorite_libraries?.some(l => String(l.libCode) === String(lib.libCode));
                                                                return (
                                                                    <div
                                                                        key={lib.libCode}
                                                                        className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 hover:border-green-200 transition-all text-xs"
                                                                    >
                                                                        <div className="flex-1 min-w-0 pr-2">
                                                                            <div className="font-bold text-gray-900 truncate">{lib.libName}</div>
                                                                            <div className="text-[10px] text-gray-400 truncate mt-0.5">{lib.address}</div>
                                                                        </div>
                                                                        <button
                                                                            onClick={() => handleAddLibrary(lib)}
                                                                            disabled={isAlreadyAdded || isSavingLibrary}
                                                                            className={`px-3 py-1.5 rounded-lg font-bold text-[10px] shrink-0 transition-all ${
                                                                                isAlreadyAdded 
                                                                                    ? 'bg-gray-100 text-gray-400 cursor-default' 
                                                                                    : 'bg-green-600 text-white hover:bg-green-700 active:scale-95 cursor-pointer shadow-sm shadow-green-100'
                                                                            }`}
                                                                        >
                                                                            {isAlreadyAdded ? '등록됨' : '추가'}
                                                                        </button>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-gray-400 text-center py-6">해당 지역에 검색된 도서관이 없습니다.</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Menu Items */}
                            <button
                                onClick={() => setShowReadBooksModal(true)}
                                disabled={!activeChild}
                                className="w-full bg-white rounded-4xl p-6 shadow-sm border border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center"><BookOpen size={20} strokeWidth={2.5} /></div>
                                    <div className="text-left">
                                        <h3 className="font-bold text-gray-900">읽은 책 기록</h3>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {activeChild ? `${activeChild.name} 어린이가 읽은 ${readBookCount}권의 책` : '아이를 선택해주세요'}
                                        </p>
                                    </div>
                                </div>
                                <ChevronRight size={20} className="text-gray-300" />
                            </button>

                            <button className="w-full bg-white rounded-4xl p-6 shadow-sm border border-gray-100 flex items-center justify-between opacity-60 cursor-not-allowed relative">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-yellow-50 text-yellow-500 rounded-xl flex items-center justify-center"><Bookmark size={20} strokeWidth={2.5} /></div>
                                    <div className="text-left">
                                        <h3 className="font-bold text-gray-900">스크랩한 책</h3>
                                        <p className="text-xs text-gray-400 mt-0.5">나중에 읽으려고 저장한 책</p>
                                    </div>
                                </div>
                                <span className="px-2.5 py-1 bg-gray-100 text-gray-400 text-[10px] font-bold rounded-full">준비 중</span>
                            </button>

                            <button onClick={() => router.push('/solution')} className="w-full bg-white rounded-4xl p-6 shadow-sm border border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-purple-50 text-purple-500 rounded-xl flex items-center justify-center"><BarChart2 size={20} strokeWidth={2.5} /></div>
                                    <div className="text-left">
                                        <h3 className="font-bold text-gray-900">독서 성향 분석</h3>
                                        <p className="text-xs text-gray-400 mt-0.5">AI가 분석한 우리 아이 맞춤 리포트</p>
                                    </div>
                                </div>
                                <ChevronRight size={20} className="text-gray-300" />
                            </button>

                            {/* Reading Goal Widget */}
                            {activeChild && user && (
                                <ReadingGoalWidget
                                    child={activeChild}
                                    userId={user.id}
                                    readBooks={readBooks}
                                />
                            )}
                        </div>

                        <div className="mt-8 text-center space-y-3">
                            <button 
                                onClick={handleLogout} 
                                disabled={isLoggingOut}
                                className={`text-gray-400 text-xs font-bold underline hover:text-red-500 transition-opacity ${isLoggingOut ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
                            </button>
                            <div>
                                <button
                                    onClick={() => setShowDeleteModal(true)}
                                    disabled={isDeletingAccount}
                                    className="text-gray-300 text-xs hover:text-red-400 transition-colors"
                                >
                                    계정 탈퇴
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Read Books - Mobile Drawer / Desktop Modal */}
            {showReadBooksModal && (
                <>
                    {/* Mobile: Bottom sheet drawer */}
                    <div className="lg:hidden">
                        <MobileDrawer
                            isOpen={showReadBooksModal}
                            onClose={() => setShowReadBooksModal(false)}
                            title={`${activeChild?.name}의 서재 (${readBookCount}권)`}
                        >
                            <div className="space-y-4">
                                {isBooksLoading ? (
                                    <SkeletonLoader type="list" count={3} />
                                ) : readBooks.length > 0 ? (
                                    readBooks.map((item, idx) => (
                                        <div key={idx} className="flex gap-5 p-5 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-green-500">
                                            <div className="w-20 h-28 bg-gray-100 rounded-xl overflow-hidden shrink-0 shadow-sm flex items-center justify-center text-gray-300">
                                                {item.books?.imgsrc ? (
                                                    <img src={item.books.imgsrc} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <BookOpen size={32} />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                                                <div>
                                                    <h4 className="font-bold text-gray-900 text-lg line-clamp-1 leading-tight">{item.books?.title || '제목 없음'}</h4>
                                                    <p className="text-sm text-gray-400 mt-1 line-clamp-1">{item.books?.author || '저자 미상'}</p>
                                                </div>
                                                
                                                <div className="mt-3">
                                                    <div className="flex flex-wrap items-center gap-3 mb-3">
                                                        {item.rating && (
                                                            <div className="flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded-lg border border-yellow-100">
                                                                <Star size={14} className="text-yellow-400 fill-yellow-400" />
                                                                <span className="text-xs font-black text-yellow-700">{item.rating}</span>
                                                            </div>
                                                        )}
                                                        {item.difficulty_rating && (
                                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                                                item.difficulty_rating === '쉬움' ? 'bg-blue-50 text-blue-600' : 
                                                                item.difficulty_rating === '적당' ? 'bg-green-50 text-green-600' : 
                                                                'bg-orange-50 text-orange-600'
                                                            }`}>
                                                                {item.difficulty_rating}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-gray-400 text-[11px] font-bold">
                                                        {new Date(item.read_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} 읽음
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <EmptyState icon={BookMarked} title="아직 읽은 책이 없어요" description="아이와 함께 책을 읽고 기록을 남겨보세요!" />
                                )}
                            </div>
                        </MobileDrawer>
                    </div>

                    {/* Desktop: Center modal */}
                    <div className="hidden lg:flex fixed inset-0 z-50 items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white rounded-3xl w-full max-w-lg h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95">
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">{activeChild?.name}의 서재</h3>
                                    <p className="text-xs text-gray-500 mt-1">총 {readBookCount}권의 책을 읽었어요!</p>
                                </div>
                                <button onClick={() => setShowReadBooksModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><X size={24} /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {isBooksLoading ? (
                                    <SkeletonLoader type="list" count={3} />
                                ) : readBooks.length > 0 ? (
                                    readBooks.map((item, idx) => (
                                        <div key={idx} className="flex gap-5 p-5 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-green-500">
                                            <div className="w-20 h-28 bg-gray-100 rounded-xl overflow-hidden shrink-0 shadow-sm flex items-center justify-center text-gray-300">
                                                {item.books?.imgsrc ? (
                                                    <img src={item.books.imgsrc} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <BookOpen size={32} />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                                                <div>
                                                    <h4 className="font-bold text-gray-900 text-lg line-clamp-1 leading-tight">{item.books?.title || '제목 없음'}</h4>
                                                    <p className="text-sm text-gray-400 mt-1 line-clamp-1">{item.books?.author || '저자 미상'}</p>
                                                </div>
                                                
                                                <div className="mt-3">
                                                    <div className="flex flex-wrap items-center gap-3 mb-3">
                                                        {item.rating && (
                                                            <div className="flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded-lg border border-yellow-100">
                                                                <Star size={14} className="text-yellow-400 fill-yellow-400" />
                                                                <span className="text-xs font-black text-yellow-700">{item.rating}</span>
                                                            </div>
                                                        )}
                                                        {item.difficulty_rating && (
                                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                                                item.difficulty_rating === '쉬움' ? 'bg-blue-50 text-blue-600' : 
                                                                item.difficulty_rating === '적당' ? 'bg-green-50 text-green-600' : 
                                                                'bg-orange-50 text-orange-600'
                                                            }`}>
                                                                {item.difficulty_rating}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-gray-400 text-[11px] font-bold">
                                                        {new Date(item.read_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} 읽음
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <EmptyState icon={BookMarked} title="아직 읽은 책이 없어요" description="아이와 함께 책을 읽고 기록을 남겨보세요!" />
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* 계정 탈퇴 확인 모달 */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 overflow-hidden">
                        {/* 헤더 */}
                        <div className="bg-red-50 px-6 pt-8 pb-6 text-center">
                            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle size={28} className="text-red-500" />
                            </div>
                            <h3 className="text-xl font-black text-gray-900">정말 탈퇴하시겠어요?</h3>
                            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                                탈퇴 시 모든 데이터가 <strong className="text-red-600">영구 삭제</strong>되며
                                <br />복구할 수 없습니다.
                            </p>
                        </div>
                        {/* 삭제되는 데이터 목록 */}
                        <div className="px-6 py-5">
                            <p className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">삭제되는 데이터</p>
                            <ul className="space-y-2">
                                {['아이 프로필 및 독서 기록', '독서 목표 및 분석 리포트', '계정 정보 및 로그인 이력'].map((item) => (
                                    <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                                        <X size={14} className="text-red-400 shrink-0" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        {/* 버튼 */}
                        <div className="px-6 pb-6 flex flex-col gap-2">
                            <button
                                onClick={handleDeleteAccount}
                                disabled={isDeletingAccount}
                                className="w-full py-3.5 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isDeletingAccount ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        삭제 중...
                                    </>
                                ) : '네, 탈퇴합니다'}
                            </button>
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                disabled={isDeletingAccount}
                                className="w-full py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition-colors"
                            >
                                취소
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
