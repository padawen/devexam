"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
    const pathname = usePathname();

    return (
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
            <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
                <Link href="/" className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    DevExam AI
                </Link>
                <div className="flex gap-6 text-sm font-medium text-slate-600">
                    <Link
                        href="/"
                        className={`hover:text-indigo-600 transition-colors cursor-pointer ${pathname === '/' ? 'text-indigo-600 font-semibold' : ''}`}
                    >
                        Új teszt
                    </Link>
                    <Link
                        href="/dashboard"
                        className={`hover:text-indigo-600 transition-colors cursor-pointer ${pathname === '/dashboard' ? 'text-indigo-600 font-semibold' : ''}`}
                    >
                        Korábbi tesztek
                    </Link>
                </div>
            </div>
        </nav>
    );
}
