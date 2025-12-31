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
        <div className="flex flex-col gap-6">
            {books.map((book, index) => (
                <div key={book.id} className="flex gap-6 p-6 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow relative">
                    <div className="w-[8px] h-[8px] bg-gray-300 rounded-full absolute top-8 left-[-20px] hidden md:block" />

                    {/* Image Section */}
                    <div className="shrink-0 w-32 md:w-40 aspect-[3/4.2] relative bg-gray-50 border border-gray-200 rounded-lg overflow-hidden cursor-pointer" onClick={() => onSelectBook(book)}>
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
                            sizes="(max-width: 768px) 128px, 160px"
                        />
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 min-w-0 py-1 flex flex-col justify-between">
                        <div>
                            <div className="flex items-start gap-3 mb-2">
                                <span className="border border-gray-300 text-gray-500 text-[10px] px-2 py-0.5 rounded uppercase tracking-tighter">도서</span>
                                <h3
                                    className="font-black text-xl text-blue-900 leading-tight cursor-pointer hover:underline decoration-2 underline-offset-4"
                                    onClick={() => onSelectBook(book)}
                                >
                                    {index + 1}. {book.title}
                                </h3>
                            </div>

                            <div className="text-sm text-gray-600 font-medium mb-3 leading-relaxed">
                                <span className="text-gray-500 mr-2">저자 :</span>{book.author} <span className="text-gray-300 mx-2">|</span>
                                <span className="text-gray-500 mr-2">발행년도 :</span>{book.pubDate?.substring(0, 4) || '2025'}
                            </div>

                            <div className="flex flex-wrap items-center gap-y-2 text-sm text-gray-600 mb-4">
                                <span className="mr-4">ISBN: {book.bookid}</span>
                                <span className="hidden md:inline text-gray-300 mx-2">|</span>
                                <span className="mr-4">청구기호: 813.8-{book.author.substring(0, 1)}78{book.title.substring(0, 1)}</span>
                                <span className="hidden md:inline text-gray-300 mx-2">|</span>
                                <span className="flex items-center gap-1 border border-gray-300 rounded px-2 py-0.5 text-xs text-gray-500 cursor-not-allowed">
                                    <Printer size={12} /> 위치출력
                                </span>
                            </div>

                            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4 inline-block md:block">
                                <span className="mr-6">도서관: 서울어린이도서관</span>
                                <span className="text-gray-300 mx-2">|</span>
                                <span>자료실: [아동]2층 열람실</span>
                            </div>
                        </div>

                        {/* Action Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-4 mt-2 pt-4 border-t border-gray-100">
                            <div className="font-bold text-gray-800">
                                대출가능<span className="text-blue-600">[비치중]</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <button className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-100 text-gray-400 text-xs font-bold cursor-not-allowed">
                                    <XCircle size={14} /> 도서예약불가
                                </button>
                                <button className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-xs font-bold hover:bg-green-200 transition">
                                    <RefreshCw size={14} /> 책두레상호대차신청
                                </button>
                                <button className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-100 text-blue-600 text-xs font-bold hover:bg-blue-200 transition">
                                    <ShoppingBag size={14} /> 관심도서담기
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
