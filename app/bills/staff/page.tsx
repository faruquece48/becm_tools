import StaffRemunerationTable from "@/components/StaffRemunerationTable";

export default function RemunerationStaffPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Staff Remuneration Information</h1>
        <p className="text-sm text-slate-500">This read-only information is maintained from the staff account.</p>
      </div>
      <StaffRemunerationTable />
    </main>
  );
}
