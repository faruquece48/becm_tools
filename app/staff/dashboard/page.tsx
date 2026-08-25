import RoleDashboard, { staffItems } from "@/components/RoleDashboard";

export default function StaffDashboardPage() {
  return <RoleDashboard role="Staff" subtitle="Staff Portal" welcome="Welcome to your staff workspace" items={staffItems} accent="from-emerald-500 to-teal-700" />;
}
