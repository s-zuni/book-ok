import Footer from "@shared/ui/Footer";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#FDFDFD]">
      <div className="max-w-4xl mx-auto px-6 py-12 lg:py-20">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-[#2E5A44] font-bold mb-8 transition-colors group">
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          홈으로 돌아가기
        </Link>
        <h1 className="text-3xl font-black text-gray-900 mb-2">서비스 이용약관</h1>
        <p className="text-gray-400 mb-12">시행일자: 2026년 5월 11일</p>

        <div className="prose prose-slate max-w-none space-y-10">
          <section>
            <h2 className="text-xl font-bold text-[#2E5A44] mb-4">제 1 조 (목적)</h2>
            <p className="text-gray-600 leading-relaxed">
              본 약관은 '북콕'(이하 '회사')이 제공하는 독서 분석 및 추천 서비스(이하 '서비스')의 이용과 관련하여 회사와 회원 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#2E5A44] mb-4">제 2 조 (용어의 정의)</h2>
            <ul className="list-disc pl-5 mt-4 space-y-2 text-gray-600">
              <li>'회원'이라 함은 소셜 계정 연동을 통해 서비스에 가입하여 본 약관에 동의한 사용자를 말합니다.</li>
              <li>'분석 리포트'라 함은 AI 기술을 활용하여 사용자의 독서 데이터를 분석한 결과물을 말합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#2E5A44] mb-4">제 3 조 (이용계약 체결)</h2>
            <p className="text-gray-600 leading-relaxed">
              이용계약은 회원이 본 약관의 내용에 동의하고, 구글, 카카오, 애플 등 소셜 로그인 계정을 통한 가입 신청에 대하여 회사가 승낙함으로써 체결됩니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#2E5A44] mb-4">제 4 조 (서비스의 내용 및 API 활용)</h2>
            <p className="text-gray-600 leading-relaxed">
              회사는 회원에게 다음과 같은 서비스를 제공합니다.
            </p>
            <ul className="list-disc pl-5 mt-4 space-y-2 text-gray-600">
              <li>도서 검색 및 상세 정보 조회 (알라딘 API 활용)</li>
              <li>AI 독서 분석 및 성향 진단 (OpenAI, Gemini API 활용)</li>
              <li>맞춤형 도서 추천 컬렉션 제공</li>
            </ul>
            <p className="mt-4 text-sm text-gray-500">
              ※ AI 분석 결과는 해당 모델의 알고리즘에 따라 생성되며, 이는 교육적 조언이나 절대적인 지표가 아님을 인지해야 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#2E5A44] mb-4">제 5 조 (회원의 의무)</h2>
            <p className="text-gray-600 leading-relaxed">
              회원은 서비스 이용 시 다음 행위를 하여서는 안 됩니다.
            </p>
            <ul className="list-disc pl-5 mt-4 space-y-2 text-gray-600">
              <li>타인의 소셜 계정 정보를 도용하는 행위</li>
              <li>회사가 제공하는 정보를 복제, 배포 또는 상업적으로 이용하는 행위</li>
              <li>기타 서비스 운영을 방해하거나 회사의 명예를 손상시키는 행위</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#2E5A44] mb-4">제 6 조 (면책조항)</h2>
            <ul className="list-disc pl-5 mt-4 space-y-2 text-gray-600">
              <li>회사는 천재지변, 기간통신사업자의 서비스 중단 등 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 책임을 지지 않습니다.</li>
              <li>회사는 외부 API(알라딘, OpenAI, Gemini)의 오류나 일시적 중단으로 인한 결과에 대해 책임을 지지 않습니다.</li>
              <li>회원은 AI가 생성한 분석 결과를 전적으로 신뢰하기보다 전문가의 조언과 병행하여 활용해야 합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#2E5A44] mb-4">제 7 조 (준거법 및 재판관할)</h2>
            <p className="text-gray-600 leading-relaxed">
              본 약관의 해석 및 회사와 회원 간의 분쟁에 대해서는 대한민국 법령을 준거법으로 하며, 관할 법원은 민사소송법에 따릅니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#2E5A44] mb-4">제 8 조 (문의처)</h2>
            <p className="text-gray-600 leading-relaxed">
              서비스 이용과 관련한 문의사항은 아래 연락처로 연락 주시기 바랍니다.<br />
              - 상호명: 북콕<br />
              - 대표자: 이승준<br />
              - 이메일: axw0208@gmail.com
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
