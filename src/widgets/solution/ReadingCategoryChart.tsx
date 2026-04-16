"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Book } from '@shared/types';
import { useMemo } from 'react';

interface ReadingCategoryChartProps {
    books: Book[];
}

const COLORS = ['#4ade80', '#60a5fa', '#f472b6', '#fbbf24', '#a78bfa', '#9ca3af'];

export default function ReadingCategoryChart({ books }: ReadingCategoryChartProps) {

    // Calculate category distribution
    const data = useMemo(() => {
        const categoryCounts: { [key: string]: number } = {};
        let total = 0;

        books.forEach(book => {
            // Simplify category names (e.g., "Children's > Science" -> "Science")
            // This depends on the raw data format. Assuming simple mapping or raw usage for now.
            // Aladin API categories can be "국내도서>유아>그림책>..." 
            // We'll take the 2nd or 3rd part if > exists, or just use the whole string.
            // For robustness, let's use the provided 'category' field directly first.
            const cat = book.category ? book.category.split('>').pop()?.trim() || '기타' : '기타';

            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
            total++;
        });

        // Convert to array and sort by countdesc
        return Object.entries(categoryCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6); // Top 6 categories
    }, [books]);

    if (books.length === 0) {
        return <div className="text-center text-gray-400 py-10">데이터가 없습니다.</div>;
    }

    return (
        <div className="w-full h-[300px] flex flex-col items-center">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        formatter={(value: any) => [`${value}권`, '']}
                    />
                    <Legend
                        layout="vertical"
                        verticalAlign="middle"
                        align="right"
                        wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#374151' }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
