import { Book } from "../types";
import Image from "next/image";

interface BookGridProps {
    books: Book[];
    onSelectBook: (book: Book) => void;
    size?: 'default' | 'small';
}

export default function BookGrid({ books, onSelectBook, size = 'default' }: BookGridProps) {
    const gridCols = size === 'small'
        ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6'
        : 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4';

    const gap = size === 'small' ? 'gap-4' : 'gap-8';
    const imageRounding = size === 'small' ? 'rounded-xl' : 'rounded-[2rem]';
    const marginBottom = size === 'small' ? 'mb-3' : 'mb-5';
    const titleSize = size === 'small' ? 'text-sm' : 'text-base';
    const authorSize = size === 'small' ? 'text-xs' : 'text-sm';

    return (
        <div className={`grid ${gridCols} ${gap} animate-in fade-in`}>
            {books.length > 0 ? books.map((book) => (
                <div key={book.id} className="group cursor-pointer" onClick={() => onSelectBook(book)}>
                    <div className={`aspect-[3/4.2] ${imageRounding} overflow-hidden bg-white shadow-sm border border-gray-100 ${marginBottom} relative transition-all duration-500 group-hover:shadow-2xl group-hover:-translate-y-2`}>
                        <Image
                            src={book.imgsrc && book.imgsrc.startsWith('http') ? book.imgsrc : '/file.svg'}
                            alt={book.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-700"
                            sizes={size === 'small' ? "(max-width: 768px) 33vw, 16vw" : "(max-width: 768px) 50vw, 25vw"}
                        />
                    </div>
                    <h3 className={`font-black text-gray-800 group-hover:text-green-600 transition-colors line-clamp-1 ${titleSize}`}>{book.title}</h3>
                    <p className={`text-gray-400 mt-1 ${authorSize}`}>{book.author}</p>
                </div>
            )) : (
                <p className="col-span-full text-center py-20 text-gray-400 font-bold">해당 추천 도서가 아직 없습니다.</p>
            )}
        </div>
    );
}
