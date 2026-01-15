'use client'; // Error components must be Client Components

import { useEffect } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error('Unhandled app error:', error);
    }, [error]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50 text-center">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 max-w-md w-full">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle size={32} />
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-2">오류가 발생했습니다!</h2>
                <p className="text-gray-500 mb-8 break-keep">
                    죄송합니다. 서비스 이용 중 예상치 못한 문제가 발생했습니다.<br />
                    잠시 후 다시 시도해 주세요.
                </p>
                <div className="flex flex-col gap-3">
                    <button
                        onClick={reset}
                        className="w-full py-3 px-6 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors flex items-center justify-center gap-2"
                    >
                        <RefreshCw size={18} /> 다시 시도하기
                    </button>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="w-full py-3 px-6 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                    >
                        홈으로 돌아가기
                    </button>
                </div>
                {process.env.NODE_ENV === 'development' && (
                    <div className="mt-8 p-4 bg-gray-100 rounded-xl text-left overflow-auto max-h-40 text-xs text-red-600 font-mono">
                        {error.message}
                    </div>
                )}
            </div>
        </div>
    );
}
