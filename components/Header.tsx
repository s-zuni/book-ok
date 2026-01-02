import { BookMarked, Search, User, LogOut, X } from "lucide-react";
import { MainMenu, ViewState } from "../types";
import { MENU_CONFIG } from "../lib/constants";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import MobileSubMenu from "./MobileSubMenu";
import { useState } from "react";

interface HeaderProps {
    view: ViewState;
    setView: (view: ViewState) => void;
    activeMenu: MainMenu;
    setActiveMenu: (menu: MainMenu) => void;
    setActiveSubMenu: (sub: string) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    handleSearch: (page: number) => void;
    activeSubMenu?: string;
}

export default function Header({
    view,
    setView,
    activeMenu,
    setActiveMenu,
    setActiveSubMenu,
    searchQuery,
    setSearchQuery,
    handleSearch,
    activeSubMenu = '',
}: HeaderProps) {
    const { user, signOut } = useAuth();
    const router = useRouter();
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const onSearchSubmit = () => {
        if (searchQuery.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
            setIsSearchOpen(false);
        }
    };

    const handleMenuClick = (key: MainMenu) => {
        let route = '/';
        switch (key) {
            case 'intro': route = '/intro'; break;
            case 'rec': route = '/'; break;
            case 'solution': route = '/solution'; break;
            case 'comm': route = '/community'; break;
        }
        router.push(route);
    };

    return (
        <header className="bg-white border-b sticky top-0 z-[60]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 lg:h-20 flex items-center justify-between gap-4">
                {/* Logo */}
                <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => router.push('/')}
                >
                    <div className="bg-green-600 p-1.5 lg:p-2 rounded-xl text-white shadow-lg shadow-green-100">
                        <BookMarked size={24} className="lg:w-7 lg:h-7" />
                    </div>
                    <span className="text-lg lg:text-2xl font-black italic">Book,ok</span>
                </div>

                {/* Desktop Search Bar */}
                <div className="flex-1 max-w-2xl relative group hidden sm:block">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="어떤 유아/아동 도서를 찾으시나요?"
                        className="w-full bg-gray-100 rounded-full py-3.5 pl-12 pr-6 outline-none focus:bg-white focus:ring-4 focus:ring-green-100 transition-all font-medium border border-transparent focus:border-green-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && onSearchSubmit()}
                    />
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2 lg:gap-3">
                    {/* Mobile Search Toggle */}
                    <button
                        className="p-2 text-gray-800 sm:hidden"
                        onClick={() => setIsSearchOpen(!isSearchOpen)}
                    >
                        {isSearchOpen ? <X size={24} /> : <Search size={24} />}
                    </button>

                    {/* Desktop Auth Buttons */}
                    <div className="hidden lg:flex items-center gap-3">
                        {user ? (
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => router.push('/mypage')}
                                    className="flex items-center gap-2 font-bold text-sm text-gray-700 p-2 rounded-full hover:bg-gray-100"
                                >
                                    <User size={22} />
                                    <span className="hidden md:inline">마이페이지</span>
                                </button>
                                <button
                                    onClick={async () => {
                                        await signOut();
                                        window.location.href = '/';
                                    }}
                                    className="p-2 text-gray-400 hover:text-red-500"
                                >
                                    <LogOut size={20} />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => router.push('/auth')}
                                className="bg-black text-white px-4 sm:px-6 py-2.5 rounded-full font-bold text-sm hover:bg-gray-800 transition whitespace-nowrap"
                            >
                                로그인/가입
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Search Input Overlay */}
            {isSearchOpen && (
                <div className="p-4 bg-white border-t sm:hidden absolute top-16 left-0 right-0 shadow-lg animate-in slide-in-from-top-2">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="도서 검색..."
                            className="w-full bg-gray-50 rounded-xl py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-green-500 font-medium"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && onSearchSubmit()}
                            autoFocus
                        />
                    </div>
                </div>
            )}

            {/* Desktop Navigation */}
            <nav className="border-t border-gray-50 hidden lg:block">
                <div className="max-w-7xl mx-auto px-6 flex items-center gap-12 overflow-x-auto scrollbar-hide">
                    {(Object.keys(MENU_CONFIG) as MainMenu[]).map((key) => (
                        <button key={key} onClick={() => handleMenuClick(key)}
                            className={`py-5 text-[15px] font-black tracking-tight whitespace-nowrap transition-all relative ${activeMenu === key ? 'text-green-600' : 'text-gray-400 hover:text-gray-900'}`}>
                            {MENU_CONFIG[key].label}
                            {activeMenu === key && <div className="absolute bottom-0 left-0 w-full h-1 bg-green-600 rounded-t-full" />}
                        </button>
                    ))}
                </div>
            </nav>

            {/* Sub Menu (Sticky) */}
            {activeSubMenu && (
                <MobileSubMenu
                    activeMenu={activeMenu}
                    activeSubMenu={activeSubMenu}
                    setActiveSubMenu={setActiveSubMenu}
                />
            )}
        </header>
    );
}
