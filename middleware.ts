import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

const PROTECTED = ["/admin", "/dashboard", "/upload", "/chart", "/settings", "/whitepaper"]

function isProtected(path: string) {
  return PROTECTED.some((p) => path === p || path.startsWith(p + "/"))
}

export default withAuth(
  function middleware(req) {
    const path = req.nextUrl.pathname

    // Defense-in-depth: รับเฉพาะ request ที่มาจาก CloudFront (มี secret header)
    // เปิดใช้เฉพาะเมื่อ ORIGIN_VERIFY_SECRET ถูกตั้งไว้ (inert โดยค่าเริ่มต้น)
    // ยกเว้น /api/health เพื่อให้ docker healthcheck (localhost ไม่มี header) ผ่านได้
    const secret = process.env.ORIGIN_VERIFY_SECRET
    if (secret && path !== "/api/health") {
      if (req.headers.get("x-origin-verify") !== secret) {
        return new NextResponse("Forbidden", { status: 403 })
      }
    }

    // เส้นทาง admin ต้องเป็น role ADMIN
    if (path.startsWith("/admin") && req.nextauth.token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard?error=unauthorized", req.url))
    }
    return NextResponse.next()
  },
  {
    callbacks: {
      // require login เฉพาะเส้นทางที่ต้องป้องกัน; เส้นทาง public ปล่อยผ่าน (แต่ยังตรวจ header ด้านบน)
      authorized: ({ token, req }) =>
        isProtected(req.nextUrl.pathname) ? !!token : true,
    },
  }
)

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
