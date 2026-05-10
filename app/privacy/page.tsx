import Footer from "@shared/ui/Footer";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#FDFDFD]">
      <div className="max-w-4xl mx-auto px-6 py-12 lg:py-20">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-[#2E5A44] font-bold mb-8 transition-colors group">
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          홈으로 돌아가기
        </Link>
        <h1 className="text-3xl font-black text-gray-900 mb-2">개인정보 처리방침</h1>
        <p className="text-gray-400 mb-12">시행일자: 2024년 4월 16일</p>

        <div className="prose prose-slate max-w-none space-y-10">
          <section>
            <h2 className="text-xl font-bold text-[#2E5A44] mb-4">1. 개인정보의 수집 항목 및 방법</h2>
            <p className="text-gray-600 leading-relaxed">
              '북콕'(이하 '회사')은 소셜 로그인을 통한 회원가입 및 서비스 제공을 위해 아래와 같은 개인정보를 수집합니다.
            </p>
            <ul className="list-disc pl-5 mt-4 space-y-2 text-gray-600">
              <li><strong>소셜 로그인 (구글, 카카오, 애플):</strong> 이름, 이메일 주소, 프로필 이미지, 서비스 식별자(UID)</li>
              <li><strong>자녀 정보 (선택):</strong> 자녀의 별명, 연령(나이), 성별</li>
              <li><strong>서비스 이용 과정:</strong> 독서 기록, 관심 도서, AI 분석 데이터, 서비스 방문 기록, 기기 정보</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#2E5A44] mb-4">2. 개인정보의 이용 목적</h2>
            <p className="text-gray-600 leading-relaxed">
              회사는 수집한 개인정보를 다음의 목적을 위해 활용합니다.
            </p>
            <ul className="list-disc pl-5 mt-4 space-y-2 text-gray-600">
              <li>사용자 식별 및 회원 관리</li>
              <li>AI를 활용한 독서 성향 분석 및 맞춤형 도서 추천 (OpenAI, Gemini API 활용)</li>
              <li>알라딘(Aladin) API를 통한 도서 정보 제공 및 검색 기능</li>
              <li>서비스 개선 및 신규 기능 개발을 위한 통계 분석</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#2E5A44] mb-4">3. 개인정보의 제3자 제공 및 위탁</h2>
            <p className="text-gray-600 leading-relaxed">
              회사는 원활한 서비스 제공을 위해 아래와 같이 외부 전문 업체에 개인정보 처리를 위탁하고 있습니다.
            </p>
            <div className="mt-4 overflow-hidden border border-gray-100 rounded-xl">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">수탁업체</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">위탁 업무 내용</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100 text-sm">
                  <tr>
                    <td className="px-4 py-3 text-gray-700">OpenAI, Inc.</td>
                    <td className="px-4 py-3 text-gray-600">독서 성향 분석 및 리포트 생성을 위한 데이터 처리 (비식별화 데이터 권장)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-700">Google LLC (Gemini)</td>
                    <td className="px-4 py-3 text-gray-600">도서 추천 알고리즘 및 텍스트 분석 처리</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-700">알라딘 커뮤니케이션</td>
                    <td className="px-4 py-3 text-gray-600">도서 정보 검색 및 연동 서비스 제공</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#2E5A44] mb-4">4. 개인정보의 보유 및 이용기간</h2>
            <p className="text-gray-600 leading-relaxed">
              사용자의 개인정보는 원칙적으로 회원 탈퇴 시 지체 없이 파기합니다. 단, 관계법령에 의해 보존할 필요가 있는 경우 해당 법령에서 정한 기간 동안 보관합니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#2E5A44] mb-4">5. 이용자의 권리와 행사방법</h2>
            <p className="text-gray-600 leading-relaxed">
              이용자는 언제든지 자신의 개인정보를 조회하거나 수정할 수 있으며, 회원 탈퇴를 통해 개인정보 이용에 대한 동의를 철회할 수 있습니다. 자녀 정보의 경우 법정대리인(부모)이 동일한 권리를 행사할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#2E5A44] mb-4">6. 개인정보 보호책임자</h2>
            <p className="text-gray-600 leading-relaxed">
              개인정보 처리에 관한 문의사항은 아래 연락처로 연락 주시기 바랍니다.<br />
              - 담당 부서: 서비스 운영팀<br />
              - 개인정보 보호책임자: 이승준<br />
              - 이메일: axw0208@gmail.com
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
