import PostDetailContent from "./PostDetailContent";

export async function generateStaticParams() {
    return [{ id: 'placeholder' }];
}

export default function Page() {
    return <PostDetailContent />;
}
