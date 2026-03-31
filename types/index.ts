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
    user_id: string;
    views: number;
    likes: number;
    created_at: string;
    image_url?: string;
}

export interface Comment {
    id: number;
    post_id: number;
    author_name: string;
    content: string;
    user_id: string;
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
    rating?: number; // 1-5 별점
    difficulty_rating?: '쉬움' | '적당' | '어려움'; // 난이도
    reading_time_minutes?: number; // 독서 시간 (분)
    observation_data?: Record<string, string>; // 관찰 데이터
    books?: Book; // Joined book data
}

export interface ReadingGoal {
    id: string;
    user_id: string;
    child_id: string;
    goal_type: 'weekly' | 'monthly';
    target_books: number;
    start_date: string;
    end_date: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Profile {
    id: string;
    nickname: string;
    role: 'parent' | 'children';
    is_admin: boolean;
    phone?: string;
    created_at: string;
}
