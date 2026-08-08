"use client";

import React, { useState, useEffect, useRef } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Check, X } from "lucide-react";

interface KoreanDatePickerProps {
    value: string; // YYYY-MM-DD format
    onChange: (dateStr: string) => void;
    disabled?: boolean;
    id?: string;
    name?: string;
    placeholder?: string;
    className?: string;
}

export default function KoreanDatePicker({
    value,
    onChange,
    disabled = false,
    id,
    name,
    placeholder = "출생일 선택 (연/월/일)",
    className = "",
}: KoreanDatePickerProps) {
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    
    // Parse value (YYYY-MM-DD)
    const parseValue = (val: string) => {
        if (!val || !/^\d{4}-\d{2}-\d{2}$/.exec(val)) {
            return { year: "", month: "", day: "" };
        }
        const [y, m, d] = val.split("-");
        return {
            year: String(parseInt(y, 10)),
            month: String(parseInt(m, 10)),
            day: String(parseInt(d, 10)),
        };
    };

    const parsed = parseValue(value);
    const [selectedYear, setSelectedYear] = useState<string>(parsed.year);
    const [selectedMonth, setSelectedMonth] = useState<string>(parsed.month);
    const [selectedDay, setSelectedDay] = useState<string>(parsed.day);

    // Viewing year/month for the calendar popover
    const currentRealYear = new Date().getFullYear();
    const [viewYear, setViewYear] = useState<number>(parsed.year ? parseInt(parsed.year, 10) : currentRealYear - 5);
    const [viewMonth, setViewMonth] = useState<number>(parsed.month ? parseInt(parsed.month, 10) : 1);

    const containerRef = useRef<HTMLDivElement>(null);

    // Sync state when `value` prop changes
    useEffect(() => {
        const p = parseValue(value);
        setSelectedYear(p.year);
        setSelectedMonth(p.month);
        setSelectedDay(p.day);
        if (p.year && p.month) {
            setViewYear(parseInt(p.year, 10));
            setViewMonth(parseInt(p.month, 10));
        }
    }, [value]);

    // Close calendar on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsCalendarOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Available years: from 2000 to current year
    const minYear = 2000;
    const maxYear = currentRealYear;
    const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i);
    const months = Array.from({ length: 12 }, (_, i) => i + 1);

    // Maximum days in selected year & month
    const getMaxDays = (yStr: string, mStr: string) => {
        if (!yStr || !mStr) return 31;
        const y = parseInt(yStr, 10);
        const m = parseInt(mStr, 10);
        return new Date(y, m, 0).getDate();
    };

    const maxDays = getMaxDays(selectedYear, selectedMonth);
    const days = Array.from({ length: maxDays }, (_, i) => i + 1);

    // Emit updated YYYY-MM-DD
    const emitChange = (y: string, m: string, d: string) => {
        if (y && m && d) {
            const mm = m.padStart(2, "0");
            const dd = d.padStart(2, "0");
            onChange(`${y}-${mm}-${dd}`);
        } else {
            onChange("");
        }
    };

    const handleYearChange = (y: string) => {
        setSelectedYear(y);
        // Adjust day if selected day exceeds max days of new month/year
        const newMax = getMaxDays(y, selectedMonth);
        let newDay = selectedDay;
        if (selectedDay && parseInt(selectedDay, 10) > newMax) {
            newDay = String(newMax);
            setSelectedDay(newDay);
        }
        emitChange(y, selectedMonth, newDay);
    };

    const handleMonthChange = (m: string) => {
        setSelectedMonth(m);
        const newMax = getMaxDays(selectedYear, m);
        let newDay = selectedDay;
        if (selectedDay && parseInt(selectedDay, 10) > newMax) {
            newDay = String(newMax);
            setSelectedDay(newDay);
        }
        emitChange(selectedYear, m, newDay);
    };

    const handleDayChange = (d: string) => {
        setSelectedDay(d);
        emitChange(selectedYear, selectedMonth, d);
    };

    const handleSelectFromCalendar = (dayNum: number) => {
        const y = String(viewYear);
        const m = String(viewMonth);
        const d = String(dayNum);
        setSelectedYear(y);
        setSelectedMonth(m);
        setSelectedDay(d);
        emitChange(y, m, d);
        setIsCalendarOpen(false);
    };

    // Calculate age if valid date selected
    const getAgeText = () => {
        if (selectedYear && selectedMonth && selectedDay) {
            const age = currentRealYear - parseInt(selectedYear, 10);
            return `만 ${age}세`;
        }
        return "";
    };

    // Calendar grid generation
    const firstDayOfWeek = new Date(viewYear, viewMonth - 1, 1).getDay(); // 0: Sun, 1: Mon, ...
    const daysInViewMonth = new Date(viewYear, viewMonth, 0).getDate();

    const handlePrevMonth = () => {
        if (viewMonth === 1) {
            setViewYear(prev => prev - 1);
            setViewMonth(12);
        } else {
            setViewMonth(prev => prev - 1);
        }
    };

    const handleNextMonth = () => {
        if (viewMonth === 12) {
            setViewYear(prev => prev + 1);
            setViewMonth(1);
        } else {
            setViewMonth(prev => prev + 1);
        }
    };

    return (
        <div ref={containerRef} className={`relative w-full ${className}`}>
            {/* Hidden native input for form compatibility */}
            {name && <input type="hidden" id={id} name={name} value={value} />}

            {/* Select Controls Row */}
            <div className="flex flex-col gap-2">
                <div className="grid grid-cols-3 gap-2">
                    {/* Year Select */}
                    <div className="relative">
                        <select
                            value={selectedYear}
                            onChange={(e) => handleYearChange(e.target.value)}
                            disabled={disabled}
                            className="w-full p-3 pr-6 appearance-none bg-white rounded-xl border border-gray-200 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 transition-all cursor-pointer"
                        >
                            <option value="">연도 선택</option>
                            {years.map((y) => (
                                <option key={y} value={y}>
                                    {y}년
                                </option>
                            ))}
                        </select>
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 pointer-events-none">
                            년
                        </span>
                    </div>

                    {/* Month Select */}
                    <div className="relative">
                        <select
                            value={selectedMonth}
                            onChange={(e) => handleMonthChange(e.target.value)}
                            disabled={disabled}
                            className="w-full p-3 pr-6 appearance-none bg-white rounded-xl border border-gray-200 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 transition-all cursor-pointer"
                        >
                            <option value="">월 선택</option>
                            {months.map((m) => (
                                <option key={m} value={m}>
                                    {m}월
                                </option>
                            ))}
                        </select>
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 pointer-events-none">
                            월
                        </span>
                    </div>

                    {/* Day Select */}
                    <div className="relative">
                        <select
                            value={selectedDay}
                            onChange={(e) => handleDayChange(e.target.value)}
                            disabled={disabled}
                            className="w-full p-3 pr-6 appearance-none bg-white rounded-xl border border-gray-200 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 transition-all cursor-pointer"
                        >
                            <option value="">일 선택</option>
                            {days.map((d) => (
                                <option key={d} value={d}>
                                    {d}일
                                </option>
                            ))}
                        </select>
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 pointer-events-none">
                            일
                        </span>
                    </div>
                </div>

                {/* Calendar Toggle & Formatted Preview Bar */}
                <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                    <button
                        type="button"
                        onClick={() => !disabled && setIsCalendarOpen(!isCalendarOpen)}
                        disabled={disabled}
                        className="flex items-center gap-1.5 font-bold text-green-700 hover:text-green-800 transition-colors"
                    >
                        <CalendarIcon size={14} className="text-green-600" />
                        <span>{isCalendarOpen ? "달력 닫기" : "달력으로 선택하기"}</span>
                    </button>

                    {selectedYear && selectedMonth && selectedDay ? (
                        <div className="flex items-center gap-1.5 font-bold text-gray-700">
                            <span className="text-green-600 bg-green-100 px-2 py-0.5 rounded-full font-black text-[11px]">
                                {getAgeText()}
                            </span>
                            <span>
                                {selectedYear}년 {selectedMonth}월 {selectedDay}일
                            </span>
                        </div>
                    ) : (
                        <span className="text-gray-400 font-medium">{placeholder}</span>
                    )}
                </div>
            </div>

            {/* Interactive Korean Calendar Popover */}
            {isCalendarOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 animate-in fade-in zoom-in-95 duration-150">
                    {/* Header: Year / Month Navigation */}
                    <div className="flex items-center justify-between mb-4">
                        <button
                            type="button"
                            onClick={handlePrevMonth}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                        >
                            <ChevronLeft size={18} />
                        </button>

                        <div className="flex items-center gap-2 font-black text-gray-900 text-sm">
                            <select
                                value={viewYear}
                                onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                                className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none text-xs font-bold"
                            >
                                {years.map((y) => (
                                    <option key={y} value={y}>
                                        {y}년
                                    </option>
                                ))}
                            </select>
                            <select
                                value={viewMonth}
                                onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                                className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none text-xs font-bold"
                            >
                                {months.map((m) => (
                                    <option key={m} value={m}>
                                        {m}월
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            type="button"
                            onClick={handleNextMonth}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    {/* Korean Days of Week Header */}
                    <div className="grid grid-cols-7 gap-1 text-center mb-2">
                        <span className="text-xs font-bold text-red-500">일</span>
                        <span className="text-xs font-bold text-gray-600">월</span>
                        <span className="text-xs font-bold text-gray-600">화</span>
                        <span className="text-xs font-bold text-gray-600">수</span>
                        <span className="text-xs font-bold text-gray-600">목</span>
                        <span className="text-xs font-bold text-gray-600">금</span>
                        <span className="text-xs font-bold text-blue-500">토</span>
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {/* Empty padding days before day 1 */}
                        {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                            <div key={`empty-${idx}`} />
                        ))}

                        {/* Day numbers */}
                        {Array.from({ length: daysInViewMonth }).map((_, idx) => {
                            const dNum = idx + 1;
                            const isSelected =
                                String(viewYear) === selectedYear &&
                                String(viewMonth) === selectedMonth &&
                                String(dNum) === selectedDay;

                            const dayOfWeek = (firstDayOfWeek + idx) % 7;
                            const isSunday = dayOfWeek === 0;
                            const isSaturday = dayOfWeek === 6;

                            return (
                                <button
                                    key={dNum}
                                    type="button"
                                    onClick={() => handleSelectFromCalendar(dNum)}
                                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                                        isSelected
                                            ? "bg-green-600 text-white shadow-md shadow-green-200 scale-105"
                                            : isSunday
                                            ? "text-red-500 hover:bg-red-50"
                                            : isSaturday
                                            ? "text-blue-500 hover:bg-blue-50"
                                            : "text-gray-800 hover:bg-gray-100"
                                    }`}
                                >
                                    {dNum}
                                </button>
                            );
                        })}
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold">
                        <button
                            type="button"
                            onClick={() => {
                                const now = new Date();
                                const y = String(now.getFullYear());
                                const m = String(now.getMonth() + 1);
                                const d = String(now.getDate());
                                setSelectedYear(y);
                                setSelectedMonth(m);
                                setSelectedDay(d);
                                emitChange(y, m, d);
                                setIsCalendarOpen(false);
                            }}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            오늘 날짜 선택
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsCalendarOpen(false)}
                            className="text-green-600 hover:text-green-700 flex items-center gap-1"
                        >
                            <Check size={14} /> 확인
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
