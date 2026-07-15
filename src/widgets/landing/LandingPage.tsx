"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useLoginModal } from "@features/auth/LoginModalContext";
import { 
  Sparkles, 
  BookOpen, 
  LineChart, 
  MessageSquare, 
  Check, 
  CheckCircle2, 
  ArrowRight, 
  Star,
  Award,
  ChevronRight,
  TrendingUp,
  BrainCircuit,
  MessageCircle,
  Library
} from "lucide-react";

// CSS-based Mockup component
const MobileMockup = ({ src, alt, className = "" }: { src: string, alt: string, className?: string }) => (
  <div className={`relative mx-auto border-slate-900 bg-slate-900 border-[10px] sm:border-[12px] rounded-[2.5rem] sm:rounded-[3rem] h-[480px] sm:h-[580px] w-[230px] sm:w-[280px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] transition-all duration-700 hover:scale-[1.03] hover:shadow-[0_30px_60px_-10px_rgba(1,197,79,0.15)] group ${className}`}>
    {/* Dynamic Island / Speaker */}
    <div className="absolute top-0 left-1/2 -translate-x-1/2 h-4 sm:h-5 w-24 sm:w-28 bg-slate-900 rounded-b-2xl z-30 flex items-center justify-center">
      <div className="w-10 sm:w-12 h-1 bg-gray-800 rounded-full mb-1" />
    </div>
    
    {/* Screen Content Wrapper */}
    <div className="rounded-[1.8rem] sm:rounded-[2.2rem] overflow-hidden w-full h-full bg-[#F8F9FA] relative z-10 border border-slate-800/10">
      <Image 
        src={src} 
        alt={alt} 
        fill 
        className="object-cover object-top"
        sizes="(max-width: 640px) 230px, 280px"
        priority
      />
    </div>
    
    {/* Glossy overlay effect */}
    <div className="absolute inset-0 rounded-[2.2rem] sm:rounded-[2.8rem] bg-gradient-to-tr from-white/0 via-white/5 to-white/10 pointer-events-none z-20" />
  </div>
);

export default function LandingPage() {
  const { openLoginModal } = useLoginModal();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#1A1A1A] font-sans antialiased overflow-x-hidden">
      {/* ------------------ Header ------------------ */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrollY > 20 
          ? "bg-white/80 backdrop-blur-md shadow-[0_1px_12px_rgba(0,0,0,0.05)] border-b border-gray-100/50 py-3 sm:py-4" 
          : "bg-transparent py-5 sm:py-6"
      }`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="relative w-8 h-8 sm:w-9 sm:h-9 bg-white border border-gray-100 rounded-xl p-1.5 flex items-center justify-center shadow-sm">
              <div className="relative w-full h-full">
                <Image
                  src="/images/logo_transparent_v2.png"
                  alt="Book,ok Logo"
                  fill
                  className="object-contain"
                  sizes="36px"
                />
              </div>
            </div>
            <span className="text-xl sm:text-2xl font-black text-[#101828] tracking-tight">BookOk</span>
          </div>

          {/* Simple Navigation Menu */}
          <nav className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollToSection("features")} className="text-sm font-bold text-gray-500 hover:text-[#01C54F] transition-colors cursor-pointer">서비스 특징</button>
            <button onClick={() => scrollToSection("details")} className="text-sm font-bold text-gray-500 hover:text-[#01C54F] transition-colors cursor-pointer">상세 기능</button>
            <button onClick={() => scrollToSection("comparison")} className="text-sm font-bold text-gray-500 hover:text-[#01C54F] transition-colors cursor-pointer">서비스 비교</button>
            <button onClick={() => scrollToSection("offer")} className="text-sm font-bold text-gray-500 hover:text-[#01C54F] transition-colors cursor-pointer">특별 혜택</button>
          </nav>

          {/* Start CTA */}
          <div className="flex items-center gap-3">
            <button 
              onClick={openLoginModal} 
              className="px-5 py-2.5 rounded-full bg-[#01C54F] text-white font-bold text-sm hover:bg-[#00b046] transition-all hover:scale-105 shadow-md shadow-[#01C54F]/20 cursor-pointer"
            >
              시작하기
            </button>
          </div>
        </div>
      </header>

      {/* ------------------ Hero Section ------------------ */}
      <section id="home" className="relative pt-32 sm:pt-40 pb-20 sm:pb-32 overflow-hidden flex items-center">
        {/* Glow effect blobs */}
        <div className="absolute top-[-100px] right-[-100px] w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] bg-[#01C54F]/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-100px] left-[-100px] w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-yellow-200/20 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 w-full grid lg:grid-cols-12 gap-16 items-center">
          {/* Hero Content */}
          <div className="lg:col-span-7 text-center lg:text-left space-y-6 sm:space-y-8 relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#01C54F]/10 rounded-full text-xs sm:text-sm font-bold text-[#01C54F] animate-in fade-in slide-in-from-bottom-4 duration-700">
              <span className="w-2 h-2 rounded-full bg-[#01C54F] animate-pulse" />
              아동 맞춤 AI 독서 교육 플랫폼
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-gray-900 leading-[1.2] sm:leading-[1.15] tracking-tight break-keep">
              우리 아이 평생 문해력,<br />
              <span className="text-[#01C54F]">AI 맞춤 독서 플랫폼</span>으로<br className="hidden sm:block" />
              똑똑하게 길러주세요.
            </h1>

            <p className="text-base sm:text-lg lg:text-xl text-gray-500 font-medium leading-relaxed max-w-xl mx-auto lg:mx-0 break-keep">
              도서관 사서가 추천하는 엄선 필독서부터 AI 독서 성향 진단 리포트, 24시간 실시간 대화형 AI 사서까지. 광고나 획일적인 강요 없이 아이 성장에 꼭 맞춘 독서 처방을 제안합니다.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
              <button
                onClick={() => scrollToSection("offer")}
                className="px-8 py-4 bg-[#01C54F] text-white rounded-full font-bold text-base sm:text-lg hover:bg-[#00b046] transition-all hover:scale-105 shadow-lg shadow-[#01C54F]/30 flex items-center justify-center gap-2 group cursor-pointer"
              >
                6개월 무료 혜택 받기
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => scrollToSection("features")}
                className="px-8 py-4 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-full font-bold text-base sm:text-lg transition-all hover:scale-105 flex items-center justify-center cursor-pointer"
              >
                서비스 더 알아보기
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-4 pt-8 sm:pt-12 border-t border-gray-100 max-w-lg mx-auto lg:mx-0">
              <div>
                <div className="text-xl sm:text-2xl font-black text-gray-900">98%</div>
                <div className="text-xs font-bold text-gray-400 mt-1">AI 추천 만족도</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-gray-900">10,000+</div>
                <div className="text-xs font-bold text-gray-400 mt-1">사서 추천 도서</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-gray-900">24/7</div>
                <div className="text-xs font-bold text-gray-400 mt-1">실시간 AI 사서</div>
              </div>
            </div>
          </div>

          {/* Hero Visual Mockup */}
          <div className="lg:col-span-5 relative flex justify-center items-center mt-10 lg:mt-0">
            {/* Overlapping Mockups */}
            <div className="relative w-full max-w-[340px] sm:max-w-[420px] aspect-[4/5] flex justify-center items-center">
              
              {/* Back Mockup (AI Librarian) */}
              <div className="absolute left-[-20px] sm:left-[-40px] top-[40px] rotate-[-8deg] opacity-75 scale-90 z-10 transition-all duration-500 hover:rotate-[-4deg] hover:opacity-100">
                <MobileMockup src="/images/ai_librarian.png" alt="BookOk AI Librarian Screen" />
              </div>

              {/* Front Mockup (Home Screen) */}
              <div className="absolute right-[-10px] sm:right-[-20px] top-0 rotate-[6deg] z-20 transition-all duration-500 hover:rotate-[3deg]">
                <MobileMockup src="/images/home_screen.png" alt="BookOk Home Screen Curation" />
              </div>

              {/* Floating Badges */}
              <div className="absolute left-[-40px] bottom-[80px] bg-white border border-gray-100 p-3 sm:p-4 rounded-2xl shadow-xl z-30 flex items-center gap-3 animate-bounce duration-[3000ms] pointer-events-none">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-lg">💡</div>
                <div>
                  <div className="text-[10px] sm:text-xs font-black text-emerald-600">AI 맞춤 분석</div>
                  <div className="text-[11px] sm:text-sm font-black text-gray-900">문해력 성장 추적</div>
                </div>
              </div>

              <div className="absolute right-[-30px] bottom-[160px] bg-white border border-gray-100 p-3 sm:p-4 rounded-2xl shadow-xl z-30 flex items-center gap-3 animate-pulse pointer-events-none">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-lg">👑</div>
                <div>
                  <div className="text-[10px] sm:text-xs font-black text-yellow-600">사서 추천</div>
                  <div className="text-[11px] sm:text-sm font-black text-gray-900">안심 추천 도서</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------ Core Value Proposition (Intro) ------------------ */}
      <section id="features" className="py-20 sm:py-28 bg-gray-50/50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto space-y-4 mb-16 sm:mb-24">
            <h2 className="text-xs font-black text-[#01C54F] uppercase tracking-[0.2em]">BookOk Core Value</h2>
            <h3 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight break-keep">
              기존의 일방적인 독서 서비스와<br />북콕(BookOk)은 어떻게 다를까요?
            </h3>
            <p className="text-sm sm:text-base text-gray-500 font-medium leading-relaxed break-keep">
              교육의 핵심은 아이의 성향에 깊이 공감하는 큐레이션입니다. 북콕은 데이터와 전문가 엄선을 통해 아이가 스스로 책을 읽게 만드는 건강한 여정을 설계합니다.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 sm:gap-12">
            {/* Value Card 1 */}
            <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] border border-gray-150/40 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_15px_30px_rgba(1,197,79,0.06)] hover:border-[#01C54F]/20 transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#01C54F] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Library size={24} />
                </div>
                <h4 className="text-lg sm:text-xl font-black text-gray-900 mb-3">교육 전문가 및 사서 큐레이션</h4>
                <p className="text-gray-400 text-xs sm:text-sm leading-relaxed font-medium mb-6 break-keep">
                  광고 목적의 편향된 도서 노출에서 벗어나, 도서관 사서들의 추천 목록과 문학상 수상작 위주의 공신력 높은 도서 정보를 추천합니다.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-emerald-600">
                <span>신뢰 가치 우선</span>
                <Check size={16} />
              </div>
            </div>

            {/* Value Card 2 */}
            <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] border border-gray-150/40 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_15px_30px_rgba(1,197,79,0.06)] hover:border-[#01C54F]/20 transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-green-50 text-[#01C54F] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <BrainCircuit size={24} />
                </div>
                <h4 className="text-lg sm:text-xl font-black text-gray-900 mb-3">개인 맞춤 성향 진단</h4>
                <p className="text-gray-400 text-xs sm:text-sm leading-relaxed font-medium mb-6 break-keep">
                  아이의 연령, 읽은 도서 장르, 흥미 관심 등을 정교하게 수집하여, 독서 편식을 예방하고 문해력 확장을 위한 독자적인 독서 성향 로드맵을 수립합니다.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-emerald-600">
                <span>데이터 기반 추천</span>
                <Check size={16} />
              </div>
            </div>

            {/* Value Card 3 */}
            <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] border border-gray-150/40 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_15px_30px_rgba(1,197,79,0.06)] hover:border-[#01C54F]/20 transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-yellow-50 text-yellow-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <MessageCircle size={24} />
                </div>
                <h4 className="text-lg sm:text-xl font-black text-gray-900 mb-3">실시간 대화식 AI 사서</h4>
                <p className="text-gray-400 text-xs sm:text-sm leading-relaxed font-medium mb-6 break-keep">
                  일방적으로 주어진 도서 목록 대신, 아이가 관심사나 오늘 있었던 일에 대해 대화하면 그 기분과 호기심에 어울리는 최적의 도서를 스마트하게 찾아줍니다.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-emerald-600">
                <span>상호작용 맞춤 관리</span>
                <Check size={16} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------ Detail Features (Showcases) ------------------ */}
      <section id="details" className="py-20 sm:py-32 space-y-24 sm:space-y-36">
        
        {/* Showcase 1 */}
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-12 sm:gap-16 items-center">
          <div className="lg:col-span-5 flex justify-center order-last lg:order-first">
            <MobileMockup src="/images/home_screen.png" alt="Expert Curation Screen" />
          </div>
          <div className="lg:col-span-7 space-y-6 sm:space-y-8 text-center lg:text-left">
            <div className="inline-block px-3 py-1.5 bg-emerald-50 text-[#01C54F] rounded-full text-xs font-black">CURATION</div>
            <h3 className="text-2xl sm:text-4xl font-black text-gray-900 leading-tight break-keep">
              전문가와 사서가 검증한<br />광고 없는 청정 도서 큐레이션
            </h3>
            <p className="text-base text-gray-500 font-medium leading-relaxed max-w-xl mx-auto lg:mx-0 break-keep">
              무분별한 출판사 마케팅 도서가 아닌, 전국 도서관 사서들의 깊은 고민이 녹아든 추천 도서와 국내외 주요 어린이 아동 문학상(칼데콧상, 뉴베리상, 방정환문학상 등) 수상작들을 연령별 맞춤 추천합니다.
            </p>
            <div className="space-y-4 max-w-md mx-auto lg:mx-0">
              <div className="flex items-start gap-3 text-left">
                <CheckCircle2 className="text-[#01C54F] shrink-0 mt-0.5" size={20} />
                <p className="text-sm font-bold text-gray-700">0세부터 초등 고학년까지 맞춤형 발달 매칭</p>
              </div>
              <div className="flex items-start gap-3 text-left">
                <CheckCircle2 className="text-[#01C54F] shrink-0 mt-0.5" size={20} />
                <p className="text-sm font-bold text-gray-700">도서관 사서가 엄선한 5대 카테고리 필독 라이브러리</p>
              </div>
              <div className="flex items-start gap-3 text-left">
                <CheckCircle2 className="text-[#01C54F] shrink-0 mt-0.5" size={20} />
                <p className="text-sm font-bold text-gray-700">검증된 대표 수상작들의 수록으로 높은 텍스트 퀄리티 보장</p>
              </div>
            </div>
          </div>
        </div>

        {/* Showcase 2 */}
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-12 sm:gap-16 items-center">
          <div className="lg:col-span-7 space-y-6 sm:space-y-8 text-center lg:text-left">
            <div className="inline-block px-3 py-1.5 bg-green-50 text-[#01C54F] rounded-full text-xs font-black">AI DIAGNOSIS</div>
            <h3 className="text-2xl sm:text-4xl font-black text-gray-900 leading-tight break-keep">
              아이의 독서 기록 분석 기반<br />정밀 독서 성향 분석 리포트
            </h3>
            <p className="text-base text-gray-500 font-medium leading-relaxed max-w-xl mx-auto lg:mx-0 break-keep">
              아이가 읽은 책을 쉽고 가볍게 기록하면 AI 독서 성향 진단 시스템이 작동하여 아이의 장르적 치우침을 분석하고 부족한 독서 성향에 대한 피드백을 제공합니다.
            </p>
            <div className="space-y-4 max-w-md mx-auto lg:mx-0">
              <div className="flex items-start gap-3 text-left">
                <CheckCircle2 className="text-[#01C54F] shrink-0 mt-0.5" size={20} />
                <p className="text-sm font-bold text-gray-700">독서 편식 예방을 위한 다각도 카테고리 분포 분석</p>
              </div>
              <div className="flex items-start gap-3 text-left">
                <CheckCircle2 className="text-[#01C54F] shrink-0 mt-0.5" size={20} />
                <p className="text-sm font-bold text-gray-700">연령 평균 대조 분석을 통한 올바른 읽기 속도 진단</p>
              </div>
              <div className="flex items-start gap-3 text-left">
                <CheckCircle2 className="text-[#01C54F] shrink-0 mt-0.5" size={20} />
                <p className="text-sm font-bold text-gray-700">자녀의 문해력 발달을 도울 수 있는 학부모 전용 지도 가이드</p>
              </div>
            </div>
            <div className="pt-2">
              <p className="text-[11px] sm:text-xs text-gray-400 font-bold bg-gray-50 py-2.5 px-4 rounded-xl inline-block border border-gray-100">
                💡 <span className="text-[#01C54F]">알림:</span> 문해력 성장을 돕는 상세 정밀 리포트는 정식 출시 이후 제공 예정입니다.
              </p>
            </div>
          </div>
          <div className="lg:col-span-5 flex justify-center">
            {/* Showcasing overlapping analysis & solution screenshots */}
            <div className="relative w-[280px] h-[580px] flex items-center justify-center">
              <div className="absolute left-[-20px] top-[20px] opacity-80 scale-95 z-10 hover:opacity-100 hover:z-30 transition-all duration-300">
                <MobileMockup src="/images/ai_analysis.png" alt="AI Analysis Screen" className="h-[460px] w-[220px]" />
              </div>
              <div className="absolute right-[-20px] bottom-[20px] z-20 hover:scale-105 transition-transform duration-300">
                <MobileMockup src="/images/ai_solution.png" alt="AI Solution Screen" className="h-[460px] w-[220px]" />
              </div>
            </div>
          </div>
        </div>

        {/* Showcase 3 */}
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-12 sm:gap-16 items-center">
          <div className="lg:col-span-5 flex justify-center order-last lg:order-first">
            <MobileMockup src="/images/ai_librarian.png" alt="AI Librarian Interaction" />
          </div>
          <div className="lg:col-span-7 space-y-6 sm:space-y-8 text-center lg:text-left">
            <div className="inline-block px-3 py-1.5 bg-yellow-50 text-yellow-600 rounded-full text-xs font-black">AI CHATBOT</div>
            <h3 className="text-2xl sm:text-4xl font-black text-gray-900 leading-tight break-keep">
              질문하고 소통하며 찾아가는<br />아이 맞춤 똑똑한 'AI 사서'
            </h3>
            <p className="text-base text-gray-500 font-medium leading-relaxed max-w-xl mx-auto lg:mx-0 break-keep">
              "공룡을 좋아하는 7살에게 적합한 책은?", "우정에 대한 깊은 생각을 가르치는 그림책은?" AI 사서에게 자유롭게 말해보세요. 방대한 DB에서 엄선한 도서를 단 몇 초 만에 완벽히 매칭해 줍니다.
            </p>
            <div className="space-y-4 max-w-md mx-auto lg:mx-0">
              <div className="flex items-start gap-3 text-left">
                <CheckCircle2 className="text-[#01C54F] shrink-0 mt-0.5" size={20} />
                <p className="text-sm font-bold text-gray-700">대화 맥락 이해를 통한 자녀 취향별 초개인화 도서 검색</p>
              </div>
              <div className="flex items-start gap-3 text-left">
                <CheckCircle2 className="text-[#01C54F] shrink-0 mt-0.5" size={20} />
                <p className="text-sm font-bold text-gray-700">각 추천 도서에 대한 명확한 사유와 연관 팁 안내</p>
              </div>
              <div className="flex items-start gap-3 text-left">
                <CheckCircle2 className="text-[#01C54F] shrink-0 mt-0.5" size={20} />
                <p className="text-sm font-bold text-gray-700">학부모의 독서 지도 고민을 함께 나누는 실시간 질답 기능</p>
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* ------------------ Comparison Section ------------------ */}
      <section id="comparison" className="py-20 sm:py-28 bg-gray-50/50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
            <h2 className="text-xs font-black text-[#01C54F] uppercase tracking-[0.2em]">Service Comparison</h2>
            <h3 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight break-keep">
              도서 교육 서비스 비교분석
            </h3>
            <p className="text-sm sm:text-base text-gray-500 font-medium leading-relaxed break-keep">
              기존 도서 서비스나 획일화된 학습지와 비교해 보세요. 북콕은 비용 부담은 최소화하고 교육 효과는 극대화했습니다.
            </p>
          </div>

          <div className="overflow-x-auto rounded-[2.5rem] border border-gray-150/40 bg-white shadow-xl max-w-5xl mx-auto">
            <table className="w-full min-w-[700px] border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="py-6 px-8 text-sm font-black text-gray-400">구분</th>
                  <th className="py-6 px-8 text-sm font-black text-[#01C54F] bg-[#01C54F]/5 border-x border-[#01C54F]/10">북콕 (BookOk)</th>
                  <th className="py-6 px-8 text-sm font-black text-gray-600">일반 도서 서비스</th>
                  <th className="py-6 px-8 text-sm font-black text-gray-600">학습지 및 독서 토론</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm font-bold text-gray-700">
                {/* Row 1 */}
                <tr>
                  <td className="py-6 px-8 text-gray-400 font-bold">추천 방식</td>
                  <td className="py-6 px-8 bg-[#01C54F]/5 border-x border-[#01C54F]/10 text-gray-900 font-extrabold flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#01C54F]" />
                    AI 분석 + 전문가 엄선 맞춤
                  </td>
                  <td className="py-6 px-8 font-medium text-gray-500">인기/베스트셀러 획일화 추천</td>
                  <td className="py-6 px-8 font-medium text-gray-500">정해진 커리큘럼별 강제 노출</td>
                </tr>
                {/* Row 2 */}
                <tr>
                  <td className="py-6 px-8 text-gray-400 font-bold">독서 진단</td>
                  <td className="py-6 px-8 bg-[#01C54F]/5 border-x border-[#01C54F]/10 text-gray-900 font-extrabold">
                    독서기록 자동 데이터 성향 진단
                  </td>
                  <td className="py-6 px-8 font-medium text-gray-500">단순 수치 통계 (독서량 위주)</td>
                  <td className="py-6 px-8 font-medium text-gray-500">지필 수동 채점 및 일회성 검사</td>
                </tr>
                {/* Row 3 */}
                <tr>
                  <td className="py-6 px-8 text-gray-400 font-bold">실시간 상담</td>
                  <td className="py-6 px-8 bg-[#01C54F]/5 border-x border-[#01C54F]/10 text-gray-900 font-extrabold">
                    24시간 즉시 질답형 AI 사서
                  </td>
                  <td className="py-6 px-8 font-medium text-gray-500">상담 및 대화형 지도 불가</td>
                  <td className="py-6 px-8 font-medium text-gray-500">월 1~2회 방문 지도사 직접 상담</td>
                </tr>
                {/* Row 4 */}
                <tr>
                  <td className="py-6 px-8 text-gray-400 font-bold">요금 비교</td>
                  <td className="py-6 px-8 bg-[#01C54F]/5 border-x border-[#01C54F]/10 text-gray-900 font-extrabold text-lg">
                    <span className="text-[#01C54F]">첫 6개월 무료</span>
                    <span className="text-xs text-gray-400 font-medium block mt-1">(이후 월 9,900원 예정)</span>
                  </td>
                  <td className="py-6 px-8 font-medium text-gray-500">월 15,000원 ~ 20,000원</td>
                  <td className="py-6 px-8 font-medium text-gray-500">월 80,000원 ~ 150,000원<br/><span className="text-[10px] text-red-400">(장기 약정 위약금 존재)</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ------------------ CTA / Offer Section ------------------ */}
      <section id="offer" className="py-20 sm:py-32 relative">
        {/* Decorative lights */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-[#01C54F]/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-4xl mx-auto px-6 relative z-10">
          <div className="bg-gradient-to-br from-[#01C54F]/10 via-white to-white border-[2px] border-[#01C54F]/20 rounded-[3.5rem] p-8 sm:p-16 shadow-2xl relative overflow-hidden text-center">
            
            {/* Background elements */}
            <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-[#01C54F]/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-[-50px] left-[-50px] w-48 h-48 bg-yellow-200/10 rounded-full blur-2xl pointer-events-none" />

            <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8">
              <span className="inline-block bg-[#01C54F]/10 text-[#01C54F] border border-[#01C54F]/20 rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-wider animate-bounce">
                🎉 특별 런칭 이벤트 혜택
              </span>
              
              <h2 className="text-2xl sm:text-4xl font-black text-gray-900 leading-tight tracking-tight break-keep">
                지금 가입해 두시면 추후 출시 예정인<br />
                <span className="text-[#01C54F]">프리미엄 멤버십 출시 즉시</span><br />
                6개월 무료 혜택을 제공해 드립니다!
              </h2>

              <p className="text-sm sm:text-base text-gray-500 font-medium leading-relaxed max-w-lg mx-auto break-keep">
                이메일 사전 가입 시 복잡한 절차 없이 등록되며, 향후 프리미엄 서비스 정식 출시 시점에 자동으로 6개월 무료 혜택이 즉시 적용됩니다. 약정이나 의무 결제는 전혀 없습니다.
              </p>

              {/* Offer highlights */}
              <div className="bg-white rounded-[2rem] border border-gray-150/40 p-6 sm:p-8 text-left space-y-4 shadow-sm max-w-lg mx-auto">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-3 mb-2">프리미엄 멤버십 핵심 구성 요소</h4>
                
                <div className="flex items-start gap-4">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#01C54F] font-bold text-xs shrink-0 flex items-center justify-center">1</div>
                  <div>
                    <h5 className="text-sm sm:text-base font-black text-gray-900">우리 아이 문해력 수준 점검조사 및 개인 맞춤 리포트</h5>
                    <p className="text-gray-400 text-[11px] sm:text-xs font-medium leading-relaxed mt-1 break-keep">아이의 어휘 발달 수준과 읽기 속도를 정교하게 비교·측정하여 보완 방향을 제시하는 오프라인 리포트를 제공합니다.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-7 h-7 rounded-lg bg-green-50 text-[#01C54F] font-bold text-xs shrink-0 flex items-center justify-center">2</div>
                  <div>
                    <h5 className="text-sm sm:text-base font-black text-gray-900">무제한 똑똑한 'AI 사서'를 포함한 프리미엄 AI 서비스 무제한 이용</h5>
                    <p className="text-gray-400 text-[11px] sm:text-xs font-medium leading-relaxed mt-1 break-keep">질문 횟수 제한 없이 AI 사서와 마음껏 대화하며 책을 추천받고, 독서 퀴즈 등 다양한 프리미엄 독서 학습 도구를 사용합니다.</p>
                  </div>
                </div>
              </div>

              {/* Conversion Button */}
              <div className="pt-4">
                <button
                  onClick={openLoginModal}
                  className="w-full sm:w-auto px-8 sm:px-12 py-5 bg-[#01C54F] text-white rounded-full font-bold text-lg sm:text-xl hover:bg-[#00b046] transition-all hover:scale-105 shadow-xl shadow-[#01C54F]/30 cursor-pointer animate-pulse"
                >
                  6개월 무료 혜택 받고 시작하기
                </button>
                <div className="text-[10px] sm:text-xs text-gray-400 font-bold mt-4 flex items-center justify-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                  신용카드 등록 없이 가입 완료 시 출시 후 자동 혜택 적용
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ------------------ Footer ------------------ */}
      <footer className="bg-gray-50 border-t border-gray-100 pt-16 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 cursor-pointer mb-6" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                <div className="relative w-6 h-6 bg-white border border-gray-100 rounded-lg p-1 flex items-center justify-center shadow-sm">
                  <div className="relative w-full h-full">
                    <Image
                      src="/images/logo_transparent_v2.png"
                      alt="BookOk Logo"
                      fill
                      className="object-contain"
                      sizes="24px"
                    />
                  </div>
                </div>
                <span className="text-lg font-black text-[#101828] tracking-tight">BookOk</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed max-w-sm mb-6 font-medium break-keep">
                AI 기반 독서 성향 분석과 연령별 맞춤 도서 추천으로 우리 아이의 올바른 평생 독서 습관을 함께 만들어갑니다.
              </p>
              <div className="flex gap-4">
                <button className="text-gray-400 hover:text-[#01C54F] text-xs font-bold transition-colors cursor-pointer">이용약관</button>
                <span className="text-gray-200 text-xs">|</span>
                <button className="text-[#01C54F] hover:underline text-xs font-black transition-colors cursor-pointer">개인정보처리방침</button>
              </div>
            </div>
            
            <div className="text-left md:text-right font-medium">
              <h4 className="text-xs font-black text-gray-300 uppercase tracking-widest mb-6">Service Information</h4>
              <ul className="space-y-3">
                <li className="text-gray-400 text-xs leading-relaxed">
                  <span className="font-bold text-gray-500">상호명:</span> 북콕 <span className="mx-2">|</span> 
                  <span className="font-bold text-gray-500">대표자:</span> 이승준 <span className="mx-2">|</span>
                  <span className="font-bold text-gray-500">도메인:</span> bookok.kr
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
            <p className="text-[10px] text-gray-300 leading-normal font-medium break-keep">
              BookOk은 아동의 건강한 독서 문화를 위해 기술을 활용합니다. 분석 결과는 AI 모델에 의해 생성되며, 
              실제 교육 전문가의 조언과 함께 참고용으로 활용하시길 권장합니다. 본 서비스는 대한민국 개인정보보호법을 준수합니다.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
