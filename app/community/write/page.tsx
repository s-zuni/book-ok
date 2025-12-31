"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Header from "../../../components/Header";
import { useAuth } from "../../../context/AuthContext";
import { supabase } from "../../../lib/supabase";

export default function WritePage() {
    const router = useRouter();
    const { user, userProfile } = useAuth();

    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('유아동 독서 고민');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!title || !content || !user) return;
        setLoading(true);

        const { error } = await supabase.from('posts').insert({
            title,
            content,
            category,
            author_id: user.id,
            author_nickname: userProfile?.nickname || user.email?.split('@')[0] || '익명',
            views: 0,
            likes: 0
        });

        if (error) {
            alert('글 작성 실패: ' + error.message);
            setLoading(false);
        } else {
            alert('글이 등록되었습니다.');
            router.push('/community');
        }
    };

    const dummySetView = () => { };

    return (
        <div className="min-h-screen bg-[#FDFDFD] text-gray-900 font-sans">
            <Header
                view="main"
                setView={dummySetView}
                activeMenu="comm"
                setActiveMenu={() => { }}
                setActiveSubMenu={() => { }}
                searchQuery=""
                setSearchQuery={() => { }}
                handleSearch={() => { }}
            />

            <div className="max-w-3xl mx-auto px-6 py-12">
                <button onClick={() => router.back()} className="mb-8 flex items-center gap-2 text-gray-400 hover:text-gray-900 transition-colors font-bold">
                    <ChevronLeft size={20} /> 취소하고 돌아가기
                </button>

                <h1 className="text-3xl font-black mb-8">새 게시글 작성</h1>

                <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100 flex flex-col gap-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">카테고리</label>
                        <select
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            className="w-full bg-gray-50 rounded-xl px-5 py-4 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-green-200 transition-all border border-transparent focus:border-green-500"
                        >
                            <option>유아동 독서 고민</option>
                            <option>유아동 교육 고민</option>
                            <option>자유게시판</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">제목</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="제목을 입력하세요"
                            className="w-full bg-gray-50 rounded-xl px-5 py-4 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-green-200 transition-all border border-transparent focus:border-green-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">내용</label>
                        <textarea
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            placeholder="내용을 입력하세요"
                            className="w-full h-80 bg-gray-50 rounded-xl px-5 py-4 font-medium text-gray-900 outline-none focus:ring-2 focus:ring-green-200 transition-all border border-transparent focus:border-green-500 resize-none"
                        />
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full bg-green-600 text-white font-black py-5 rounded-2xl shadow-lg hover:bg-green-700 transition-all disabled:bg-gray-300 mt-4"
                    >
                        {loading ? '등록 중...' : '등록하기'}
                    </button>
                </div>
            </div>
        </div>
    );
}
