import BookDetailContent from './BookDetailContent';
import { Suspense } from 'react';

export default function Page() {
    return (
        <Suspense fallback={
            <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        }>
            <BookDetailContent />
        </Suspense>
    );
}
