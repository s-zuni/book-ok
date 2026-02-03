"use client";

import { Child } from "../types";
import { X, User, Check, ArrowRight, ChevronLeft, Star, Clock, BookOpen } from "lucide-react";
import { useState } from "react";
import { getAgeGroupQuestions } from "../utils/readingUtils";

interface ReadingRecordData {
    rating?: number;
    difficulty_rating?: '쉬움' | '적당' | '어려움';
    reading_time_minutes?: number;
    observations?: { [key: string]: string };
}

interface ChildSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    childrenList: Child[];
    onSelect: (childId: string, recordData?: ReadingRecordData) => void;
}

export default function ChildSelectionModal({ isOpen, onClose, childrenList, onSelect }: ChildSelectionModalProps) {
    const [step, setStep] = useState<'select' | 'record'>('select');
    const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

    // New reading record states
    const [rating, setRating] = useState<number>(0);
    const [difficulty, setDifficulty] = useState<'쉬움' | '적당' | '어려움' | null>(null);
    const [readingTime, setReadingTime] = useState<string>('');
    const [observations, setObservations] = useState<{ [key: string]: string }>({});
    const [showAdvanced, setShowAdvanced] = useState(false);

    if (!isOpen) return null;

    const handleChildClick = (childId: string) => {
        setSelectedChildId(childId);
        setStep('record');
        // Reset all inputs
        setRating(0);
        setDifficulty(null);
        setReadingTime('');
        setObservations({});
        setShowAdvanced(false);
    };

    const handleBack = () => {
        setStep('select');
        setSelectedChildId(null);
    };

    const handleSubmit = () => {
        if (selectedChildId) {
            const recordData: ReadingRecordData = {};

            if (rating > 0) recordData.rating = rating;
            if (difficulty) recordData.difficulty_rating = difficulty;
            if (readingTime && parseInt(readingTime) > 0) {
                recordData.reading_time_minutes = parseInt(readingTime);
            }
            if (Object.keys(observations).length > 0) {
                recordData.observations = observations;
            }

            onSelect(selectedChildId, recordData);

            // Reset state
            setStep('select');
            setSelectedChildId(null);
            setRating(0);
            setDifficulty(null);
            setReadingTime('');
            setObservations({});
        }
    };

    const selectedChild = childrenList.find(c => c.id === selectedChildId);
    const questions = selectedChild ? getAgeGroupQuestions(selectedChild.age) : [];

    const difficultyOptions: { value: '쉬움' | '적당' | '어려움'; label: string; emoji: string }[] = [
        { value: '쉬움', label: '쉬웠어요', emoji: '😊' },
        { value: '적당', label: '적당했어요', emoji: '🙂' },
        { value: '어려움', label: '어려웠어요', emoji: '🤔' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    {step === 'record' ? (
                        <button onClick={handleBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-500">
                            <ChevronLeft size={24} />
                        </button>
                    ) : (
                        <h3 className="text-xl font-bold text-gray-900">누가 읽었나요?</h3>
                    )}

                    {step === 'record' && <h3 className="text-xl font-bold text-gray-900">독서 기록</h3>}

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
                        {/* Rating (Stars) */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-3">
                                <Star size={16} className="inline mr-1 text-yellow-500" />
                                아이가 이 책을 얼마나 좋아했나요?
                            </label>
                            <div className="flex gap-2 justify-center">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        onClick={() => setRating(star)}
                                        className={`p-2 transition-transform hover:scale-110 ${rating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
                                    >
                                        <Star size={32} fill={rating >= star ? "currentColor" : "none"} />
                                    </button>
                                ))}
                            </div>
                            {rating > 0 && (
                                <p className="text-center text-sm text-gray-500 mt-2">
                                    {rating === 5 && '정말 좋아했어요! 🎉'}
                                    {rating === 4 && '재미있게 읽었어요!'}
                                    {rating === 3 && '보통이었어요'}
                                    {rating === 2 && '별로였어요'}
                                    {rating === 1 && '안 맞았어요'}
                                </p>
                            )}
                        </div>

                        {/* Difficulty */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-3">
                                <BookOpen size={16} className="inline mr-1 text-blue-500" />
                                책의 난이도는 어땠나요?
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {difficultyOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => setDifficulty(option.value)}
                                        className={`p-3 rounded-xl border-2 transition-all text-center ${difficulty === option.value
                                                ? 'border-green-500 bg-green-50 text-green-700'
                                                : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                            }`}
                                    >
                                        <span className="text-2xl block mb-1">{option.emoji}</span>
                                        <span className="text-xs font-bold">{option.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Reading Time */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                <Clock size={16} className="inline mr-1 text-purple-500" />
                                읽는 데 얼마나 걸렸나요? (선택)
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    value={readingTime}
                                    onChange={(e) => setReadingTime(e.target.value)}
                                    placeholder="0"
                                    min="0"
                                    className="w-24 p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-center font-bold"
                                />
                                <span className="text-gray-500 font-medium">분</span>
                                <div className="flex gap-1 ml-auto">
                                    {[10, 20, 30].map((min) => (
                                        <button
                                            key={min}
                                            onClick={() => setReadingTime(String(min))}
                                            className="px-3 py-1 bg-gray-100 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-200"
                                        >
                                            {min}분
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Advanced: Observation Questions (Collapsible) */}
                        <div>
                            <button
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="w-full py-3 text-sm font-bold text-gray-500 hover:text-green-600 border-t border-gray-100"
                            >
                                {showAdvanced ? '▲ 상세 관찰 기록 숨기기' : '▼ 상세 관찰 기록 추가하기 (AI 분석 정확도 향상)'}
                            </button>

                            {showAdvanced && (
                                <div className="space-y-4 mt-4 p-4 bg-blue-50/50 rounded-2xl animate-in slide-in-from-top-2">
                                    <p className="text-xs text-blue-700 font-medium">
                                        {selectedChild?.name}(만 {selectedChild?.age}세)에게 맞는 관찰 질문입니다.
                                    </p>
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
                            )}
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

