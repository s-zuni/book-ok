"use client";

import { useEffect, useState } from "react";
import Header from "../../components/Header";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { Child, Book } from "../../types";
import { User, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";

export default function MyPage() {
    const [activeMenu, setActiveMenu] = useState<any>('rec'); // Default, doesn't matter much here
    const [activeSubMenu, setActiveSubMenu] = useState('');
    const { user, userProfile, refreshProfile } = useAuth();
    const [children, setChildren] = useState<Child[]>([]);
    const router = useRouter();

    // Child creation state
    const [newChildNickname, setNewChildNickname] = useState('');
    const [newChildBirthdate, setNewChildBirthdate] = useState('');
    const [newChildType, setNewChildType] = useState('유아');
    const [isAddingChild, setIsAddingChild] = useState(false);

    // Search state
    const [searchQuery, setSearchQuery] = useState("");

    const handleSearch = () => {
        if (searchQuery.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
        }
    };

    useEffect(() => {
        if (user) {
            fetchChildren();
        } else {
            // Redirect to auth if not logged in? Or show empty.
            // router.push('/auth');
        }
    }, [user]);

    const fetchChildren = async () => {
        if (!user) return;
        const { data: childrenList } = await supabase.from('children').select('*, birthdate').eq('profile_id', user.id);
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

        const { error } = await supabase.from('children').insert({
            name: newChildNickname,
            birthdate: newChildBirthdate,
            type: newChildType,
            profile_id: user.id
        });

        if (error) {
            alert('아이 프로필 추가 실패: ' + error.message);
        } else {
            alert('아이 프로필이 추가되었습니다.');
            setNewChildNickname('');
            setNewChildBirthdate('');
            setIsAddingChild(false);
            fetchChildren();
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
            />

            <div className="max-w-4xl mx-auto px-6 py-12">
                <h1 className="text-3xl font-black mb-8">마이페이지</h1>

                {/* Parent Profile */}
                <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100 mb-8">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 shadow-inner">
                            <User size={40} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900">{userProfile?.nickname || user?.email}</h2>
                            <p className="text-gray-500 font-bold mt-1">부모 계정</p>
                            <p className="text-gray-400 text-sm mt-1">{user?.email}</p>
                        </div>
                    </div>
                </div>

                {/* Children Profiles */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-black">아이 프로필 관리</h2>
                    <button onClick={() => setIsAddingChild(true)} className="flex items-center gap-2 text-green-600 font-bold hover:bg-green-50 px-4 py-2 rounded-xl transition">
                        <Plus size={20} /> 프로필 추가
                    </button>
                </div>

                {isAddingChild && (
                    <div className="bg-green-50 rounded-[2rem] p-8 mb-8 border border-green-100 relative animate-in slide-in-from-top-4 fade-in">
                        <button onClick={() => setIsAddingChild(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900"><X size={20} /></button>
                        <h3 className="font-bold text-lg mb-6">새로운 아이 프로필</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2 ml-1">아이 이름 (닉네임)</label>
                                <input type="text" value={newChildNickname} onChange={e => setNewChildNickname(e.target.value)} className="w-full bg-white px-4 py-3 rounded-xl font-bold outline-none ring-1 ring-gray-200 focus:ring-green-500" placeholder="이름 입력" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2 ml-1">생년월일</label>
                                <input type="date" value={newChildBirthdate} onChange={e => setNewChildBirthdate(e.target.value)} className="w-full bg-white px-4 py-3 rounded-xl font-bold outline-none ring-1 ring-gray-200 focus:ring-green-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2 ml-1">관심사/유형</label>
                                <select value={newChildType} onChange={e => setNewChildType(e.target.value)} className="w-full bg-white px-4 py-3 rounded-xl font-bold outline-none ring-1 ring-gray-200 focus:ring-green-500">
                                    <option value="유아">유아 (4-7세)</option>
                                    <option value="초등저학년">초등 저학년 (8-10세)</option>
                                    <option value="초등고학년">초등 고학년 (11-13세)</option>
                                </select>
                            </div>
                        </div>
                        <button onClick={handleChildProfileSubmit} className="w-full bg-green-600 text-white font-black py-4 rounded-xl hover:bg-green-700 transition shadow-lg shadow-green-200">등록하기</button>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {children.map(child => (
                        <div key={child.id} className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center text-2xl font-black shadow-inner">
                                    {child.name[0]}
                                </div>
                                <div>
                                    <h3 className="font-black text-lg text-gray-900">{child.name}</h3>
                                    <p className="text-gray-400 font-bold text-xs mt-1">{child.age}세 · {child.type}</p>
                                </div>
                            </div>
                            {/* Edit/Delete buttons could go here */}
                        </div>
                    ))}

                    {children.length === 0 && !isAddingChild && (
                        <div className="col-span-full py-12 text-center text-gray-400 font-medium bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
                            등록된 아이 프로필이 없습니다.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
