export const publicRoutes = ['/', '/sign-in(.*)', '/sign-up(.*)'];

export function isPublicRoute(path: string): boolean {
  return publicRoutes.some(route => new RegExp(`^${route}$`).test(path));
}
