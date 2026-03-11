import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

const DEFAULT_TERMS = [
  {
    type: "terms_of_service",
    title: "서비스 이용약관",
    content: `서비스 이용 약관
시행일: 2026-01-01 

본 약관은 원챗이 제공하는 모든 서비스의 이용과 관련하여  
이용자와 회사 간의 권리, 의무 및 책임 사항을 규정합니다.
제1조 (목적)
본 약관은 원챗이 제공하는 위치 기반 채팅 및 관련 서비스의 
이용 조건 및 절차, 이용자와 회사의 권리·의무를 규정함을 목적으로 합니다.
제2조 (회원 가입 및 이용 계약)
 • 이용자는 본 약관에 동의함으로써 서비스 이용 계약이 성립됩니다.
 • 회사는 기술적 또는 운영상 필요에 따라  
    특정 이용자의 서비스 이용을 제한할 수 있습니다.
제3조 (서비스 제공)
원챗은 다음과 같은 서비스를 제공합니다.
 • 위치 기반 사용자 탐색 및 연결 서비스
 • 친구 추가 및 1:1 채팅 기능
 • 그룹 채팅 및 커뮤니티 기능
 • 기타 회사가 추가로 개발하거나 제공하는 서비스
제4조 (이용자의 의무)
이용자는 서비스 이용 시 다음 행위를 해서는 안 됩니다.
 • 타인의 개인정보를 침해하거나 불쾌감을 주는 행위
 • 욕설, 비방, 음란물, 불법 콘텐츠 게시
 • 서비스 운영을 방해하는 행위
 • 법령 또는 본 약관을 위반하는 행위
제5조 (서비스 이용 제한)
회사는 다음의 경우 사전 통보 없이 서비스 이용을 제한할 수 있습니다.
 • 본 약관 또는 관련 법령을 위반한 경우
 • 부정 이용 또는 반복적인 민원이 발생한 경우
 • 서비스 안정성에 심각한 영향을 미치는 경우`,
  },
  {
    type: "privacy_policy",
    title: "개인정보 처리방침",
    content: `개인정보처리방침
시행일: 2026-01-01

원챗은 이용자의 개인정보를 중요하게 생각하며,  
「개인정보 보호법」 등 관련 법령을 준수하여 개인정보를 처리합니다.  
본 개인정보처리방침은 원챗이 제공하는 서비스 이용과 관련하여  
개인정보의 수집·이용·보관·파기에 관한 기준을 안내합니다.
1. 수집하는 개인정보 항목
원챗은 서비스 제공을 위해 아래와 같은 개인정보를 수집합니다.
필수 수집 항목
 • 휴대전화 번호
 • 닉네임
 • 위치정보
 • 서비스 이용 기록, 접속 로그
선택 수집 항목
 • 프로필 이미지
 • 고객 문의 시 사용자가 입력한 정보
2. 개인정보 수집 및 이용 목적
수집한 개인정보는 다음 목적에 한해 이용됩니다.
 • 회원 식별 및 본인 확인
 • 위치 기반 사용자 연결 및 채팅 서비스 제공
 • 고객 문의 처리 및 민원 대응
 • 서비스 운영, 유지 및 품질 개선
 • 부정 이용 방지 및 서비스 안정성 확보
3. 개인정보 보유 및 이용 기간
 • 개인정보는 원칙적으로 회원 탈퇴 시까지 보유 및 이용합니다.
 • 단, 관련 법령에 따라 일정 기간 보관이 필요한 경우에는
    해당 법령에서 정한 기간 동안 보관합니다.`,
  },
  {
    type: "location_consent",
    title: "위치 정보 제공 동의",
    content: `위치 정보 제공 동의
시행일: 2026-01-01  

원챗은 「위치정보의 보호 및 이용 등에 관한 법률」에 따라  
이용자의 위치정보를 안전하게 보호하며,  
아래와 같은 목적에 한해 위치정보를 수집·이용합니다.
1. 위치정보 수집 항목
 • 이동 단말기를 통해 수집되는 현재 위치 정보
 • 위치 기반 서비스 이용 과정에서 생성되는 위치 관련 정보
2. 위치정보 이용 목적
 • 근처 사용자 탐색 및 연결 기능 제공
 • 반경 기반 친구 추가 및 채팅 서비스 제공
 • 위치 기반 서비스 품질 향상 및 오류 개선
 • 서비스 운영 및 고객 문의 대응
3. 위치정보 보유 및 이용 기간
 • 위치정보는 서비스 이용 중에만 일시적으로 활용되며, 이용 목적 달성 후 즉시 파기합니다.
 • 단, 관계 법령에 따라 보관이 필요한 경우 해당 법령에서 정한 기간 동안 보관합니다.
4. 위치정보 제3자 제공
 • 원챗은 이용자의 위치정보를 원칙적으로 제3자에게 제공하지 않습니다.
 • 다만, 법령에 따라 제공이 요구되는 경우에는 예외로 합니다.
5. 이용자의 권리
 • 이용자는 언제든지 위치정보 이용 동의를 철회할 수 있으며, 설정 메뉴를 통해 위치정보 수집을 중단할 수 있습니다.
 • 위치정보 이용 동의를 철회할 경우, 위치 기반 서비스 이용이 제한될 수 있습니다.
6. 안전성 확보 조치
 • 원챗은 위치정보를 암호화하여 관리하며, 관련 법령에 따라 기술적·관리적 보호조치를 적용하고 있습니다.`,
  },
];

async function ensureTermsExist() {
  for (const term of DEFAULT_TERMS) {
    const existing = await sql`SELECT id FROM terms WHERE type = ${term.type} LIMIT 1`;
    if (existing.length === 0) {
      await sql`
        INSERT INTO terms (id, type, title, content, version, is_active, updated_at)
        VALUES (gen_random_uuid(), ${term.type}, ${term.title}, ${term.content}, 1, true, NOW())
      `;
      console.log("[Terms API] 약관 자동 삽입:", term.type);
    }
  }
}

export async function GET() {
  try {
    let terms = await sql`
      SELECT id, type, title, content
      FROM terms
      WHERE is_active = true
      ORDER BY
        CASE type
          WHEN 'terms_of_service' THEN 1
          WHEN 'privacy_policy' THEN 2
          WHEN 'location_consent' THEN 3
          ELSE 4
        END
    `;

    if (terms.length === 0) {
      console.log("[Terms API] DB에 약관 없음 - 자동 삽입 시도");
      await ensureTermsExist();
      terms = await sql`
        SELECT id, type, title, content
        FROM terms
        WHERE is_active = true
        ORDER BY
          CASE type
            WHEN 'terms_of_service' THEN 1
            WHEN 'privacy_policy' THEN 2
            WHEN 'location_consent' THEN 3
            ELSE 4
          END
      `;
    }

    console.log("[Terms API] 약관 조회 결과:", terms.length, "건");

    const formattedTerms = terms.map((term: any) => ({
      id: term.id,
      type: term.type,
      title: term.title,
      content: term.content,
      isRequired: true,
    }));

    return NextResponse.json(formattedTerms);
  } catch (error: any) {
    console.error("[Terms API] 에러:", error?.message || error);
    return NextResponse.json(
      { error: "약관을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
