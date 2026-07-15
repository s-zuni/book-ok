"use client";

import Image from "next/image";
import { useLoginModal } from "@features/auth/LoginModalContext";
import { useAuth } from "@features/auth/AuthContext";
import { useRouter } from "next/navigation";
import { 
  Sparkles, 
  BookOpen, 
  LineChart, 
  MessageSquare, 
  Check, 
  CheckCircle2, 
  ArrowRight,
  Library,
  BrainCircuit,
  MessageCircle
} from "lucide-react";

// Smaller CSS-based Mockup component for intro card container
const IntroMobileMockup = ({ src, alt }: { src: string, alt: string }) => (
  <div className="relative mx-auto border-slate-900 bg-slate-900 border-[8px] rounded-[2rem] h-[380px] w-[180px] shadow-[0_15px_30px_rgba(0,0,0,0.1)] transition-transform duration-500 hover:scale-[1.03] group shrink-0">
    {/* Dynamic Island / Speaker */}
    <div className="absolute top-0 left-1/2 -translate-x-1/2 h-3.5 w-16 bg-slate-900 rounded-b-xl z-30 flex items-center justify-center">
      <div className="w-8 h-0.5 bg-gray-800 rounded-full mb-0.5" />
    </div>
    
    {/* Screen Content Wrapper */}
    <div className="rounded-[1.4rem] overflow-hidden w-full h-full bg-[#F8F9FA] relative z-10 border border-slate-800/10">
      <Image 
        src={src} 
        alt={alt} 
        fill 
        className="object-cover object-top"
        sizes="180px"
      />
    </div>
    
    {/* Glossy overlay effect */}
    <div className="absolute inset-0 rounded-[1.8rem] bg-gradient-to-tr from-white/0 via-white/5 to-white/10 pointer-events-none z-20" />
  </div>
);

export default function ServiceIntro() {
  const { openLoginModal } = useLoginModal();
  const { user } = useAuth();
  const router = useRouter();

  const handleCTA = () => {
    if (user) {
      router.push("/");
    } else {
      openLoginModal();
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-20">
      
      {/* ------------------ Header ------------------ */}
      <header className="text-center lg:text-left">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#01C54F]/10 rounded-full text-xs font-black text-[#01C54F] mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-[#01C54F]" />
          BookOk 서비스 소개
        </div>
        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900 mb-6 leading-tight break-keep">
          지속 가능한 독서 습관,<br />
          <span className="text-[#01C54F]">북콕 (BookOk)</span>이 완성합니다
        </h2>
        <div className="h-1 w-16 bg-[#01C54F] rounded-full mb-6 mx-auto lg:mx-0" />
        <p className="text-base sm:text-lg text-gray-500 font-medium leading-relaxed break-keep">
          북콕은 단순한 도서 추천을 넘어, 데이터 분석과 실시간 AI 피드백을 통해 우리 아이가 책과 친해지는 최적의 로드맵을 제안하는 프리미엄 교육 큐레이션 플랫폼입니다.
        </p>
      </header>

      {/* ------------------ Core Features Grid ------------------ */}
      <section className="space-y-8">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-3">
          <div className="w-6 h-px bg-gray-200" />
          핵심 서비스 가치
        </h3>
        
        <div className="grid grid-cols-1 gap-6">
          {/* Feature 1 */}
          <div className="flex flex-col md:flex-row gap-6 p-6 sm:p-8 rounded-3xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-300 items-center">
            <div className="shrink-0">
              <IntroMobileMockup src="/images/home_screen.png" alt="Curated Book List" />
            </div>
            <div className="flex-1 text-center md:text-left space-y-3">
              <div className="inline-block px-2.5 py-1 bg-emerald-50 text-[#01C54F] rounded-full text-xs font-black">전문 큐레이션</div>
              <h4 className="text-lg sm:text-xl font-bold text-gray-900">도서관 사서 및 문학상 수상작 매칭</h4>
              <p className="text-gray-500 font-medium leading-relaxed text-sm break-keep">
                공신력 있는 전국 도서관 사서들의 연도별 추천도서 목록과 세계 3대 그림책 문학상 수상작을 엄선하여 광고 없이 자녀의 수준에 맞추어 유기적으로 제안합니다.
              </p>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start pt-1 text-xs text-gray-400 font-bold">
                <span>✓ 검증된 필독 도서</span>
                <span>✓ 광고 배제 큐레이션</span>
                <span>✓ 연령별 맞춤 추천</span>
              </div>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="flex flex-col md:flex-row gap-6 p-6 sm:p-8 rounded-3xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-300 items-center">
            <div className="shrink-0 order-last md:order-first">
              <div className="relative w-[180px] h-[380px] flex items-center justify-center">
                <div className="absolute left-[-10px] top-[10px] scale-95 opacity-80 z-10">
                  <IntroMobileMockup src="/images/ai_analysis.png" alt="AI analysis screen" />
                </div>
                <div className="absolute right-[-10px] bottom-[10px] z-20">
                  <IntroMobileMockup src="/images/ai_solution.png" alt="AI solution screen" />
                </div>
              </div>
            </div>
            <div className="flex-1 text-center md:text-left space-y-3">
              <div className="inline-block px-2.5 py-1 bg-green-50 text-[#01C54F] rounded-full text-xs font-black">AI 성향 진단</div>
              <h4 className="text-lg sm:text-xl font-bold text-gray-900">기록 분석 기반 맞춤형 독서 분석</h4>
              <p className="text-gray-500 font-medium leading-relaxed text-sm break-keep">
                자녀의 독서 이력을 분석하여 관심사 카테고리 비중, 이해 속도, 편식 여부를 정밀 진단합니다. 독서 유형을 정의하고 보완이 필요한 영역에 대한 처방도 함께 설계합니다.
              </p>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start pt-1 text-xs text-gray-400 font-bold">
                <span>✓ 독서 편식 예방</span>
                <span>✓ 장르 밸런싱 피드백</span>
                <span>✓ 자녀 성향 리포트</span>
              </div>
              <p className="text-[10px] text-gray-400 font-semibold block pt-1">
                ※ 정밀 리포트 및 상세 진단 리포트는 정식 출시 이후 제공 예정입니다.
              </p>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="flex flex-col md:flex-row gap-6 p-6 sm:p-8 rounded-3xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-300 items-center">
            <div className="shrink-0">
              <IntroMobileMockup src="/images/ai_librarian.png" alt="AI chatbot conversation" />
            </div>
            <div className="flex-1 text-center md:text-left space-y-3">
              <div className="inline-block px-2.5 py-1 bg-yellow-50 text-yellow-600 rounded-full text-xs font-black">지능형 챗봇</div>
              <h4 className="text-lg sm:text-xl font-bold text-gray-900">24시간 소통하는 똑똑한 'AI 사서'</h4>
              <p className="text-gray-500 font-medium leading-relaxed text-sm break-keep">
                아이가 관심 있거나 궁금한 것에 대해 실시간 대화를 통해 그에 알맞은 검증 도서를 즉각 매칭해 줍니다. 부모님의 독서 교육 고민에 대한 유용한 가이드도 실시간으로 제공합니다.
              </p>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start pt-1 text-xs text-gray-400 font-bold">
                <span>✓ 실시간 지능적 질답</span>
                <span>✓ 친근한 대화형 흥미 유도</span>
                <span>✓ 24시간 실시간 맞춤 상담</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------ Comparison Table ------------------ */}
      <section className="space-y-8">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-3">
          <div className="w-6 h-px bg-gray-200" />
          교육 서비스 비교
        </h3>
        
        <div className="overflow-x-auto rounded-3xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full min-w-[600px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="py-4 px-6 text-xs font-black text-gray-400">구분</th>
                <th className="py-4 px-6 text-xs font-black text-[#01C54F] bg-[#01C54F]/5 border-x border-[#01C54F]/10">북콕 (BookOk)</th>
                <th className="py-4 px-6 text-xs font-black text-gray-600">일반 도서 서비스</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-bold text-gray-700">
              <tr>
                <td className="py-4 px-6 text-gray-400 text-xs">추천 기준</td>
                <td className="py-4 px-6 bg-[#01C54F]/5 border-x border-[#01C54F]/10 text-gray-900">AI 독서 데이터 + 도서관 사서 추천</td>
                <td className="py-4 px-6 font-medium text-gray-500">인기 도서 위주의 획일화 목록</td>
              </tr>
              <tr>
                <td className="py-4 px-6 text-gray-400 text-xs">독서 진단</td>
                <td className="py-4 px-6 bg-[#01C54F]/5 border-x border-[#01C54F]/10 text-gray-900">독서 기록 연동 성향 분석 리포트</td>
                <td className="py-4 px-6 font-medium text-gray-500">단순 양적 독서량 통계</td>
              </tr>
              <tr>
                <td className="py-4 px-6 text-gray-400 text-xs">소통 상담</td>
                <td className="py-4 px-6 bg-[#01C54F]/5 border-x border-[#01C54F]/10 text-gray-900">24/7 실시간 대화식 AI 사서</td>
                <td className="py-4 px-6 font-medium text-gray-500">대화 및 피드백 불가능</td>
              </tr>
              <tr>
                <td className="py-4 px-6 text-gray-400 text-xs">런칭 혜택</td>
                <td className="py-4 px-6 bg-[#01C54F]/5 border-x border-[#01C54F]/10 text-[#01C54F]">첫 6개월 프리미엄 무료 혜택</td>
                <td className="py-4 px-6 font-medium text-gray-500">일반 유료 월 정액제</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ------------------ Special Launch Event Box ------------------ */}
      <section className="bg-gradient-to-br from-[#01C54F]/10 via-white to-white border border-[#01C54F]/20 rounded-3xl p-8 text-center space-y-6 shadow-sm">
        <div className="space-y-2">
          <span className="inline-block bg-[#01C54F]/10 text-[#01C54F] rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider">
            런칭 이벤트 진행 중
          </span>
          <h4 className="text-xl sm:text-2xl font-black text-gray-900">
            신규 가입 시 프리미엄 멤버십 6개월 무료 이용!
          </h4>
          <p className="text-xs sm:text-sm text-gray-500 font-medium break-keep max-w-lg mx-auto">
            정밀 문해력 분석 리포트 및 스마트 AI 사서 무제한 질문 이용권이 포함된 프리미엄 서비스를 출시되는 즉시 6개월간 비용 없이 체험해 보실 수 있도록 등록해 드립니다.
          </p>
        </div>
        
        <button
          onClick={handleCTA}
          className="px-8 py-3.5 bg-[#01C54F] text-white rounded-full font-bold text-sm hover:bg-[#00b046] transition-all hover:scale-105 shadow-md shadow-[#01C54F]/20 flex items-center justify-center gap-2 mx-auto cursor-pointer"
        >
          {user ? "맞춤 추천 받으러 가기" : "6개월 무료 혜택 받고 가입하기"}
          <ArrowRight size={16} />
        </button>
      </section>

    </div>
  );
}
