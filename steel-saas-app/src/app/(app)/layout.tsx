import { redirect } from "next/navigation";
import { auth } from "../../lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.userId) {
    redirect("/login");
  }
  return <>{children}</>;
}
