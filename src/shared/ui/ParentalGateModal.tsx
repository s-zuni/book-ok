"use client";

import { useState, useEffect, useMemo } from "react";
import { ShieldCheck, X, KeyRound, Calculator } from "lucide-react";

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
    title = "보호자(성인) 확인",
    description = "어린이 보호 기준 및 앱스토어 정책에 따라 외부 이동 및 민감 기능 이용 시 보호자(성인) 확인이 필요합니다."
}: ParentalGateModalProps) {
    const [pinInput, setPinInput] = useState("");
    const [savedPin, setSavedPin] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState("");
    
    // 보호자 연산 챌린지 (PIN 미설정 시 또는 대안 인증용)
    const [mathProblem, setMathProblem] = useState<{ num1: number; num2: number; op: string; answer: number }>({
        num1: 17,
        num2: 24,
        op: "+",
        answer: 41
    });

    const generateMathProblem = () => {
        const isMul = Math.random() > 0.5;
        if (isMul) {
            const a = Math.floor(Math.random() * 6) + 4; // 4~9
            const b = Math.floor(Math.random() * 6) + 4; // 4~9
            setMathProblem({ num1: a, num2: b, op: "×", answer: a * b });
        } else {
            const a = Math.floor(Math.random() * 40) + 25; // 25~64
            const b = Math.floor(Math.random() * 30) + 15; // 15~44
            setMathProblem({ num1: a, num2: b, op: "+", answer: a + b });
        }
    };

    useEffect(() => {
        if (isOpen && typeof window !== 'undefined') {
            const stored = localStorage.getItem('bookok_parental_pin');
            if (stored && stored !== '0000') {
                setSavedPin(stored);
            } else {
                setSavedPin(null);
            }
            generateMathProblem();
            setPinInput("");
            setErrorMsg("");
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = pinInput.trim();
        if (!trimmed) {
            setErrorMsg("정답 또는 비밀번호를 입력해주세요.");
            return;
        }

        // 1. PIN이 설정되어 있는 경우 PIN 매칭
        if (savedPin && trimmed === savedPin) {
            setErrorMsg("");
            onSuccess();
            onClose();
            return;
        }

        // 2. 연산 문제 정답 매칭
        if (Number(trimmed) === mathProblem.answer) {
            setErrorMsg("");
            onSuccess();
            onClose();
            return;
        }

        setErrorMsg("확인에 실패했습니다. 다시 시도해 주세요.");
        setPinInput("");
        generateMathProblem();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[2rem] p-6 max-w-md w-full shadow-2xl relative animate-in zoom-in-95 duration-200 border border-gray-100">
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                    aria-label="닫기"
                >
                    <X size={20} />
                </button>

                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center text-[#2E5A44]">
                        {savedPin ? <KeyRound size={22} /> : <Calculator size={22} />}
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-gray-900">{title}</h3>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 bg-green-100 text-[#2E5A44] rounded-md">Parental Gate</span>
                    </div>
                </div>

                <p className="text-xs text-gray-500 font-medium mb-5 leading-relaxed">
                    {description}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-center">
                        {savedPin ? (
                            <>
                                <label className="block text-xs font-bold text-gray-600 mb-1">설정하신 보호자 비밀번호를 입력해주세요</label>
                                <span className="text-[11px] text-gray-400">(또는 문제 풀기: {mathProblem.num1} {mathProblem.op} {mathProblem.num2} = ?)</span>
                            </>
                        ) : (
                            <>
                                <label className="block text-xs font-bold text-gray-600 mb-2">보호자 확인을 위해 아래 계산의 정답을 입력하세요</label>
                                <div className="text-xl font-black text-[#2E5A44] tracking-wide py-1">
                                    {mathProblem.num1} {mathProblem.op} {mathProblem.num2} = ?
                                </div>
                            </>
                        )}
                    </div>

                    <div>
                        <input
                            type={savedPin ? "password" : "number"}
                            maxLength={8}
                            value={pinInput}
                            onChange={(e) => setPinInput(e.target.value)}
                            placeholder={savedPin ? "비밀번호 또는 정답" : "정답 입력"}
                            autoFocus
                            className="w-full text-center py-3.5 px-4 bg-gray-50 border border-gray-200 rounded-xl font-black text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:bg-white transition-all"
                        />
                        {errorMsg && (
                            <p className="text-xs font-bold text-red-500 mt-2 text-center">{errorMsg}</p>
                        )}
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl text-sm hover:bg-gray-200 transition-colors cursor-pointer"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-3 bg-[#2E5A44] text-white font-black rounded-xl text-sm hover:bg-[#234534] active:scale-95 transition-all shadow-md shadow-green-100 cursor-pointer"
                        >
                            확인
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
