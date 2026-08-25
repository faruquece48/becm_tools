import RoleDashboard, { studentItems } from "@/components/RoleDashboard";

export default function StudentDashboardPage() {
  return <RoleDashboard role="Student" subtitle="Student Portal" welcome="Welcome to your student portal" items={studentItems} accent="from-cyan-500 to-blue-700" />;
}
