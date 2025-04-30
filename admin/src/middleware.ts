import { clerkMiddleware } from '@clerk/nextjs/server'

// Define public routes that don't require authentication
const publicRoutes = [
  '/',
  '/sign-in',
  '/sign-up',
  '/api/public',
  '/api/clerk-webhook',
];

// Check if the route is public
function isPublicRoute(path: string): boolean {
  return publicRoutes.some(route =>
    path === route || path.startsWith(`${route}/`)
  );
}


export default clerkMiddleware({
  publicRoutes: publicRoutes,
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}