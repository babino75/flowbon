import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // Protect /dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    // Check for the refresh_token cookie set by the backend
    const refreshToken = request.cookies.get('refresh_token');
    
    if (!refreshToken) {
      // If no token, redirect to login with the original url as redirect param
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', request.nextUrl.pathname + request.nextUrl.search);
      return NextResponse.redirect(loginUrl);
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
