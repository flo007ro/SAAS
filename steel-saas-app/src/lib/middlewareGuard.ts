const PROTECTED_PREFIXES = ["/api/design-runs"];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function shouldBlock(pathname: string, isAuthenticated: boolean): boolean {
  return isProtectedPath(pathname) && !isAuthenticated;
}
