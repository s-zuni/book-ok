"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@shared/lib/supabase";
import { 
    TrendingUp, Users, Clock, Flame, 
    Smartphone, Calendar, RefreshCw, BarChart3, 
    PieChart as PieIcon, Activity, Sparkles, 
    BookOpen, MessageSquare, Bot, Home, Search, 
    User, ArrowUpRight, CheckCircle2, Laptop
} from "lucide-react";
import { 
    ResponsiveContainer, AreaChart, Area, 
    XAxis, YAxis, Tooltip, CartesianGrid, 
    BarChart, Bar, PieChart, Pie, Cell, Legend 
} from "recharts";

type TimeRange = 'today' | '7d' | '30d' | 'all';

interface ServiceStat {
    service_key: string;
    service_name: string;
    total_duration: number;
    avg_duration: number;
    unique_users: number;
    visit_count: number;
    duration_share: number;
}

interface DailyTrend {
    date: string;
    total_duration: number;
    avg_duration: number;
    session_count: number;
    unique_users: number;
}

interface HourlyStat {
    hour: number;
    session_count: number;
    total_duration: number;
}

interface DeviceStat {
    device_type: string;
    session_count: number;
    unique_users: number;
    total_duration: number;
}

interface AnalyticsOverview {
    total_duration_seconds: number;
    avg_duration_seconds: number;
    total_sessions: number;
    unique_users: number;
    active_now: number;
}

interface AnalyticsData {
    overview: AnalyticsOverview;
    service_stats: ServiceStat[];
    daily_trends: DailyTrend[];
    hourly_distribution: HourlyStat[];
    device_stats: DeviceStat[];
}

const SERVICE_ICONS: Record<string, any> = {
    chat: Bot,
    book: BookOpen,
    solution: Sparkles,
    community: MessageSquare,
    home: Home,
    mypage: User,
    search: Search,
    landing: Activity,
    other: BarChart3
};

const CHART_COLORS = [
    '#16A34A', // Green
    '#3B82F6', // Blue
    '#8B5CF6', // Purple
    '#F59E0B', // Amber
    '#EC4899', // Pink
    '#10B981', // Emerald
    '#6366F1', // Indigo
    '#64748B', // Slate
];

// 초 단위를 직관적인 한국어 시간 형식으로 포맷팅
function formatDuration(totalSeconds: number): string {
    if (!totalSeconds || totalSeconds <= 0) return '0초';
    const s = Math.round(totalSeconds);
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = s % 60;

    if (hours > 0) {
        return `${hours}시간 ${minutes}분 ${seconds > 0 ? `${seconds}초` : ''}`.trim();
    }
    if (minutes > 0) {
        return `${minutes}분 ${seconds}초`;
    }
    return `${seconds}초`;
}

// 간단한 분/초 포맷
function formatDurationShort(totalSeconds: number): string {
    if (!totalSeconds || totalSeconds <= 0) return '0초';
    const s = Math.round(totalSeconds);
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = s % 60;

    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
}

// 디바이스 라벨 변환
function formatDeviceName(type: string): { name: string; icon: any } {
    switch (type) {
        case 'ios':
            return { name: 'iOS 앱', icon: Smartphone };
        case 'android':
            return { name: 'Android 앱', icon: Smartphone };
        case 'mobile_web':
            return { name: '모바일 웹', icon: Smartphone };
        case 'desktop_web':
            return { name: '데스크톱 웹', icon: Laptop };
        default:
            return { name: '웹 브라우저', icon: Laptop };
    }
}

export default function AdminStatistics() {
    const [timeRange, setTimeRange] = useState<TimeRange>('7d');
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [data, setData] = useState<AnalyticsData | null>(null);

    const fetchAnalytics = useCallback(async () => {
        setLoading(true);
        try {
            const now = new Date();
            let startDate: Date;

            if (timeRange === 'today') {
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
            } else if (timeRange === '7d') {
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            } else if (timeRange === '30d') {
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            } else {
                // all time (e.g. 1 year ago)
                startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            }

            // Call high-speed aggregated RPC function
            const { data: res, error } = await supabase.rpc('get_admin_analytics', {
                p_start_date: startDate.toISOString(),
                p_end_date: now.toISOString()
            });

            if (error) throw error;
            if (res) {
                setData(res as AnalyticsData);
            }
            setLastUpdated(new Date());
        } catch (err) {
            console.error("Failed to fetch admin analytics:", err);
        } finally {
            setLoading(false);
        }
    }, [timeRange]);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    // 30초 자동 새로고침
    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(() => {
            fetchAnalytics();
        }, 30000);
        return () => clearInterval(interval);
    }, [autoRefresh, fetchAnalytics]);

    // 서비스 도넛 차트용 가공 데이터
    const pieChartData = useMemo(() => {
        if (!data?.service_stats || data.service_stats.length === 0) return [];
        return data.service_stats.map((s) => ({
            name: s.service_name,
            value: s.total_duration,
            share: s.duration_share,
            users: s.unique_users,
            visits: s.visit_count
        }));
    }, [data?.service_stats]);

    // 일별 추이 차트용 가공 데이터 (시간 단위를 '분'으로 변환)
    const dailyChartData = useMemo(() => {
        if (!data?.daily_trends) return [];
        return data.daily_trends.map(d => ({
            date: d.date.slice(5), // 'MM-DD'
            totalMinutes: Math.round(d.total_duration / 60),
            sessionCount: d.session_count,
            uniqueUsers: d.unique_users,
            avgSeconds: Math.round(d.avg_duration)
        }));
    }, [data?.daily_trends]);

    // 시간대별 분포 차트 가공
    const hourlyChartData = useMemo(() => {
        if (!data?.hourly_distribution) return [];
        return data.hourly_distribution.map(h => ({
            hour: `${h.hour}시`,
            sessions: h.session_count,
            minutes: Math.round(h.total_duration / 60)
        }));
    }, [data?.hourly_distribution]);

    return (
        <div className="space-y-8">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-4xl border border-gray-100 shadow-sm">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">서비스 이용 & 체류시간 분석</h1>
                        <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-black rounded-full border border-emerald-100">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            실시간 연동 중
                        </span>
                    </div>
                    <p className="text-gray-500 text-sm mt-1 font-medium">
                        앱 전체 및 각 서비스별 체류시간, 고유 이용자수, 페이지 이동 현황을 실시간으로 분석합니다.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Time Range Tabs */}
                    <div className="bg-gray-100 p-1 rounded-2xl flex items-center gap-1 text-xs font-bold text-gray-600">
                        {[
                            { id: 'today', label: '오늘' },
                            { id: '7d', label: '최근 7일' },
                            { id: '30d', label: '최근 30일' },
                            { id: 'all', label: '전체' },
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => setTimeRange(t.id as TimeRange)}
                                className={`px-3 py-2 rounded-xl transition-all ${
                                    timeRange === t.id
                                        ? 'bg-white text-gray-900 font-black shadow-xs'
                                        : 'hover:text-gray-900'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Refresh Button */}
                    <button
                        onClick={fetchAnalytics}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:border-gray-300 rounded-2xl text-xs font-black text-gray-700 hover:bg-gray-50 transition-all shadow-xs disabled:opacity-50"
                        title="새로고침"
                    >
                        <RefreshCw size={14} className={loading ? "animate-spin text-green-600" : ""} />
                        <span>새로고침</span>
                    </button>

                    {/* Auto Refresh Toggle */}
                    <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold transition-all ${
                            autoRefresh
                                ? 'bg-green-50 text-green-700 border border-green-200'
                                : 'bg-gray-50 text-gray-400 border border-gray-200'
                        }`}
                    >
                        <span className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                        자동 새로고침 30s
                    </button>
                </div>
            </div>

            {/* Top Core KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* 1. 총 체류시간 */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
                            <Clock size={20} />
                        </div>
                        <span className="text-[10px] font-black tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md uppercase">
                            Total Stay
                        </span>
                    </div>
                    <p className="text-xs font-bold text-gray-400">총 앱 체류시간</p>
                    <p className="text-2xl font-black text-gray-900 mt-1">
                        {loading ? '...' : formatDuration(data?.overview.total_duration_seconds || 0)}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-2">선택 기간 모든 방문 누적 시간</p>
                </div>

                {/* 2. 세션당 평균 체류시간 */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                            <TrendingUp size={20} />
                        </div>
                        <span className="text-[10px] font-black tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase">
                            Avg Duration
                        </span>
                    </div>
                    <p className="text-xs font-bold text-gray-400">세션당 평균 체류시간</p>
                    <p className="text-2xl font-black text-gray-900 mt-1">
                        {loading ? '...' : formatDuration(data?.overview.avg_duration_seconds || 0)}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-2">방문 1회당 평균 머문 시간</p>
                </div>

                {/* 3. 실시간 활성 접속자 */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl">
                            <Flame size={20} />
                        </div>
                        <span className="text-[10px] font-black tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md flex items-center gap-1 uppercase">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                            Live Now
                        </span>
                    </div>
                    <p className="text-xs font-bold text-gray-400">실시간 활성 이용자</p>
                    <p className="text-2xl font-black text-gray-900 mt-1">
                        {loading ? '...' : `${data?.overview.active_now || 0}명`}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-2">최근 5분 이내 활동 중</p>
                </div>

                {/* 4. 고유 이용자수 (UV) */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 bg-purple-50 text-purple-600 rounded-2xl">
                            <Users size={20} />
                        </div>
                        <span className="text-[10px] font-black tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md uppercase">
                            Unique Users
                        </span>
                    </div>
                    <p className="text-xs font-bold text-gray-400">순 이용자수 (UV)</p>
                    <p className="text-2xl font-black text-gray-900 mt-1">
                        {loading ? '...' : `${(data?.overview.unique_users || 0).toLocaleString()}명`}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-2">고유 사용자 식별</p>
                </div>

                {/* 5. 총 세션 수 */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 bg-rose-50 text-rose-600 rounded-2xl">
                            <Activity size={20} />
                        </div>
                        <span className="text-[10px] font-black tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md uppercase">
                            Sessions
                        </span>
                    </div>
                    <p className="text-xs font-bold text-gray-400">총 접속 세션 수</p>
                    <p className="text-2xl font-black text-gray-900 mt-1">
                        {loading ? '...' : `${(data?.overview.total_sessions || 0).toLocaleString()}회`}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-2">앱 실행 및 접속 횟수</p>
                </div>
            </div>

            {/* Section 1: 각 서비스별 체류시간 및 이용자수 심층 분석 */}
            <div className="bg-white rounded-4xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-2">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                            <PieIcon className="text-green-600" size={22} />
                            각 서비스별 체류시간 및 이용자수 분석
                        </h2>
                        <p className="text-xs text-gray-400 mt-0.5 font-medium">
                            사용자들이 어떤 기능에 가장 오래 머무르고 주로 사용하는지 파악할 수 있는 핵심 지표입니다.
                        </p>
                    </div>
                    <span className="text-xs font-bold text-gray-400">
                        기준: {data?.service_stats?.length || 0}개 서비스
                    </span>
                </div>

                {/* Charts Dual Column */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    {/* Left: Donut Chart for Stay Time Share */}
                    <div className="lg:col-span-5 flex flex-col items-center">
                        <p className="text-xs font-black text-gray-500 mb-2 uppercase tracking-wider">
                            서비스별 체류시간 점유율 (%)
                        </p>
                        <div className="w-full h-[280px]">
                            {pieChartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieChartData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={65}
                                            outerRadius={95}
                                            paddingAngle={4}
                                        >
                                            {pieChartData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value: any, name: any, item: any) => [
                                                `${formatDuration(Number(value))} (${item.payload.share}%)`,
                                                name
                                            ]}
                                            contentStyle={{
                                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                borderRadius: '16px',
                                                border: '1px solid #f1f5f9',
                                                boxShadow: '0 4px 20px -2px rgba(0,0,0,0.08)',
                                                fontWeight: 'bold',
                                                fontSize: '12px'
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-xs text-gray-400 font-bold">
                                    데이터 집계 중...
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Bar Chart for Users & Visits per Service */}
                    <div className="lg:col-span-7">
                        <p className="text-xs font-black text-gray-500 mb-2 uppercase tracking-wider">
                            서비스별 고유 이용자수 (명) & 총 방문수 (회)
                        </p>
                        <div className="w-full h-[280px]">
                            {data?.service_stats && data.service_stats.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={data.service_stats}
                                        margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis 
                                            dataKey="service_name" 
                                            tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }}
                                            interval={0}
                                            angle={-15}
                                            textAnchor="end"
                                        />
                                        <YAxis tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} />
                                        <Tooltip
                                            formatter={(val: any, name: any) => [
                                                name === 'unique_users' ? `${val}명` : `${val}회`,
                                                name === 'unique_users' ? '고유 이용자수' : '총 방문수'
                                            ]}
                                            contentStyle={{
                                                backgroundColor: '#fff',
                                                borderRadius: '16px',
                                                border: '1px solid #f1f5f9',
                                                fontSize: '12px',
                                                fontWeight: 700
                                            }}
                                        />
                                        <Bar dataKey="unique_users" name="unique_users" fill="#16A34A" radius={[6, 6, 0, 0]} />
                                        <Bar dataKey="visit_count" name="visit_count" fill="#93C5FD" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-xs text-gray-400 font-bold">
                                    데이터 집계 중...
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Detailed Service Table */}
                <div className="overflow-x-auto pt-2">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/70 border-b border-gray-100">
                                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider">서비스명</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider">총 체류시간</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider">평균 체류시간</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider">체류시간 점유율</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider">고유 이용자수</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider">총 방문/조회수</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {data?.service_stats?.map((service, index) => {
                                const IconComponent = SERVICE_ICONS[service.service_key] || BarChart3;
                                const color = CHART_COLORS[index % CHART_COLORS.length];
                                return (
                                    <tr key={service.service_key} className="hover:bg-gray-50/50 transition-colors">
                                        {/* Service Name & Icon */}
                                        <td className="px-6 py-4.5">
                                            <div className="flex items-center gap-3">
                                                <div 
                                                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-xs"
                                                    style={{ backgroundColor: color }}
                                                >
                                                    <IconComponent size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 text-sm">{service.service_name}</p>
                                                    <p className="text-[11px] text-gray-400 font-mono">/{service.service_key}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Total Duration */}
                                        <td className="px-6 py-4.5">
                                            <span className="font-black text-gray-900 text-base">
                                                {formatDuration(service.total_duration)}
                                            </span>
                                        </td>

                                        {/* Avg Duration */}
                                        <td className="px-6 py-4.5">
                                            <span className="font-bold text-gray-700 text-sm">
                                                {formatDuration(service.avg_duration)}
                                            </span>
                                            <span className="text-[11px] text-gray-400 ml-1">/방문</span>
                                        </td>

                                        {/* Duration Share Bar */}
                                        <td className="px-6 py-4.5">
                                            <div className="flex items-center gap-3 min-w-[140px]">
                                                <span className="font-black text-sm text-gray-800 w-12">
                                                    {service.duration_share}%
                                                </span>
                                                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full rounded-full transition-all duration-500"
                                                        style={{ 
                                                            width: `${Math.min(service.duration_share, 100)}%`,
                                                            backgroundColor: color 
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </td>

                                        {/* Unique Users */}
                                        <td className="px-6 py-4.5">
                                            <div className="flex items-center gap-1.5 font-bold text-gray-800 text-sm">
                                                <Users size={14} className="text-gray-400" />
                                                {service.unique_users.toLocaleString()}명
                                            </div>
                                        </td>

                                        {/* Visit Count */}
                                        <td className="px-6 py-4.5">
                                            <span className="font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-xl text-xs">
                                                {service.visit_count.toLocaleString()}회
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {(!data?.service_stats || data.service_stats.length === 0) && (
                        <div className="py-16 text-center text-gray-400 font-bold">
                            해당 기간에 기록된 서비스 활동 로그가 없습니다.
                        </div>
                    )}
                </div>
            </div>

            {/* Section 2: 일자별 체류시간 & 활성 세션 추이 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Daily Trend Area Chart */}
                <div className="lg:col-span-2 bg-white rounded-4xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                        <div>
                            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                                <Calendar className="text-emerald-600" size={20} />
                                일자별 체류시간(분) 및 접속 세션 추이
                            </h3>
                            <p className="text-xs text-gray-400 mt-0.5 font-medium">
                                날짜별 전체 사용자들의 누적 머문 시간(분)과 접속 횟수의 변화입니다.
                            </p>
                        </div>
                    </div>

                    <div className="w-full h-[280px]">
                        {dailyChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={dailyChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorStay" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#16A34A" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#16A34A" stopOpacity={0.0}/>
                                        </linearGradient>
                                        <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="date" tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} />
                                    <YAxis tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} />
                                    <Tooltip
                                        formatter={(val: any, name: any) => [
                                            name === 'totalMinutes' ? `${val}분` : `${val}회`,
                                            name === 'totalMinutes' ? '총 체류시간' : '세션 수'
                                        ]}
                                        contentStyle={{
                                            backgroundColor: '#fff',
                                            borderRadius: '16px',
                                            border: '1px solid #f1f5f9',
                                            fontSize: '12px',
                                            fontWeight: 700
                                        }}
                                    />
                                    <Area type="monotone" dataKey="totalMinutes" name="totalMinutes" stroke="#16A34A" strokeWidth={3} fillOpacity={1} fill="url(#colorStay)" />
                                    <Area type="monotone" dataKey="sessionCount" name="sessionCount" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorSessions)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-xs text-gray-400 font-bold">
                                데이터 집계 중...
                            </div>
                        )}
                    </div>
                </div>

                {/* Device Breakdown */}
                <div className="bg-white rounded-4xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-4 flex flex-col justify-between">
                    <div>
                        <h3 className="text-lg font-black text-gray-900 flex items-center gap-2 pb-3 border-b border-gray-100">
                            <Smartphone className="text-blue-600" size={20} />
                            접속 환경 및 디바이스
                        </h3>
                        <p className="text-xs text-gray-400 mt-1 font-medium">
                            사용자들의 앱/웹 유입 플랫폼 분포
                        </p>
                    </div>

                    <div className="space-y-4 py-2">
                        {data?.device_stats?.map((device) => {
                            const { name, icon: DevIcon } = formatDeviceName(device.device_type);
                            const totalSess = data.overview.total_sessions || 1;
                            const pct = Math.round((device.session_count / totalSess) * 100);
                            return (
                                <div key={device.device_type} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-white rounded-xl text-gray-700 shadow-2xs">
                                                <DevIcon size={16} />
                                            </div>
                                            <span className="font-bold text-gray-800 text-sm">{name}</span>
                                        </div>
                                        <span className="font-black text-sm text-gray-900">{pct}%</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-gray-400 font-medium">
                                        <span>세션 {device.session_count.toLocaleString()}회</span>
                                        <span>이용자 {device.unique_users}명 ({formatDurationShort(device.total_duration)})</span>
                                    </div>
                                </div>
                            );
                        })}

                        {(!data?.device_stats || data.device_stats.length === 0) && (
                            <div className="py-12 text-center text-gray-400 text-xs font-bold">
                                디바이스 통계 없음
                            </div>
                        )}
                    </div>

                    <div className="text-[11px] text-gray-400 font-medium text-center pt-2 border-t border-gray-50">
                        마지막 갱신: {lastUpdated.toLocaleTimeString()}
                    </div>
                </div>
            </div>

            {/* Section 3: 시간대별(0~23시) 활동 분포 */}
            <div className="bg-white rounded-4xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div>
                        <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                            <Clock className="text-purple-600" size={20} />
                            시간대별(0시 ~ 23시) 이용 패턴
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5 font-medium">
                            아이들과 학부모가 주로 어느 시간대(방과 후 15~18시, 취침 전 20~22시 등)에 집중 접속하는지 파악합니다.
                        </p>
                    </div>
                </div>

                <div className="w-full h-[220px]">
                    {hourlyChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={hourlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="hour" tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} interval={1} />
                                <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                                <Tooltip
                                    formatter={(val: any, name: any) => [
                                        name === 'sessions' ? `${val}회` : `${val}분`,
                                        name === 'sessions' ? '접속 세션 수' : '체류시간'
                                    ]}
                                    contentStyle={{
                                        backgroundColor: '#fff',
                                        borderRadius: '16px',
                                        border: '1px solid #f1f5f9',
                                        fontSize: '12px',
                                        fontWeight: 700
                                    }}
                                />
                                <Bar dataKey="sessions" name="sessions" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-xs text-gray-400 font-bold">
                            데이터 집계 중...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
