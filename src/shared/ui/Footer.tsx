import Link from "next/link";

const Footer = () => {
  return (
    <footer className="bg-gray-50 border-t border-gray-100 pt-16 pb-32 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
          <div>
            <Link href="/" className="inline-block">
              <h3 className="text-xl font-black text-[#2E5A44] mb-6 hover:opacity-80 transition-opacity">Book,ok</h3>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed max-w-sm mb-6">
              AI 기반 독서 성향 분석과 연령별 맞춤 도서 추천으로<br />
              우리 아이의 올바른 독서 습관을 함께 만들어갑니다.
            </p>
            <div className="flex gap-4">
              <Link href="/terms" className="text-gray-400 hover:text-[#2E5A44] text-xs font-bold transition-colors">이용약관</Link>
              <span className="text-gray-200 text-xs">|</span>
              <Link href="/privacy" className="text-[#2E5A44] hover:underline text-xs font-black transition-colors">개인정보처리방침</Link>
            </div>
          </div>
          
          <div className="text-left md:text-right">
            <h4 className="text-xs font-black text-gray-300 uppercase tracking-widest mb-6">Service Information</h4>
            <ul className="space-y-3">
              <li className="text-gray-400 text-xs leading-relaxed">
                <span className="font-bold text-gray-500">상호명:</span> 북콕 <span className="mx-2">|</span> 
                <span className="font-bold text-gray-500">대표자:</span> 이승준
              </li>
              <li className="text-gray-400 text-xs leading-relaxed">
                <span className="font-bold text-gray-500">외부 API 연동:</span> Aladin, OpenAI, Gemini
              </li>
              <li className="text-gray-400 text-xs leading-relaxed">
                <span className="font-bold text-gray-500">문의:</span> axw0208@gmail.com
              </li>
              <li className="text-gray-400 text-xs leading-relaxed">
                © {new Date().getFullYear()} 북콕. All rights reserved.
              </li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-gray-100">
          <p className="text-[10px] text-gray-300 leading-tight">
            Bookok은 아동의 건강한 독서 문화를 위해 기술을 활용합니다. 분석 결과는 AI 모델에 의해 생성되며, 
            실제 교육 전문가의 조언과 함께 참고용으로 활용하시길 권장합니다. 본 서비스는 대한민국 개인정보보호법을 준수합니다.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
