"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Popup } from "../types";
import { X, ExternalLink, ChevronRight } from "lucide-react";

export default function MainPopup() {
    const [activePopup, setActivePopup] = useState<Popup | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        fetchActivePopups();
    }, []);

    const fetchActivePopups = async () => {
        const { data, error } = await supabase
            .from('popups')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1);

        if (!error && data && data.length > 0) {
            const popup = data[0];
            
            // Check localStorage
            const hideUntil = localStorage.getItem(`popup_hide_${popup.id}`);
            if (hideUntil) {
                if (new Date().getTime() < parseInt(hideUntil)) {
                    return; // Still hidden
                }
                localStorage.removeItem(`popup_hide_${popup.id}`);
            }
            
            setActivePopup(popup);
            // Small delay for animation
            setTimeout(() => setIsVisible(true), 1000);
        }
    };

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => setActivePopup(null), 500);
    };

    const handleHideForDay = () => {
        if (!activePopup) return;
        const tomorrow = new Date().getTime() + 24 * 60 * 60 * 1000;
        localStorage.setItem(`popup_hide_${activePopup.id}`, tomorrow.toString());
        handleClose();
    };

    if (!activePopup) return null;

    return (
        <div className={`fixed inset-0 z-100 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className={`bg-white w-full max-w-sm rounded-[3rem] shadow-2xl shadow-black/20 overflow-hidden transition-all duration-500 transform ${isVisible ? 'scale-100 translate-y-0' : 'scale-90 translate-y-8'}`}>
                {/* Header/Image Area */}
                <div className="relative aspect-[4/5] bg-gray-100">
                    {activePopup.image_url ? (
                        <img 
                            src={activePopup.image_url} 
                            alt={activePopup.title} 
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-green-600 bg-green-50">
                            <div className="text-6xl font-black italic opacity-20 select-none">Book,ok</div>
                        </div>
                    )}
                    
                    <button 
                        onClick={handleClose}
                        className="absolute top-6 right-6 p-2 bg-black/20 backdrop-blur-md text-white rounded-full hover:bg-black/40 transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="absolute bottom-0 left-0 w-full p-8 bg-linear-to-t from-black/80 via-black/40 to-transparent text-white">
                        <span className="inline-block px-3 py-1 bg-green-500 text-[10px] font-black rounded-lg mb-3 tracking-widest animate-pulse">EVENT</span>
                        <h2 className="text-2xl font-black leading-tight mb-2">{activePopup.title}</h2>
                        <p className="text-sm font-medium text-gray-200 line-clamp-2">{activePopup.content}</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-4 grid grid-cols-2 gap-3 bg-white">
                    <button 
                        onClick={handleHideForDay}
                        className="py-4 text-xs font-bold text-gray-400 hover:text-gray-900 transition-colors text-center"
                    >
                        오늘 하루 보지 않기
                    </button>
                    {activePopup.link_url ? (
                        <a 
                            href={activePopup.link_url}
                            className="py-4 bg-gray-900 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:bg-black transition-all group"
                        >
                            자세히 보기
                            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </a>
                    ) : (
                        <button 
                            onClick={handleClose}
                            className="py-4 bg-gray-100 text-gray-900 rounded-2xl font-black text-xs hover:bg-gray-200 transition-all"
                        >
                            닫기
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
