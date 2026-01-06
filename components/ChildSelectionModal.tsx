"use client";

import { Child } from "../types";
import { X, User, Check } from "lucide-react";

interface ChildSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    childrenList: Child[];
    onSelect: (childId: string) => void;
}

export default function ChildSelectionModal({ isOpen, onClose, childrenList, onSelect }: ChildSelectionModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900">누가 읽었나요?</h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="space-y-3">
                    {childrenList.map((child) => (
                        <button
                            key={child.id}
                            onClick={() => onSelect(child.id)}
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
                                <Check size={20} />
                            </div>
                        </button>
                    ))}

                    {childrenList.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            등록된 자녀 프로필이 없습니다.
                        </div>
                    )}
                </div>

                <div className="mt-6 text-center">
                    <button
                        onClick={onClose}
                        className="text-gray-400 text-sm font-medium hover:text-gray-600"
                    >
                        취소
                    </button>
                </div>
            </div>
        </div>
    );
}
