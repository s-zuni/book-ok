"use client";

import { Child } from "../types";
import { X, User, Check, ArrowRight, ChevronLeft } from "lucide-react";
import { useState } from "react";
import { getAgeGroupQuestions } from "../utils/readingUtils";

interface ChildSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    childrenList: Child[];
    onSelect: (childId: string, observations?: any) => void;
}

export default function ChildSelectionModal({ isOpen, onClose, childrenList, onSelect }: ChildSelectionModalProps) {
    const [step, setStep] = useState<'select' | 'observe'>('select');
    const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
    const [observations, setObservations] = useState<{ [key: string]: string }>({});

    if (!isOpen) return null;

    const handleChildClick = (childId: string) => {
        setSelectedChildId(childId);
        setStep('observe');
        setObservations({}); // Reset observations for new selection
    };

    const handleBack = () => {
        setStep('select');
        setSelectedChildId(null);
    };

    const handleSubmit = () => {
        if (selectedChildId) {
            onSelect(selectedChildId, observations);
            // Reset state after slight delay or handled by parent closing
            setStep('select');
            setSelectedChildId(null);
            setObservations({});
        }
    };

    const selectedChild = childrenList.find(c => c.id === selectedChildId);
    const questions = selectedChild ? getAgeGroupQuestions(selectedChild.age) : [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    {step === 'observe' ? (
                        <button onClick={handleBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-500">
                            <ChevronLeft size={24} />
                        </button>
                    ) : (
                        <h3 className="text-xl font-bold text-gray-900">누가 읽었나요?</h3>
                    )}

                    {step === 'observe' && <h3 className="text-xl font-bold text-gray-900">어떻게 읽었나요?</h3>}

                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {step === 'select' ? (
                    <div className="space-y-3">
                        {childrenList.map((child) => (
                            <button
                                key={child.id}
                                onClick={() => handleChildClick(child.id)}
                                className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-green-200 hover:bg-green-50 transition-all group text-left"
                            >
                                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:text-green-500 transition-colors">
                                    <User size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 group-hover:text-green-700">{child.name}</h4>
                                    <p className="text-sm text-gray-500">{child.age}세</p>
                                </div>
                                <div className="ml-auto opacity-0 group-hover:opacity-100 text-green-600 transition-opacity">
                                    <ArrowRight size={20} />
                                </div>
                            </button>
                        ))}

                        {childrenList.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                등록된 자녀 프로필이 없습니다.
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-200">
                        <div className="bg-blue-50 p-4 rounded-2xl mb-4">
                            <p className="text-sm text-blue-800 font-medium">
                                <span className="font-bold">{selectedChild?.name}</span>(만 {selectedChild?.age}세)의 독서 모습을 기록하면<br />
                                <span className="underline">더 정확한 성장 분석</span>을 받을 수 있어요!
                            </p>
                        </div>

                        <div className="space-y-4">
                            {questions.map((q) => (
                                <div key={q.id}>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        {q.label}
                                    </label>
                                    <input
                                        type="text"
                                        value={observations[q.id] || ''}
                                        onChange={(e) => setObservations(prev => ({ ...prev, [q.id]: e.target.value }))}
                                        placeholder={q.placeholder}
                                        className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-sm"
                                    />
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={handleSubmit}
                            className="w-full py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors shadow-lg flex items-center justify-center gap-2"
                        >
                            <Check size={20} />
                            기록 저장하기
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
