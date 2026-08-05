"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, X, KeyRound } from "lucide-react";

interface ParentalGateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    title?: string;
    description?: string;
}

export default function ParentalGateModal({
    isOpen,
    onClose,
    onSuccess,
    title = "보호자(성인) 비밀번호 확인",
    description = "구글 플레이 가족 정책 및 아동 보호 기준에 따라 커뮤니티 진입 및 소셜 기능 이용 시 사전에 설정한 보호자 비밀번호가 필요합니다."
}: ParentalGateModalProps) {
    const [pinInput, setPinInput] = useState("");
    const [savedPin, setSavedPin] = useState("0000");
    const [errorMsg, setErrorMsg] = useState("");
    const [isDefaultPin, setIsDefaultPin] = useState(true);

    useEffect(() => {
        if (isOpen && typeof window !== 'undefined') {
            const stored = localStorage.getItem('bookok_parental_pin');
            if (stored) {
                setSavedPin(stored);
                setIsDefaultPin(false);
            } else {
                setSavedPin("0000");
                setIsDefaultPin(true);
            }
            setPinInput("");
            setErrorMsg("");
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = pinInput.trim();
        if (!trimmed) {
            setErrorMsg("비밀번호를 입력해주세요.");
            return;
        }
        if (trimmed === savedPin) {
            setErrorMsg("");
            onSuccess();
            onClose();
        } else {
            setErrorMsg("비밀번호가 일치하지 않습니다. 다시 확인해 주세요.");
            setPinInput("");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[2rem] p-6 max-w-md w-full shadow-2xl relative animate-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                        <KeyRound size={22} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-gray-900">{title}</h3>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md">Parental PIN Gate</span>
                    </div>
                </div>

                <p className="text-xs text-gray-500 font-medium mb-5 leading-relaxed">
                    {description}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-center">
                        <label className="block text-xs font-bold text-gray-400 mb-2">보호자 비밀번호 4자리를 입력하세요</label>
                        {isDefaultPin && (
                            <p className="text-[11px] font-bold text-indigo-600 mb-2 bg-indigo-50 py-1 px-3 rounded-lg inline-block">
                                💡 초기 기본 비밀번호: <strong className="font-black text-indigo-700">0000</strong> (마이페이지에서 변경 가능)
                            </p>
                        )}
                    </div>

                    <div>
                        <input
                            type="password"
                            maxLength={8}
                            value={pinInput}
                            onChange={(e) => setPinInput(e.target.value)}
                            placeholder="보호자 비밀번호 입력"
                            autoFocus
                            className="w-full text-center py-3.5 px-4 bg-gray-50 border border-gray-200 rounded-xl font-black text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                        />
                        {errorMsg && (
                            <p className="text-xs font-bold text-red-500 mt-2 text-center">{errorMsg}</p>
                        )}
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl text-sm hover:bg-gray-200 transition-colors"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-3 bg-indigo-600 text-white font-black rounded-xl text-sm hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-100"
                        >
                            확인 완료
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
