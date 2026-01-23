import { Book } from "../types";
import Image from "next/image";
import { Printer, XCircle, RefreshCw, ShoppingBag } from "lucide-react";

interface BookListProps {
    books: Book[];
    onSelectBook: (book: Book) => void;
}

export default function BookList({ books, onSelectBook }: BookListProps) {
    if (books.length === 0) {
        return <p className="text-center py-20 text-gray-400 font-bold">검색 결과가 없습니다.</p>;
    }

    return (
        <div className="flex flex-col gap-4 md:gap-6">
            {books.map((book, index) => (
                <div key={book.id} className="flex gap-4 md:gap-6 p-4 md:p-6 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow relative">
                    <div className="w-[8px] h-[8px] bg-gray-300 rounded-full absolute top-8 left-[-20px] hidden md:block" />

                    {/* Image Section */}
                    <div className="shrink-0 w-24 sm:w-28 md:w-40 aspect-[3/4.2] relative bg-gray-50 border border-gray-200 rounded-lg overflow-hidden cursor-pointer" onClick={() => onSelectBook(book)}>
                        {book.category !== '미분류' && (
                            <div className="absolute top-0 left-2 w-8 h-10 bg-green-600 text-white text-[10px] font-bold flex items-center justify-center rounded-b-lg shadow-lg z-10">
                                {book.category.substring(0, 2)}
                            </div>
                        )}
                        <Image
                            src={book.imgsrc && book.imgsrc.startsWith('http') ? book.imgsrc : '/file.svg'}
                            alt={book.title}
                            fill
                            className="object-cover hover:scale-105 transition-transform duration-500"
                            sizes="(max-width: 768px) 96px, 160px"
                        />
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 min-w-0 py-1 flex flex-col justify-between">
                        <div>
                            <div className="flex items-start gap-2 md:gap-3 mb-1 md:mb-2">
                                <span className="border border-gray-300 text-gray-500 text-[10px] px-2 py-0.5 rounded uppercase tracking-tighter shrink-0 mt-0.5">도서</span>
                                <h3
                                    className="font-black text-lg md:text-xl text-blue-900 leading-tight cursor-pointer hover:underline decoration-2 underline-offset-4 line-clamp-2 md:line-clamp-1"
                                    onClick={() => onSelectBook(book)}
                                >
                                    {index + 1}. {book.title}
                                </h3>
                            </div>

                            <div className="text-xs md:text-sm text-gray-600 font-medium mb-2 md:mb-3 leading-relaxed">
                                <span className="text-gray-500 mr-2">저자 :</span>{book.author} <span className="text-gray-300 mx-2">|</span>
                                <span className="text-gray-500 mr-2">발행년도 :</span>{book.pubDate?.substring(0, 4) || '2025'}
                            </div>

                            <div className="flex flex-wrap items-center gap-y-1 text-xs md:text-sm text-gray-600 mb-3 md:mb-4">
                                <span className="mr-3 md:mr-4 text-gray-400">ISBN: {book.bookid}</span>
                                {book.pubDate && (
                                    <>
                                        <span className="hidden md:inline text-gray-300 mx-2">|</span>
                                        <span className="mr-3 md:mr-4 text-gray-400">발급일: {book.pubDate}</span>
                                    </>
                                )}
                            </div>

                            {book.description && (
                                <div className="text-sm text-gray-500 line-clamp-2 md:line-clamp-3 leading-relaxed mb-4 max-w-2xl">
                                    {book.description}
                                </div>
                            )}
                        </div>

                        {/* Action Bar */}
                        <div className="flex flex-wrap items-center justify-end gap-4 mt-2 pt-4 border-t border-gray-100">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => onSelectBook(book)}
                                    className="flex items-center gap-1 px-5 py-2 rounded-full bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-md shadow-blue-100 transition"
                                >
                                    <ShoppingBag size={14} /> 상세 정보 보기
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
