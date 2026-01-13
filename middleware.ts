import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Tạo response mặc định
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Khởi tạo Supabase server client (đúng chuẩn Supabase)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // 👉 DÒNG QUAN TRỌNG: chỉ kiểm tra user cho dashboard (an toàn, không timeout)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Nếu CHƯA đăng nhập → chuyển về trang login
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Nếu đã đăng nhập → cho đi tiếp
  return response;
}

/**
 * ⚠️ CẤU HÌNH QUAN TRỌNG NHẤT
 * Middleware CHỈ chạy cho dashboard / teacher / admin
 * KHÔNG chạy cho:
 * - Trang học sinh
 * - Form khảo sát
 * - API
 * → Tránh 504 Gateway Timeout
 */
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/teacher/:path*",
    "/admin/:path*",
  ],
};
