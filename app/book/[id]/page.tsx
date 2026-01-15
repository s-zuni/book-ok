import { Metadata } from 'next';
import BookDetailContent from './BookDetailContent';
import { supabase } from '../../../lib/supabase'; // NOTE: This client might be configured for client-side. For server, usually we use createServerComponentClient but for public data standard client or fetch is okay-ish if no RLS blocks it.
// Actually, for Aladin API, we can just fetch directly or reuse logic.

type Props = {
    params: { id: string }
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const id = params.id;

    // 1. Try to fetch from DB
    let bookTitle = "도서 상세 정보";
    let bookDescription = "Book,ok에서 도서 정보를 확인하세요.";
    let bookImage = "/og-default.png"; // Fallback image

    try {
        // Try Supabase first (Public data)
        const { data: sbBook } = await supabase.from('books').select('*').eq('id', id).single();

        if (sbBook) {
            bookTitle = sbBook.title;
            bookDescription = sbBook.description || bookDescription;
            bookImage = sbBook.imgsrc || bookImage;
        } else {
            // API Fallback (Using the same internal API route might be tricky from server side if using relative URL. Better to call external API directly or rely on absolute URL if deployed)
            // But since we are server-side, we can just call Aladin API directly if we have the key, OR just default to generic metadata if API key is not easily accessible here without env vars duplication.
            // Let's assume we want at least basic Title from ID if possible, but ID is just ISBN.
            // For now, let's keep it simple: If in DB, rich metadata. If not, generic.
            // (Refining this: We can fetch Aladin API here if we have the key)
            if (process.env.ALADIN_API_KEY) {
                const res = await fetch(`http://www.aladin.co.kr/ttb/api/ItemLookUp.aspx?ttbkey=${process.env.ALADIN_API_KEY}&itemIdType=ISBN13&ItemId=${id}&output=js&Version=20131101&Cover=Big`);
                const data = await res.json();
                if (data.item && data.item.length > 0) {
                    bookTitle = data.item[0].title;
                    bookDescription = data.item[0].description || bookDescription;
                    bookImage = data.item[0].cover || bookImage;
                }
            }
        }
    } catch (e) {
        console.error("Metadata fetch error", e);
    }

    return {
        title: `${bookTitle} | Book,ok`,
        description: bookDescription.substring(0, 160),
        openGraph: {
            title: bookTitle,
            description: bookDescription.substring(0, 160),
            images: [
                {
                    url: bookImage,
                    width: 800,
                    height: 600,
                    alt: bookTitle,
                },
            ],
        },
    };
}

export default function Page() {
    return <BookDetailContent />;
}
