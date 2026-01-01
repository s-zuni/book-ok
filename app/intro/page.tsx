"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import ServiceIntro from "../../components/intro/ServiceIntro";
import VisionIntro from "../../components/intro/VisionIntro";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { Child } from "../../types";

export default function IntroPage() {
    const [activeMenu, setActiveMenu] = useState<any>('intro');
    const [activeSubMenu, setActiveSubMenu] = useState('북콕 서비스');
    const [activeChild, setActiveChild] = useState<Child | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (user) {
            supabase.from('children').select('*').eq('profile_id', user.id).then(({ data }) => {
                if (data && data.length > 0) {
                    const child = data[0];
                    const age = new Date().getFullYear() - new Date(child.birthdate).getFullYear();
                    setActiveChild({ ...child, age });
                }
            });
        }
    }, [user]);

    const handleSearch = () => {
        if (searchQuery.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
        }
    };

    const dummySetView = () => { };

    return (
        <div className="min-h-screen bg-[#FDFDFD] text-gray-900 font-sans">
            <Header
                view="main"
                setView={dummySetView}
                activeMenu={activeMenu}
                setActiveMenu={setActiveMenu}
                setActiveSubMenu={setActiveSubMenu}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                handleSearch={handleSearch}
                activeSubMenu={activeSubMenu}
            />

            <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col lg:flex-row gap-12">
                <div className="hidden lg:flex">
                    <Sidebar
                        activeChild={activeChild}
                        activeMenu="intro"
                        activeSubMenu={activeSubMenu}
                        setActiveSubMenu={setActiveSubMenu}
                    />
                </div>

                <main className="flex-1 min-h-[600px]">
                    <div className="animate-in fade-in">
                        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-12">
                            {activeSubMenu === '북콕 서비스' && <ServiceIntro />}
                            {activeSubMenu === '북콕 비전' && <VisionIntro />}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
