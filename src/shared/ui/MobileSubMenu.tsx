import { MainMenu } from "@shared/types";
import { MENU_CONFIG } from "@shared/lib/constants";

interface MobileSubMenuProps {
    activeMenu: MainMenu;
    activeSubMenu: string;
    setActiveSubMenu: (sub: string) => void;
}

export default function MobileSubMenu({
    activeMenu,
    activeSubMenu,
    setActiveSubMenu
}: MobileSubMenuProps) {
    return (
        <div className="lg:hidden border-t border-gray-100 bg-white sticky top-16 z-50">
            <div className="max-w-7xl mx-auto px-4 overflow-x-auto scrollbar-hide">
                <div className="flex gap-2 py-3">
                    {MENU_CONFIG[activeMenu].sub.map((sub) => (
                        <button
                            key={sub}
                            onClick={() => setActiveSubMenu(sub)}
                            className={`px-4 py-2 rounded-full font-bold text-xs whitespace-nowrap transition-all ${activeSubMenu === sub
                                ? 'bg-gray-900 text-white'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                        >
                            {sub}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
