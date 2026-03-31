"use client";

import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import { Shield, Users, BookOpen, BarChart3, Settings } from "lucide-react";

export default function ManagePage() {
    const { user, userProfile, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && (!user || !userProfile?.is_admin)) {
            router.push('/');
        }
    }, [user, userProfile, loading, router]);

    if (loading || !userProfile?.is_admin) {
        return <div className="h-screen flex items-center justify-center">접근 권한을 확인 중입니다...</div>;
    }

    const stats = [
        { label: "총 사용자", value: "1,284", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
        { label: "신규 도서", value: "42", icon: BookOpen, color: "text-green-600", bg: "bg-green-50" },
        { label: "오늘의 분석", value: "156", icon: BarChart3, color: "text-purple-600", bg: "bg-purple-50" },
    ];

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
            
            <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 flex gap-8">
                <Sidebar 
                    activeChild={null} 
                    activeMenu="intro" 
                    activeSubMenu="" 
                    setActiveSubMenu={() => {}} 
                />

                <main className="flex-1 space-y-8">
                    <header className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                                <Shield className="text-green-600" />
                                관리자 대시보드
                            </h1>
                            <p className="text-gray-500 mt-1">북콕 서비스의 전체 현황을 관리합니다.</p>
                        </div>
                        <button className="bg-gray-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-gray-800 transition shadow-lg">
                            시스템 설정
                        </button>
                    </header>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {stats.map((stat) => (
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

                    {/* Placeholder Content */}
                    <div className="bg-white rounded-5xl border border-gray-100 shadow-sm p-10 text-center space-y-4">
                        <div className="w-20 h-20 bg-green-50 text-green-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <Settings size={40} className="animate-spin-slow" />
                        </div>
                        <h2 className="text-2xl font-black text-gray-900">관리자 기능을 준비 중입니다</h2>
                        <p className="text-gray-500 max-w-md mx-auto">유저 관리, 도서 데이터 업데이트, AI 분석 로그 확인 등 강력한 관리 도구가 곧 제공될 예정입니다.</p>
                    </div>
                </main>
            </div>
        </div>
    );
}
