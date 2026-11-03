import { useState, useEffect } from "react";
import { ChevronDown, User, ChevronRight, Plus } from "lucide-react";
import { Child, MainMenu } from "@shared/types";
import { MENU_CONFIG } from "@shared/lib/constants";
import { useAuth } from "@features/auth/AuthContext";
import { useRouter } from "next/navigation";
import { useLoginModal } from "@features/auth/LoginModalContext";
import { supabase } from "@shared/lib/supabase";

interface SidebarProps {
    activeChild: Child | null;
    activeMenu: MainMenu;
    activeSubMenu: string;
    setActiveSubMenu: (sub: string) => void;
    // Callback to update parent's active child
    setActiveChild?: (child: Child) => void;
    // Temporary props until full route migration
    onNavigate?: (path: string) => void;
}

export default function Sidebar({
    activeChild,
    activeMenu,
    activeSubMenu,
    setActiveSubMenu,
    setActiveChild,
    onNavigate
}: SidebarProps) {
    const { user, userProfile, children, activeChild: contextActiveChild, selectChild } = useAuth();
    const { openLoginModal } = useLoginModal();
    const router = useRouter();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [readCount, setReadCount] = useState<number | null>(null);

    const currentChild = activeChild || contextActiveChild;

    useEffect(() => {
        if (!user || !currentChild) {
            setReadCount(null);
            return;
        }
        let isMounted = true;
        const fetchReadCount = async () => {
            try {
                const { count, error } = await supabase
                    .from('read_books')
                    .select('*', { count: 'exact', head: true })
                    .eq('child_id', currentChild.id);
                if (!error && isMounted && count !== null) {
                    setReadCount(count);
                }
            } catch {
                // fallback
            }
        };
        fetchReadCount();
        return () => { isMounted = false; };
    }, [user, currentChild]);

    const handleMyPage = () => {
        if (onNavigate) onNavigate('/mypage');
        else router.push('/mypage');
    };

    return (
        <aside className="lg:w-64 shrink-0 flex flex-col gap-8">
            {user && currentChild ? (
                <div className="bg-white rounded-4xl p-7 shadow-sm border border-gray-100 relative">
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-4 mb-5 w-full text-left hover:bg-gray-50 p-2 -m-2 rounded-2xl transition-colors cursor-pointer"
                    >
                        <div className="w-14 h-14 bg-[#2E5A44] rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg shadow-green-100">{currentChild.name[0]}</div>
                        <div className="flex-1">
                            <h4 className="font-black text-gray-800 flex items-center gap-1">
                                {currentChild.name}
                                <ChevronDown size={14} className={`text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                            </h4>
                            <p className="text-[11px] text-gray-400 font-bold mt-0.5">{currentChild.age}세 · {currentChild.type}</p>
                        </div>
                    </button>

                    {/* Dropdown Menu */}
                    {isDropdownOpen && (
                        <div className="absolute top-24 left-0 right-0 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50 animate-in fade-in zoom-in-95">
                            {children.map(child => (
                                <button
                                    key={child.id}
                                    onClick={() => {
                                        selectChild(child);
                                        if (setActiveChild) {
                                            setActiveChild(child);
                                        }
                                        setIsDropdownOpen(false);
                                    }}
                                    className={`flex items-center gap-3 w-full p-3 rounded-xl hover:bg-green-50 transition-colors cursor-pointer ${currentChild.id === child.id ? 'bg-green-50' : ''}`}
                                >
                                    <div className="w-8 h-8 bg-green-100 text-green-700 rounded-lg flex items-center justify-center font-bold">{child.name[0]}</div>
                                    <div className="text-left">
                                        <div className="text-xs font-bold text-gray-900">{child.name}</div>
                                    </div>
                                    {currentChild.id === child.id && <div className="w-2 h-2 bg-green-500 rounded-full ml-auto" />}
                                </button>
                            ))}
                            <button onClick={handleMyPage} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-gray-50 text-gray-400 hover:text-green-600 transition-colors border-t border-gray-50 mt-1 cursor-pointer">
                                <div className="w-8 h-8 border border-dashed border-gray-300 rounded-lg flex items-center justify-center"><Plus size={16} /></div>
                                <div className="text-xs font-bold">프로필 추가</div>
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-gray-50 rounded-xl p-3 text-center">
                            <p className="text-[10px] text-gray-400 font-bold mb-1 uppercase">읽은 책</p>
                            <p className="font-black text-[#16A34A]">{readCount !== null ? `${readCount}권` : "0권"}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3 text-center">
                            <p className="text-[10px] text-gray-400 font-bold mb-1 uppercase">관심 분야</p>
                            <p className="font-black text-[#16A34A]">{currentChild.preferred_topics?.length ? `${currentChild.preferred_topics.length}개` : "기본"}</p>
                        </div>
                    </div>
                </div>
            ) : user && userProfile ? (
                <div className="bg-white rounded-4xl p-7 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4 mb-5">
                        <div className="w-14 h-14 bg-gray-200 rounded-2xl flex items-center justify-center text-gray-600 text-xl font-black shadow-lg shadow-gray-100"><User size={24} /></div>
                        <div>
                            <h4 className="font-black text-gray-800 flex items-center gap-1">{userProfile.nickname || user.email}</h4>
                            <p className="text-[11px] text-gray-400 font-bold mt-0.5">부모 계정</p>
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="text-sm text-gray-500">아이 프로필을 추가하여 맞춤 서비스를 이용해보세요!</p>
                        <button onClick={handleMyPage} className="mt-3 bg-[#16A34A] text-white text-xs px-4 py-2 rounded-full font-bold hover:bg-green-700 transition cursor-pointer">아이 프로필 추가하기</button>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-4xl p-8 shadow-sm border border-dashed border-gray-200 text-center flex flex-col items-center justify-center gap-3">
                    <p className="text-sm text-gray-400 font-bold">로그인 후 아이 프로필을 확인하세요</p>
                    <button onClick={openLoginModal} className="text-xs bg-gray-900 text-white px-4 py-2 rounded-full font-bold hover:bg-gray-800 transition cursor-pointer">로그인/가입</button>
                </div>
            )}

            <div className="bg-white rounded-4xl p-4 lg:p-6 shadow-sm border border-gray-100">
                <h2 className="text-[10px] lg:text-[11px] font-black text-[#2E5A44] uppercase tracking-widest mb-4 lg:mb-6 px-2">{MENU_CONFIG[activeMenu].label}</h2>
                <nav className="flex flex-col gap-1">
                    {MENU_CONFIG[activeMenu].sub.map((sub) => (
                        <button key={sub} onClick={() => setActiveSubMenu(sub)}
                            className={`flex items-center justify-between px-4 py-3 lg:px-5 lg:py-4 rounded-xl lg:rounded-2xl font-bold text-xs lg:text-sm transition-all whitespace-nowrap cursor-pointer ${activeSubMenu === sub ? 'bg-gray-900 text-white shadow-xl shadow-gray-200' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900'}`}>
                            {sub} {activeSubMenu === sub && <ChevronRight size={14} />}
                        </button>
                    ))}
                </nav>
            </div>
        </aside>
    );
}
