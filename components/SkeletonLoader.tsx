export default function SkeletonLoader({ count = 3, type = "list" }: { count?: number; type?: "list" | "card" }) {
    return (
        <div className="space-y-6 w-full animate-in fade-in">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className={`animate-pulse ${type === 'card' ? '' : 'border-b border-gray-100 pb-8'}`}>
                    {type === "list" ? (
                        <>
                            {/* Meta */}
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-6 h-6 rounded-full bg-gray-200" />
                                <div className="h-3 w-20 bg-gray-200 rounded" />
                                <div className="h-3 w-16 bg-gray-100 rounded" />
                            </div>

                            {/* Content */}
                            <div className="flex justify-between gap-6">
                                <div className="flex-1 space-y-3">
                                    <div className="h-6 bg-gray-200 rounded w-3/4" />
                                    <div className="h-4 bg-gray-100 rounded w-full" />
                                    <div className="h-4 bg-gray-100 rounded w-2/3" />
                                    <div className="flex gap-2 mt-2">
                                        <div className="h-4 w-12 bg-gray-100 rounded" />
                                        <div className="h-4 w-12 bg-gray-100 rounded" />
                                    </div>
                                </div>
                                <div className="w-24 h-24 md:w-32 md:h-32 bg-gray-200 rounded-xl shrink-0" />
                            </div>
                        </>
                    ) : (
                        <div className="space-y-3">
                            <div className="aspect-3/4 bg-gray-200 rounded-xl" />
                            <div className="h-4 bg-gray-200 rounded w-3/4" />
                            <div className="h-3 bg-gray-100 rounded w-1/2" />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
