"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Lock } from "lucide-react";
import Header from "@shared/ui/Header";
import { useAuth } from "@features/auth/AuthContext";
import { supabase } from "@shared/lib/supabase";
import { toast } from "sonner";
import ChildSafetyBanner from "@shared/ui/ChildSafetyBanner";
import ParentalGateModal from "@shared/ui/ParentalGateModal";

export default function WritePage() {
    const router = useRouter();
    const { user, userProfile } = useAuth();

    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('유아동 독서 고민');
    const [content, setContent] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Parental Controls & Adult Verification State
    const [isSocialEnabled, setIsSocialEnabled] = useState(true);
    const [showParentalGate, setShowParentalGate] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('bookok_parental_social_enabled');
            if (saved !== null) {
                setIsSocialEnabled(saved === 'true');
            }
        }
    }, []);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const onFormSubmitClick = () => {
        if (!isSocialEnabled) {
            toast.error('보호자에 의해 소셜 기능(글쓰기)이 차단(제한)되어 있습니다. 마이페이지 자녀 보호 기능에서 허용할 수 있습니다.');
            return;
        }
        if (!title.trim() || !content.trim()) {
            toast.error('제목과 내용을 모두 입력해주세요.');
            return;
        }
        setShowParentalGate(true);
    };

    const executeSubmit = async () => {
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
        <div className="min-h-screen bg-[#FDFDFD] text-gray-900 font-sans pb-16">
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

                <h1 className="text-3xl font-black mb-6">새 게시글 작성</h1>

                {/* Child Safety Banner for Google Play Families Policy Compliance */}
                <ChildSafetyBanner className="mb-6" />

                {!isSocialEnabled && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs font-bold flex items-center gap-2.5 mb-6">
                        <Lock size={18} className="shrink-0" />
                        <span>현재 보호자 설정에 의해 소셜 기능(글쓰기)이 차단되어 있습니다. 마이페이지 자녀 보호 기능 설정에서 허용으로 변경하실 수 있습니다.</span>
                    </div>
                )}

                <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100 flex flex-col gap-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">카테고리</label>
                        <select
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            disabled={!isSocialEnabled}
                            className="w-full bg-gray-50 rounded-xl px-5 py-4 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-green-200 transition-all border border-transparent focus:border-green-500 disabled:opacity-50"
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
                            disabled={!isSocialEnabled}
                            placeholder="제목을 입력하세요 (실명, 전화번호 등 개인정보 공유 금지)"
                            className="w-full bg-gray-50 rounded-xl px-5 py-4 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-green-200 transition-all border border-transparent focus:border-green-500 disabled:opacity-50"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">사진 첨부</label>
                        <div className="flex items-center gap-4">
                            <label className={`cursor-pointer bg-gray-50 px-5 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-100 transition flex items-center gap-2 ${!isSocialEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                                <span>📷 사진 선택</span>
                                <input type="file" accept="image/*" disabled={!isSocialEnabled} className="hidden" onChange={handleImageChange} />
                            </label>
                            {imageFile && <span className="text-xs text-green-600 font-bold">{imageFile.name}</span>}
                        </div>
                        {previewUrl && (
                            <div className="mt-4 relative w-full max-w-sm h-64 bg-gray-100 rounded-xl overflow-hidden">
                                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                <button onClick={() => { setImageFile(null); setPreviewUrl(null); }} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70">
                                    <ChevronLeft size={16} className="rotate-45" />
                                </button>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">내용</label>
                        <textarea
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            disabled={!isSocialEnabled}
                            placeholder="내용을 입력하세요. (주의: 성명, 전화번호, 주소 등 개인식별정보 작성 시 즉시 삭제 및 제재 조치됩니다.)"
                            className="w-full h-80 bg-gray-50 rounded-xl px-5 py-4 font-medium text-gray-900 outline-none focus:ring-2 focus:ring-green-200 transition-all border border-transparent focus:border-green-500 resize-none disabled:opacity-50"
                        />
                    </div>

                    <button
                        onClick={onFormSubmitClick}
                        disabled={loading || !isSocialEnabled}
                        className="w-full bg-green-600 text-white font-black py-5 rounded-2xl shadow-lg hover:bg-green-700 transition-all disabled:bg-gray-300 mt-4 cursor-pointer"
                    >
                        {loading ? '등록 중...' : '보호자 확인 후 게시글 등록하기'}
                    </button>
                </div>
            </div>

            {/* Parental Gate Modal before final post execution */}
            <ParentalGateModal
                isOpen={showParentalGate}
                onClose={() => setShowParentalGate(false)}
                onSuccess={executeSubmit}
                title="게시글 등록 전 보호자 확인"
                description="아동 보호 및 구글 플레이 가족 정책 기준에 따라 게시글 등록 전 성인 확인을 진행합니다."
            />
        </div>
    );
}
