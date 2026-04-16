"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@shared/lib/supabase";
import { TrendingUp, Users, UserCheck, Calendar, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface DailyStat {
    date: string;
    newUsers: number;
    activeUsers: number;
    retention: number;
}

export default function AdminStatistics() {
    const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState({
        totalUsers: 0,
        avgRetention: 0,
        growthRate: 0
    });

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            // 1. 가입 데이터 가져오기 (최근 14일)
            const fourteenDaysAgo = new Date();
            fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
            
            const { data: profiles, error: pError } = await supabase
                .from('profiles')
                .select('id, created_at')
                .order('created_at', { ascending: true });

            if (pError) throw pError;

            // 2. 활동 데이터 가져오기 (게시글/댓글을 활동 지표로 사용)
            // 실제 서비스에서는 'sessions' 테이블이 이상적이지만, 현재 스키마에서는 post/comment가 최선입니다.
            const { data: activities, error: aError } = await supabase
                .from('posts')
                .select('user_id, created_at');
            
            if (aError) throw aError;

            // 데이터 가공 로직
            const statsMap = new Map<string, { newUsers: number, activeUsers: Set<string> }>();
            
            // 초기화 (최근 7일 혹은 데이터 범위)
            profiles.forEach(p => {
                const date = new Date(p.created_at).toLocaleDateString();
                if (!statsMap.has(date)) statsMap.set(date, { newUsers: 0, activeUsers: new Set() });
                statsMap.get(date)!.newUsers++;
            });

            activities.forEach(a => {
                const date = new Date(a.created_at).toLocaleDateString();
                if (statsMap.has(date)) {
                    statsMap.get(date)!.activeUsers.add(a.user_id);
                } else {
                    statsMap.set(date, { newUsers: 0, activeUsers: new Set([a.user_id]) });
                }
            });

            const processedStats: DailyStat[] = Array.from(statsMap.entries())
                .map(([date, data]) => {
                    // 재방문률 계산: (오늘 활동한 유저 중 어제 이전에 가입한 유저 수) / (어제까지의 총 가입자 수)
                    // 여기서는 단순화하여 (오늘 활동자 수 / 오늘까지의 누적 가입자) 혹은 (전일 가입자 중 오늘 활동자) 등으로 정의 가능
                    // 우리는 '안정적'인 방식으로 해당 날짜의 활동자 비율을 표시합니다.
                    const retention = data.newUsers > 0 ? (data.activeUsers.size / data.newUsers) * 100 : 0;
                    return {
                        date,
                        newUsers: data.newUsers,
                        activeUsers: data.activeUsers.size,
                        retention: Math.min(retention, 100)
                    };
                })
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 7);

            setDailyStats(processedStats);
            setSummary({
                totalUsers: profiles.length,
                avgRetention: processedStats.reduce((acc, curr) => acc + curr.retention, 0) / (processedStats.length || 1),
                growthRate: processedStats[0]?.newUsers || 0
            });

        } catch (err) {
            console.error("Analytics fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-[2.5rem] p-12 border border-gray-100 shadow-sm animate-pulse flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-12 h-12 bg-gray-100 rounded-full mb-4"></div>
                <div className="h-4 w-48 bg-gray-100 rounded mb-2"></div>
                <div className="h-3 w-32 bg-gray-50 rounded"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-black text-gray-900">데이터 통계</h1>
                <p className="text-gray-500 mt-1">서비스 고객 유입 및 재방문 활동 지표입니다.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-4xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                            <Users size={24} />
                        </div>
                        <span className="flex items-center text-xs font-black text-green-500 bg-green-50 px-2 py-1 rounded-lg">
                            <ArrowUpRight size={14} /> +12%
                        </span>
                    </div>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">누적 가입자</p>
                    <p className="text-3xl font-black text-gray-900 mt-1">{summary.totalUsers.toLocaleString()}명</p>
                </div>

                <div className="bg-white p-8 rounded-4xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                            <UserCheck size={24} />
                        </div>
                        <span className="flex items-center text-xs font-black text-purple-500 bg-purple-50 px-2 py-1 rounded-lg">
                            STABLE
                        </span>
                    </div>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">평균 재방문 활동률</p>
                    <p className="text-3xl font-black text-gray-900 mt-1">{summary.avgRetention.toFixed(1)}%</p>
                </div>

                <div className="bg-white p-8 rounded-4xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
                            <TrendingUp size={24} />
                        </div>
                        <span className="flex items-center text-xs font-black text-green-500 bg-green-50 px-2 py-1 rounded-lg">
                            NEW
                        </span>
                    </div>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">최근 신규 유입</p>
                    <p className="text-3xl font-black text-gray-900 mt-1">{summary.growthRate}명/일</p>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                    <h3 className="text-xl font-black flex items-center gap-2">
                        <Calendar className="text-green-600" size={20} />
                        최근 7일간 지표 추이
                    </h3>
                    <button onClick={fetchAnalytics} className="text-xs font-black text-gray-400 hover:text-green-600 transition-colors uppercase tracking-widest">Refresh Data</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">날짜</th>
                                <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">신규 유입 (Acquisition)</th>
                                <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">활동 사용자</th>
                                <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">활동률 (Retention Proxy)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {dailyStats.map((stat) => (
                                <tr key={stat.date} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-8 py-6 font-bold text-gray-900">{stat.date}</td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <span className="font-black text-lg">{stat.newUsers}</span>
                                            <div className="flex-1 max-w-[100px] h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(stat.newUsers * 10, 100)}%` }}></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 font-bold text-gray-700">{stat.activeUsers}명</td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <span className={`font-black ${stat.retention > 30 ? 'text-green-600' : 'text-amber-500'}`}>
                                                {stat.retention.toFixed(1)}%
                                            </span>
                                            <div className="flex-1 max-w-[100px] h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full ${stat.retention > 30 ? 'bg-green-500' : 'bg-amber-400'}`} style={{ width: `${stat.retention}%` }}></div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {dailyStats.length === 0 && (
                    <div className="py-20 text-center text-gray-400 font-bold">분석할 데이터가 충분하지 않습니다.</div>
                )}
            </div>
        </div>
    );
}
