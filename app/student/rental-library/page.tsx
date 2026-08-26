import RoleDashboard, { studentItems } from "@/components/RoleDashboard";
import RentalLibraryForm from "@/components/RentalLibraryForm";

export default function RentalLibraryPage() {
  return <RoleDashboard role="Student" subtitle="Student Portal" welcome="Rental library" items={studentItems} accent="from-cyan-500 to-blue-700"><RentalLibraryForm /></RoleDashboard>;
}
