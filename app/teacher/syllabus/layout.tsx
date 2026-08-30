import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ResultShell from "@/components/ResultShell";
import { getPrisma } from "@/lib/prisma";

export default async function SyllabusLayout({children}:{children:React.ReactNode}){const id=(await cookies()).get("becm-portal-account")?.value;const prisma=getPrisma();if(!id||!prisma)redirect("/");const teacher=await prisma.portalAccount.findFirst({where:{id,role:"teacher",active:true},select:{id:true}});if(!teacher)redirect("/");return <ResultShell>{children}</ResultShell>;}
