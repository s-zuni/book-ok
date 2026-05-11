import { NextResponse } from "next/server";
import { createClient } from "@shared/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// ⚠️ service_role 키는 서버에서만 사용 — 절대 클라이언트에 노출 금지
function getAdminClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://holaqlorkluptvrcfwtu.supabase.co";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다."
    );
  }

  return createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function DELETE() {
  try {
    // 1. 현재 로그인한 사용자 확인 (anon client + cookie session)
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "인증되지 않은 요청입니다." },
        { status: 401 }
      );
    }

    const userId = user.id;
    const adminClient = getAdminClient();

    // 2. 관련 데이터 순서대로 삭제 (FK 의존성 고려)
    // 2-1. 자녀와 관련된 데이터 삭제 (읽은 책, 독서 목표 등)

    // read_books는 children FK라 children 삭제 전에 처리 필요
    // 직접 쿼리로 처리
    const { data: childrenData } = await adminClient
      .from("children")
      .select("id")
      .eq("parent_id", userId);

    if (childrenData && childrenData.length > 0) {
      const childIds = childrenData.map((c: { id: string }) => c.id);

      // 읽은 책 삭제
      await adminClient.from("read_books").delete().in("child_id", childIds);

      // 독서 목표 삭제
      await adminClient
        .from("reading_goals")
        .delete()
        .in("child_id", childIds);
    }

    // 2-2. 자녀 프로필 삭제
    await adminClient.from("children").delete().eq("parent_id", userId);

    // 2-3. 딥리포트 요청 삭제
    await adminClient
      .from("deep_report_requests")
      .delete()
      .eq("user_id", userId);

    // 2-4. 사용자 프로필 삭제
    await adminClient.from("profiles").delete().eq("id", userId);

    // 3. Auth 계정 삭제 (admin API)
    const { error: deleteAuthError } =
      await adminClient.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      console.error("Auth 계정 삭제 실패:", deleteAuthError);
      return NextResponse.json(
        { error: "계정 삭제 중 오류가 발생했습니다: " + deleteAuthError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "계정이 성공적으로 삭제되었습니다." },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("계정 삭제 API 오류:", error);
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json(
      { error: "서버 오류: " + message },
      { status: 500 }
    );
  }
}
