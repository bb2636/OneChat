import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 활성화된 약관만 조회
    const terms = await sql`
      SELECT 
        id,
        type,
        title,
        content,
        CASE 
          WHEN type = 'terms_of_service' THEN true
          WHEN type = 'privacy_policy' THEN true
          WHEN type LIKE '%location%' THEN true
          ELSE false
        END as is_required
      FROM terms
      WHERE is_active = true
      ORDER BY 
        CASE 
          WHEN type = 'terms_of_service' THEN 1
          WHEN type = 'privacy_policy' THEN 2
          WHEN type LIKE '%location%' THEN 3
          ELSE 4
        END
    `;

    // 약관이 없으면 기본 약관 반환
    if (terms.length === 0) {
      return NextResponse.json([
        {
          id: "default_terms_of_service",
          type: "terms_of_service",
          title: "이용약관",
          content: "이용약관 내용이 여기에 표시됩니다.",
          is_required: true,
        },
        {
          id: "default_privacy_policy",
          type: "privacy_policy",
          title: "개인정보처리방침",
          content: "개인정보처리방침 내용이 여기에 표시됩니다.",
          is_required: true,
        },
        {
          id: "default_location_consent",
          type: "location_consent",
          title: "위치정보제공 동의",
          content: "위치정보제공 동의 내용이 여기에 표시됩니다.",
          is_required: true,
        },
      ]);
    }

    // 데이터 구조 변환 (is_required -> isRequired)
    const formattedTerms = terms.map((term: any) => ({
      id: term.id,
      type: term.type,
      title: term.title,
      content: term.content,
      isRequired: term.is_required ?? term.isRequired ?? false,
    }));

    return NextResponse.json(formattedTerms);
  } catch (error) {
    console.error("Terms fetch error:", error);
    return NextResponse.json(
      { error: "약관을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
