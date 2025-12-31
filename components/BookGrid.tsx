import { Book } from "../types";

interface BookGridProps {
    books: Book[];
    onSelectBook: (book: Book) => void;
}

export default function BookGrid({ books, onSelectBook }: BookGridProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8 animate-in fade-in">
            {books.length > 0 ? books.map((book) => (
                <div key={book.id} className="group cursor-pointer" onClick={() => onSelectBook(book)}>
                    <div className="aspect-[3/4.2] rounded-[2rem] overflow-hidden bg-white shadow-sm border border-gray-100 mb-5 relative transition-all duration-500 group-hover:shadow-2xl group-hover:-translate-y-2">
                        <img
                            src={book.imgsrc}
                            alt={book.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                    </div>
                    <h3 className="font-black text-gray-800 group-hover:text-green-600 transition-colors line-clamp-1">{book.title}</h3>
                    <p className="text-sm text-gray-400 mt-1">{book.author}</p>
                </div>
            )) : (
                <p className="col-span-full text-center py-20 text-gray-400 font-bold">해당 추천 도서가 아직 없습니다.</p>
            )}
        </div>
    );
}
