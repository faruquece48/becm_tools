import RoleDashboard, { staffItems } from "@/components/RoleDashboard";
import BookRecordWorkspace from "@/components/BookRecordWorkspace";

export default function StaffBookLendingPage() {
  return <RoleDashboard role="Staff" subtitle="Staff Portal" welcome="Book records" items={staffItems} accent="from-violet-500 to-indigo-700"><BookRecordWorkspace /></RoleDashboard>;
}
