export type MainMenu = 'intro' | 'rec' | 'solution' | 'comm';

export type ViewState = 'main' | 'search' | 'detail' | 'mypage' | 'write' | 'post-detail' | 'auth';

export interface Book {
    id: string;
    bookid: string;
    title: string;
    author: string;
    imgsrc: string;
    category: string;
    pubDate?: string;
    description?: string;
    toc?: string;
}

export interface Review {
    id: number;
    book_id: string | number;
    user_id: string;
    rating: number;
    review_text: string;
    created_at: string;
    profiles: {
        nickname: string;
    }
}

export interface Post {
    id: number;
    category: string;
    title: string;
    content: string;
    author_nickname: string;
    author_id: string;
    views: number;
    likes: number;
    created_at: string;
    image_url?: string;
}

export interface Comment {
    id: number;
    post_id: number;
    author_nickname: string;
    content: string;
    author_id: string;
    created_at: string;
    parent_id?: number | null;
}

export interface Child {
    id: string;
    name: string;
    age: number;
    type: string;
    parent_id: string;
    birthdate: string;
}

export interface ReadBook {
    id: number;
    user_id: string;
    child_id: string;
    book_id: string;
    read_date: string;
    books?: Book; // Joined book data
}
