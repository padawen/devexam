import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { password } = await request.json();

        if (!process.env.APP_PASSWORD) {
            return NextResponse.json({ error: 'APP_PASSWORD is not set on the server' }, { status: 500 });
        }

        if (password === process.env.APP_PASSWORD) {
            const response = NextResponse.json({ success: true });
            response.cookies.set({
                name: 'auth_token',
                value: password,
                httpOnly: true,
                path: '/',
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7, // 1 week
            });
            return response;
        }

        return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
