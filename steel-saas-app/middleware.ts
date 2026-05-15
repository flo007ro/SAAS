import { auth } from "./src/lib/auth";
import { NextResponse } from "next/server";
import { shouldBlock } from "./src/lib/middlewareGuard";

export default auth((req) => {
  if (shouldBlock(req.nextUrl.pathname, !!req.auth)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
});

export const config = {
  matcher: ["/api/design-runs/:path*"],
};
