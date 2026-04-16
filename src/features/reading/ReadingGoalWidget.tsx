"use client";

import { useState, useEffect } from "react";
import { Child, ReadingGoal, ReadBook } from "@shared/types";
import { supabase } from "@shared/lib/supabase";
import { Target, Plus, X, Edit3, Trophy, Flame, BookOpen, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface ReadingGoalWidgetProps {
    child: Child;
    userId: string;
    readBooks: ReadBook[];
}

interface GoalProgress {
    goal: ReadingGoal;
    currentCount: number;
    percentage: number;
    daysRemaining: number;
}

export default function ReadingGoalWidget({ child, userId, readBooks }: ReadingGoalWidgetProps) {
    const [goals, setGoals] = useState<ReadingGoal[]>([]);
    const [goalProgress, setGoalProgress] = useState<GoalProgress[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingGoal, setEditingGoal] = useState<ReadingGoal | null>(null);

    // Form state
    const [goalType, setGoalType] = useState<'weekly' | 'monthly'>('weekly');
    const [targetBooks, setTargetBooks] = useState(3);

    // Fetch goals
    const fetchGoals = async () => {
        try {
            const { data, error } = await supabase
                .from('reading_goals')
                .select('*')
                .eq('child_id', child.id)
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setGoals(data || []);
        } catch (err: any) {
            console.error('Error fetching goals:', err);
        } finally {
            setLoading(false);
        }
    };

    // Calculate progress for each goal
    const calculateProgress = () => {
        const progress: GoalProgress[] = goals.map(goal => {
            const startDate = new Date(goal.start_date);
            const endDate = new Date(goal.end_date);
            const today = new Date();

            // Count books read within goal period
            const booksInPeriod = readBooks.filter(book => {
                const readDate = new Date(book.read_date);
                return readDate >= startDate && readDate <= endDate;
            }).length;

            // Days remaining
            const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

            // Calculate percentage (cap at 100)
            const percentage = Math.min(100, Math.round((booksInPeriod / goal.target_books) * 100));

            return {
                goal,
                currentCount: booksInPeriod,
                percentage,
                daysRemaining
            };
        });

        setGoalProgress(progress);
    };

    useEffect(() => {
        fetchGoals();
    }, [child.id]);

    useEffect(() => {
        if (goals.length > 0) {
            calculateProgress();
        }
    }, [goals, readBooks]);

    // Create or update goal
    const handleSaveGoal = async () => {
        try {
            const today = new Date();
            let startDate = today;
            let endDate = new Date();

            if (goalType === 'weekly') {
                // Start from beginning of current week (Monday)
                const dayOfWeek = today.getDay();
                const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                startDate = new Date(today);
                startDate.setDate(today.getDate() + diff);
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6);
            } else {
                // Monthly: start from 1st of current month
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            }

            if (editingGoal) {
                // Update existing goal
                const { error } = await supabase
                    .from('reading_goals')
                    .update({
                        goal_type: goalType,
                        target_books: targetBooks,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', editingGoal.id);

                if (error) throw error;
                toast.success('목표가 수정되었습니다!');
            } else {
                // Deactivate existing goals of same type
                await supabase
                    .from('reading_goals')
                    .update({ is_active: false })
                    .eq('child_id', child.id)
                    .eq('goal_type', goalType);

                // Create new goal
                const { error } = await supabase
                    .from('reading_goals')
                    .insert({
                        user_id: userId,
                        child_id: child.id,
                        goal_type: goalType,
                        target_books: targetBooks,
                        start_date: startDate.toISOString().split('T')[0],
                        end_date: endDate.toISOString().split('T')[0],
                        is_active: true
                    });

                if (error) throw error;
                toast.success('새 목표가 설정되었습니다! 🎯');
            }

            setShowModal(false);
            setEditingGoal(null);
            fetchGoals();
        } catch (err: any) {
            console.error(err);
            toast.error('저장 중 오류가 발생했습니다: ' + err.message);
        }
    };

    const openEditModal = (goal: ReadingGoal) => {
        setEditingGoal(goal);
        setGoalType(goal.goal_type);
        setTargetBooks(goal.target_books);
        setShowModal(true);
    };

    const getProgressColor = (percentage: number) => {
        if (percentage >= 100) return 'bg-green-500';
        if (percentage >= 70) return 'bg-blue-500';
        if (percentage >= 40) return 'bg-yellow-500';
        return 'bg-gray-300';
    };

    const getStreakEmoji = (percentage: number) => {
        if (percentage >= 100) return '🏆';
        if (percentage >= 70) return '🔥';
        if (percentage >= 40) return '📚';
        return '💪';
    };

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-xl text-purple-600">
                        <Target size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">독서 목표</h3>
                        <p className="text-xs text-gray-500">{child.name}님의 목표</p>
                    </div>
                </div>
                <button
                    onClick={() => { setEditingGoal(null); setShowModal(true); }}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                    <Plus size={20} className="text-gray-600" />
                </button>
            </div>

            {/* Goals List */}
            <div className="p-5 space-y-4">
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2].map(i => (
                            <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : goalProgress.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Target size={32} className="text-purple-400" />
                        </div>
                        <p className="text-gray-500 text-sm mb-4">아직 설정된 목표가 없어요</p>
                        <button
                            onClick={() => setShowModal(true)}
                            className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition-colors"
                        >
                            첫 목표 설정하기
                        </button>
                    </div>
                ) : (
                    goalProgress.map(({ goal, currentCount, percentage, daysRemaining }) => (
                        <div
                            key={goal.id}
                            className="p-4 bg-linear-to-r from-purple-50 to-indigo-50 rounded-2xl border border-purple-100"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl">{getStreakEmoji(percentage)}</span>
                                    <div>
                                        <span className="font-bold text-gray-900">
                                            {goal.goal_type === 'weekly' ? '주간' : '월간'} 목표
                                        </span>
                                        <span className="text-xs text-gray-500 ml-2">
                                            D-{daysRemaining}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => openEditModal(goal)}
                                    className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
                                >
                                    <Edit3 size={14} className="text-gray-400" />
                                </button>
                            </div>

                            {/* Progress bar */}
                            <div className="mb-2">
                                <div className="h-3 bg-white/50 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${getProgressColor(percentage)} transition-all duration-500 rounded-full`}
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-bold text-purple-700">
                                    {currentCount} / {goal.target_books}권
                                </span>
                                <span className={`font-bold ${percentage >= 100 ? 'text-green-600' : 'text-gray-500'}`}>
                                    {percentage}%
                                </span>
                            </div>

                            {percentage >= 100 && (
                                <div className="mt-3 flex items-center gap-2 text-sm text-green-600 font-bold">
                                    <Trophy size={16} />
                                    목표 달성! 축하해요! 🎉
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Goal Setting Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md p-6 animate-in zoom-in-95">
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="text-xl font-black text-gray-900">
                                {editingGoal ? '목표 수정' : '새 목표 설정'}
                            </h4>
                            <button
                                onClick={() => { setShowModal(false); setEditingGoal(null); }}
                                className="p-2 hover:bg-gray-100 rounded-xl"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Goal Type Selection */}
                        <div className="mb-6">
                            <label className="block text-sm font-bold text-gray-700 mb-2">목표 유형</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setGoalType('weekly')}
                                    className={`p-4 rounded-2xl border-2 transition-all ${goalType === 'weekly'
                                        ? 'border-purple-500 bg-purple-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <Flame size={24} className={goalType === 'weekly' ? 'text-purple-500' : 'text-gray-400'} />
                                    <span className={`block mt-2 font-bold ${goalType === 'weekly' ? 'text-purple-700' : 'text-gray-600'}`}>
                                        주간 목표
                                    </span>
                                    <span className="text-xs text-gray-500">매주 갱신</span>
                                </button>
                                <button
                                    onClick={() => setGoalType('monthly')}
                                    className={`p-4 rounded-2xl border-2 transition-all ${goalType === 'monthly'
                                        ? 'border-purple-500 bg-purple-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <Trophy size={24} className={goalType === 'monthly' ? 'text-purple-500' : 'text-gray-400'} />
                                    <span className={`block mt-2 font-bold ${goalType === 'monthly' ? 'text-purple-700' : 'text-gray-600'}`}>
                                        월간 목표
                                    </span>
                                    <span className="text-xs text-gray-500">매월 갱신</span>
                                </button>
                            </div>
                        </div>

                        {/* Target Books */}
                        <div className="mb-6">
                            <label className="block text-sm font-bold text-gray-700 mb-2">목표 권수</label>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setTargetBooks(Math.max(1, targetBooks - 1))}
                                    className="w-12 h-12 rounded-xl bg-gray-100 font-bold text-xl hover:bg-gray-200 transition-colors"
                                >
                                    -
                                </button>
                                <div className="flex-1 text-center">
                                    <span className="text-4xl font-black text-purple-600">{targetBooks}</span>
                                    <span className="text-gray-500 ml-1">권</span>
                                </div>
                                <button
                                    onClick={() => setTargetBooks(targetBooks + 1)}
                                    className="w-12 h-12 rounded-xl bg-gray-100 font-bold text-xl hover:bg-gray-200 transition-colors"
                                >
                                    +
                                </button>
                            </div>

                            {/* Quick presets */}
                            <div className="flex justify-center gap-2 mt-3">
                                {(goalType === 'weekly' ? [2, 3, 5, 7] : [4, 8, 12, 20]).map(num => (
                                    <button
                                        key={num}
                                        onClick={() => setTargetBooks(num)}
                                        className={`px-3 py-1 rounded-lg text-sm font-bold transition-colors ${targetBooks === num
                                            ? 'bg-purple-500 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        {num}권
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Save Button */}
                        <button
                            onClick={handleSaveGoal}
                            className="w-full py-4 bg-purple-600 text-white rounded-2xl font-bold text-lg hover:bg-purple-700 transition-colors"
                        >
                            {editingGoal ? '수정 완료' : '목표 설정하기'} 🎯
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
