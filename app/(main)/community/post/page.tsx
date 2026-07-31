import { Suspense } from 'react';
import PostDetailContent from "./PostDetailContent";

export default function Page() {
    return (
        <Suspense fallback={<div className="p-20 text-center">Loading...</div>}>
            <PostDetailContent />
        </Suspense>
    );
}
