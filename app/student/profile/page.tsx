import RoleDashboard, { studentItems } from "@/components/RoleDashboard";
import StudentProfileForm from "@/components/StudentProfileForm";

export default function StudentProfilePage() {
  return <RoleDashboard role="Student" subtitle="Student Portal" welcome="Student profile" items={studentItems} accent="from-cyan-500 to-blue-700"><StudentProfileForm /></RoleDashboard>;
}
