import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    // Check for token in cookies
    const token = request.cookies.get('token')?.value

    // Define protected paths
    const protectedPaths = ['/dashboard']

    // Check if the current path is protected
    const isProtectedPath = protectedPaths.some((path) =>
        request.nextUrl.pathname.startsWith(path)
    )

    if (isProtectedPath && !token) {
        // Redirect to login page if no token found
        return NextResponse.redirect(new URL('/login', request.url))
    }

    return NextResponse.next()
}

// Config to specify which paths the middleware should run on
export const config = {
    matcher: ['/dashboard/:path*'],
}
