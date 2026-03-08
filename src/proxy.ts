import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Publikus útvonalak
    if (pathname.startsWith('/login') ||
        pathname.startsWith('/api/auth') ||
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon')) {
        return NextResponse.next();
    }

    const token = request.cookies.get('auth_token')?.value;
    // APP_PASSWORD is required, and the token must match it
    if (!token || !process.env.APP_PASSWORD || token !== process.env.APP_PASSWORD) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
