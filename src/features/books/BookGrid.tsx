import { Book } from "@shared/types";
import Image from "next/image";
import { Star } from "lucide-react";

interface BookGridProps {
    books: any[];
    onSelectBook: (book: any) => void;
    size?: 'default' | 'small';
}

export default function BookGrid({ books, onSelectBook, size = 'default' }: BookGridProps) {
    if (size === 'small') {
        return (
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3 animate-in fade-in">
                {books.length > 0 ? books.map((book) => (
                    <div 
                        key={book.id} 
                        onClick={() => onSelectBook(book)}
                        className="bg-white rounded-[20px] p-2 border border-gray-100 shadow-[0_4px_12px_rgba(0,0,0,0.02)] cursor-pointer active:scale-[0.98] transition-all flex flex-col justify-between"
                    >
                        <div>
                            <div className="relative w-full aspect-[3/4.2] rounded-[14px] overflow-hidden mb-2 border border-gray-50">
                                <Image
                                    src={book.imgsrc && book.imgsrc.startsWith('http') ? book.imgsrc : '/file.svg'}
                                    alt={book.title}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 33vw, 16vw"
                                />
                            </div>
                            <h4 className="font-extrabold text-[11px] text-gray-900 tracking-tight line-clamp-1 mb-0.5">{book.title}</h4>
                            <p className="text-[8.5px] text-gray-400 font-bold tracking-tight mb-1 truncate">{book.author}</p>
                        </div>
                        <div className="flex items-center gap-0.5 text-[#16A34A] mt-1.5">
                            <Star size={9} fill="currentColor" />
                            <span className="text-[10px] font-black">{book.rating || 4.8}</span>
                            <span className="text-[10px] font-bold text-gray-400">({book.reviewsCount || 120})</span>
                        </div>
                    </div>
                )) : (
                    <p className="col-span-full text-center py-20 text-gray-400 font-bold">해당 추천 도서가 아직 없습니다.</p>
                )}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8 animate-in fade-in">
            {books.length > 0 ? books.map((book) => (
                <div key={book.id} className="group cursor-pointer" onClick={() => onSelectBook(book)}>
                    <div className="aspect-[3/4.2] rounded-[2rem] overflow-hidden bg-white shadow-sm border border-gray-100 mb-5 relative transition-all duration-500 group-hover:shadow-2xl group-hover:-translate-y-2">
                        <Image
                            src={book.imgsrc && book.imgsrc.startsWith('http') ? book.imgsrc : '/file.svg'}
                            alt={book.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-700"
                            sizes="(max-width: 768px) 50vw, 25vw"
                        />
                    </div>
                    <h3 className="font-black text-gray-800 group-hover:text-green-600 transition-colors line-clamp-1 text-base">{book.title}</h3>
                    <p className="text-gray-400 mt-1 text-sm">{book.author}</p>
                </div>
            )) : (
                <p className="col-span-full text-center py-20 text-gray-400 font-bold">해당 추천 도서가 아직 없습니다.</p>
            )}
        </div>
    );
}
