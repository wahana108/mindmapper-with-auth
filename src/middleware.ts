import { NextResponse } from "next/server";
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Log awal untuk setiap pemanggilan middleware
  console.log(`[Middleware] Path: ${request.nextUrl.pathname}, Timestamp: ${new Date().toISOString()}`);

  // Izinkan semua permintaan untuk melewati middleware karena basic auth dihapus
  console.log("[Middleware] Basic authentication removed. Allowing all requests.");
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Terapkan middleware ke semua path KECUALI yang secara eksplisit dikecualikan:
    // - /api/.* (semua rute API)
    // - /_next/static/.* (file statis Next.js)
    // - /_next/image/.* (optimasi gambar Next.js)
    // - /favicon.ico (file favicon)
    // Tambahkan 'public' ke dalam daftar pengecualian
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};