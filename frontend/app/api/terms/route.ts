import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const terms = await sql`
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

    console.log("[Terms API] DB에서 약관 조회 결과:", terms.length, "건");

    if (terms.length === 0) {
      console.log("[Terms API] DB에 약관 데이터 없음 - 기본값 반환");
      return NextResponse.json([
        {
          id: "default_terms_of_service",
          type: "terms_of_service",
          title: "이용약관",
          content: "이용약관 내용이 여기에 표시됩니다.",
          isRequired: true,
        },
        {
          id: "default_privacy_policy",
          type: "privacy_policy",
          title: "개인정보처리방침",
          content: "개인정보처리방침 내용이 여기에 표시됩니다.",
          isRequired: true,
        },
        {
          id: "default_location_consent",
          type: "location_consent",
          title: "위치정보제공 동의",
          content: "위치정보제공 동의 내용이 여기에 표시됩니다.",
          isRequired: true,
        },
      ]);
    }

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
