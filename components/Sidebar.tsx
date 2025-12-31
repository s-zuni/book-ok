import { ChevronDown, User, ChevronRight } from "lucide-react";
import { Child, MainMenu } from "../types";
import { MENU_CONFIG } from "../lib/constants";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";

interface SidebarProps {
    activeChild: Child | null;
    activeMenu: MainMenu;
    activeSubMenu: string;
    setActiveSubMenu: (sub: string) => void;
    // Temporary props until full route migration
    onNavigate?: (path: string) => void;
}

export default function Sidebar({
    activeChild,
    activeMenu,
    activeSubMenu,
    setActiveSubMenu,
    onNavigate
}: SidebarProps) {
    const { user, userProfile } = useAuth();
    const router = useRouter();

    const handleMyPage = () => {
        if (onNavigate) onNavigate('/mypage');
        else router.push('/mypage');
    };

    return (
        <aside className="lg:w-64 shrink-0 flex flex-col gap-8">
            {user && activeChild ? (
                <div className="bg-white rounded-[2rem] p-7 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4 mb-5">
                        <div className="w-14 h-14 bg-green-600 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg shadow-green-100">{activeChild.name[0]}</div>
                        <div>
                            <h4 className="font-black text-gray-800 flex items-center gap-1">{activeChild.name} <ChevronDown size={14} className="text-gray-400" /></h4>
                            <p className="text-[11px] text-gray-400 font-bold mt-0.5">{activeChild.age}세 · {activeChild.type}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-gray-50 rounded-xl p-3 text-center"><p className="text-[10px] text-gray-400 font-bold mb-1 uppercase">읽은 책</p><p className="font-black text-green-600">DB 연동중</p></div>
                        <div className="bg-gray-50 rounded-xl p-3 text-center"><p className="text-[10px] text-gray-400 font-bold mb-1 uppercase">내 평점</p><p className="font-black text-green-600">4.8</p></div>
                    </div>
                </div>
            ) : user && userProfile ? (
                <div className="bg-white rounded-[2rem] p-7 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4 mb-5">
                        <div className="w-14 h-14 bg-gray-200 rounded-2xl flex items-center justify-center text-gray-600 text-xl font-black shadow-lg shadow-gray-100"><User size={24} /></div>
                        <div>
                            <h4 className="font-black text-gray-800 flex items-center gap-1">{userProfile.nickname || user.email}</h4>
                            <p className="text-[11px] text-gray-400 font-bold mt-0.5">부모 계정</p>
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="text-sm text-gray-500">아이 프로필을 추가하여 맞춤 서비스를 이용해보세요!</p>
                        <button onClick={handleMyPage} className="mt-3 bg-green-600 text-white text-xs px-4 py-2 rounded-full font-bold hover:bg-green-700 transition">아이 프로필 추가하기</button>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-dashed border-gray-200 text-center">
                    <p className="text-sm text-gray-400 font-bold">로그인 후 아이 프로필을 확인하세요</p>
                </div>
            )}

            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
                <h2 className="text-[11px] font-black text-green-600 uppercase tracking-widest mb-6 px-2">{MENU_CONFIG[activeMenu].label}</h2>
                <nav className="flex flex-col gap-1.5">
                    {MENU_CONFIG[activeMenu].sub.map((sub) => (
                        <button key={sub} onClick={() => setActiveSubMenu(sub)}
                            className={`flex items-center justify-between px-5 py-4 rounded-2xl font-bold text-sm transition-all ${activeSubMenu === sub ? 'bg-gray-900 text-white shadow-xl shadow-gray-200' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900'}`}>
                            {sub} {activeSubMenu === sub && <ChevronRight size={14} />}
                        </button>
                    ))}
                </nav>
            </div>
        </aside>
    );
}
