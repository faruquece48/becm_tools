import { notFound } from "next/navigation";
import RoleDashboard, { staffItems } from "@/components/RoleDashboard";
import StaffStudentPaymentMonitor from "@/components/StaffStudentPaymentMonitor";
const items = { "lab-report": "Lab Report", "association-fee": "BECM Association Fee", "letter-attestation": "Letter of Attestation", "equivalent-certificate": "Equivalent Certificate" } as const;
export default async function StaffPaymentPage({ params }: { params: Promise<{ item: string }> }) {
  const { item } = await params;
  if (!(item in items)) notFound();
  const key = item as keyof typeof items;
  return <RoleDashboard role="Staff" subtitle="Staff Portal" welcome={`${items[key]} payments`} items={staffItems} accent="from-emerald-500 to-teal-700"><StaffStudentPaymentMonitor item={key} title={items[key]} /></RoleDashboard>;
}