"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Header from "@shared/ui/Header";
import { useAuth } from "@features/auth/AuthContext";
import { supabase } from "@shared/lib/supabase";
import { toast } from "sonner";

export default function WritePage() {
    const router = useRouter();
    const { user, userProfile } = useAuth();

    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('유아동 독서 고민');
    const [content, setContent] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async () => {
        if (!title || !content || !user) return;
        setLoading(true);

        let imageUrl = null;

        if (imageFile) {
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('post_images')
                .upload(filePath, imageFile);

            if (uploadError) {
                console.error("Image upload failed:", uploadError);
                toast.error('이미지 업로드에 실패했습니다. 잠시 후 다시 시도하거나 이미지를 제외하고 작성해주세요.');
                setLoading(false);
                return;
            } else {
                const { data } = supabase.storage.from('post_images').getPublicUrl(filePath);
                imageUrl = data.publicUrl;
            }
        }

        const { error } = await supabase.from('posts').insert({
            title,
            content,
            category,
            user_id: user.id,
            author_nickname: userProfile?.nickname || user.user_metadata?.name || '익명',
            views: 0,
            likes: 0,
            image_url: imageUrl
        });

        if (error) {
            toast.error('글 작성 실패: ' + error.message);
            setLoading(false);
        } else {
            toast.success('글이 등록되었습니다.');
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
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">사진 첨부</label>
                        <div className="flex items-center gap-4">
                            <label className="cursor-pointer bg-gray-50 px-5 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-100 transition flex items-center gap-2">
                                <span>📷 사진 선택</span>
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                            </label>
                            {imageFile && <span className="text-xs text-green-600 font-bold">{imageFile.name}</span>}
                        </div>
                        {previewUrl && (
                            <div className="mt-4 relative w-full max-w-sm h-64 bg-gray-100 rounded-xl overflow-hidden">
                                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                <button onClick={() => { setImageFile(null); setPreviewUrl(null); }} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70">
                                    <ChevronLeft size={16} className="rotate-45" /> {/* Close icon substitute */}
                                </button>
                            </div>
                        )}
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

                    <div className="bg-yellow-50 p-4 rounded-xl text-xs text-yellow-700 font-bold mb-2">
                        * 사진 업로드를 위해서는 Supabase Storage에 'post_images' 버킷이 생성되어 있어야 합니다.
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
