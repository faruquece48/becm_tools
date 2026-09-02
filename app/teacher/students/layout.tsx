import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ResultShell from "@/components/ResultShell";
import StudentSubnav from "@/components/StudentSubnav";
import { getPrisma } from "@/lib/prisma";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const accountId = (await cookies()).get("becm-portal-account")?.value;
  const prisma = getPrisma();
  if (!accountId || !prisma) redirect("/");
  const teacher = await prisma.portalAccount.findFirst({
    where: { id: accountId, role: "teacher", active: true },
    select: { id: true },
  });
  if (!teacher) redirect("/");
  return <ResultShell><StudentSubnav />{children}</ResultShell>;
}
