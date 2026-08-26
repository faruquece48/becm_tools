import RoleDashboard, { studentItems } from "@/components/RoleDashboard";
import StudentBillPaymentForm from "@/components/StudentBillPaymentForm";

export default function StudentBillPaymentPage() {
  return <RoleDashboard role="Student" subtitle="Student Portal" welcome="Welcome to your student portal" items={studentItems} accent="from-cyan-500 to-blue-700">
    <StudentBillPaymentForm />
  </RoleDashboard>;
}
