"use client";

import { useEffect, useState } from "react";
import Header from "../../components/Header";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { Child } from "../../types";
import { User, Plus, X, BookOpen, Bookmark, BarChart2, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function MyPage() {
    const [activeMenu, setActiveMenu] = useState<any>('rec');
    const [activeSubMenu, setActiveSubMenu] = useState('');
    const { user, userProfile, signOut } = useAuth();
    const [children, setChildren] = useState<Child[]>([]);
    const router = useRouter();

    // Child creation state
    const [newChildNickname, setNewChildNickname] = useState('');
    const [newChildBirthdate, setNewChildBirthdate] = useState('');
    const [newChildType, setNewChildType] = useState('유아');
    const [isAddingChild, setIsAddingChild] = useState(false);

    useEffect(() => {
        if (user) {
            fetchChildren();
        }
    }, [user]);

    const fetchChildren = async () => {
        if (!user) return;
        const { data: childrenList } = await supabase.from('children').select('*, birthdate').eq('parent_id', user.id); // Changed to parent_id
        if (childrenList) {
            const childrenWithAge = childrenList.map(child => {
                const birthYear = new Date(child.birthdate).getFullYear();
                const currentYear = new Date().getFullYear();
                const age = currentYear - birthYear;
                return { ...child, age };
            });
            setChildren(childrenWithAge as Child[]);
        }
    };

    const handleChildProfileSubmit = async () => {
        if (!newChildNickname || !newChildBirthdate || !user) return;

        try {
            console.log("Adding child...", {
                name: newChildNickname,
                birthdate: newChildBirthdate,
                type: newChildType,
                parent_id: user.id
            });

            const { error } = await supabase.from('children').insert({
                name: newChildNickname,
                birthdate: newChildBirthdate,
                type: newChildType,
                parent_id: user.id // Checked: schema likely uses parent_id or profile_id. Trying parent_id based on previous fix.
            });

            if (error) {
                console.error("Supabase insert error:", error);
                // Fallback try profile_id if parent_id fails? 
                // Given previous error was "column profile_id not found", parent_id is the likely candidate unless it's user_id.
                // We'll alert the specific error.
                alert('아이 프로필 추가 실패: ' + error.message);
            } else {
                alert('아이 프로필이 추가되었습니다.');
                setNewChildNickname('');
                setNewChildBirthdate('');
                setIsAddingChild(false);
                fetchChildren();
            }
        } catch (err: any) {
            console.error("Unexpected error:", err);
            alert("오류가 발생했습니다: " + err.message);
        }
    };

    const handleLogout = async () => {
        await signOut();
        router.push('/');
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
                searchQuery=""
                setSearchQuery={() => { }}
                handleSearch={() => { }}
            />

            <div className="max-w-xl mx-auto px-6 py-8">

                {/* Profile Section */}
                <div className="flex items-center gap-5 mb-10">
                    <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 overflow-hidden">
                        {/* Placeholder or actual image */}
                        <User size={40} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900">{userProfile?.nickname || user?.email?.split('@')[0]}</h2>
                        <p className="text-gray-400 text-sm mt-1">{user?.email}</p>
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
                                <div key={child.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center font-black text-green-600 shadow-sm">{child.name[0]}</div>
                                        <div>
                                            <div className="font-bold text-sm">{child.name}</div>
                                            <div className="text-xs text-gray-400">{child.age}세 · {child.type}</div>
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className="text-gray-300" />
                                </div>
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
                                    <input type="text" placeholder="이름 (닉네임)" value={newChildNickname} onChange={e => setNewChildNickname(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 text-sm font-bold outline-none focus:ring-2 focus:ring-green-500" />
                                    <input type="date" value={newChildBirthdate} onChange={e => setNewChildBirthdate(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 text-sm font-bold outline-none focus:ring-2 focus:ring-green-500" />
                                    <select value={newChildType} onChange={e => setNewChildType(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 text-sm font-bold outline-none focus:ring-2 focus:ring-green-500">
                                        <option value="유아">유아 (4-7세)</option>
                                        <option value="초등저학년">초등 저학년 (8-10세)</option>
                                        <option value="초등고학년">초등 고학년 (11-13세)</option>
                                    </select>
                                    <button onClick={handleChildProfileSubmit} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-green-100 hover:bg-green-700 transition">등록 완료</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Menu Items */}
                    <button className="w-full bg-white rounded-4xl p-6 shadow-sm border border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center"><BookOpen size={20} strokeWidth={2.5} /></div>
                            <div className="text-left">
                                <h3 className="font-bold text-gray-900">읽은 책 기록</h3>
                                <p className="text-xs text-gray-400 mt-0.5">지금까지 읽은 12권의 책</p>
                            </div>
                        </div>
                        <ChevronRight size={20} className="text-gray-300" />
                    </button>

                    <button className="w-full bg-white rounded-4xl p-6 shadow-sm border border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-yellow-50 text-yellow-500 rounded-xl flex items-center justify-center"><Bookmark size={20} strokeWidth={2.5} /></div>
                            <div className="text-left">
                                <h3 className="font-bold text-gray-900">스크랩한 책</h3>
                                <p className="text-xs text-gray-400 mt-0.5">나중에 읽으려고 저장한 책</p>
                            </div>
                        </div>
                        <ChevronRight size={20} className="text-gray-300" />
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
                </div>

                <div className="mt-8 text-center">
                    <button onClick={handleLogout} className="text-gray-400 text-xs font-bold underline hover:text-red-500">로그아웃</button>
                </div>
            </div>
        </div>
    );
}
