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
              본 약관은 &apos;북콕&apos;(이하 &apos;회사&apos;)이 제공하는 독서 분석 및 추천 서비스(이하 &apos;서비스&apos;)의 이용과 관련하여 회사와 회원 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#2E5A44] mb-4">제 2 조 (용어의 정의)</h2>
            <ul className="list-disc pl-5 mt-4 space-y-2 text-gray-600">
              <li>&apos;회원&apos;이라 함은 소셜 계정 연동을 통해 서비스에 가입하여 본 약관에 동의한 사용자를 말합니다.</li>
              <li>&apos;분석 리포트&apos;라 함은 AI 기술을 활용하여 사용자의 독서 데이터를 분석한 결과물을 말합니다.</li>
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
            <h2 className="text-xl font-bold text-[#2E5A44] mb-4">제 8 조 (커뮤니티 이용 규정 및 유해 콘텐츠 무관용 정책 - EULA)</h2>
            <p className="text-gray-600 leading-relaxed">
              회원은 커뮤니티 서비스를 이용할 때 타인을 위협, 비방하는 악성 행위나 유해 콘텐츠(UGC, User-Generated Content)를 게시해서는 안 되며, 회사는 이를 예방하기 위해 강력한 무관용(No Tolerance) 원칙을 고수합니다.
            </p>
            <ul className="list-disc pl-5 mt-4 space-y-2 text-gray-600">
              <li><strong>금지되는 콘텐츠의 유형:</strong> 타인에 대한 욕설, 비방, 모욕 또는 명예훼손, 음란물 및 선정적인 이미지, 청소년 유해 매체물, 폭력적이거나 혐오감을 유발하는 내용, 불법적인 홍보 및 스팸 등</li>
              <li><strong>신고 및 즉시 차단 메커니즘:</strong> 회원은 부적절한 게시물이나 댓글에 대해 상시 신고(Flag)할 수 있으며, 불쾌한 사용자를 즉시 차단(Block)할 수 있습니다. 차단 즉시 해당 사용자의 콘텐츠는 화면에서 배제됩니다.</li>
              <li><strong>24시간 내 대응 및 이용 정지:</strong> 접수된 모든 신고는 24시간 이내에 검토되며, 위반이 확인된 유해 콘텐츠는 즉시 삭제 처리됩니다. 또한 해당 유해 콘텐츠를 게시한 회원은 예고 없이 이용 제한 및 영구 제재(추방)를 받게 됩니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#2E5A44] mb-4">제 9 조 (문의처)</h2>
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
