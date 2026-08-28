import RoleDashboard, { staffItems } from "@/components/RoleDashboard";
import StaffRemunerationTable from "@/components/StaffRemunerationTable";

export default function StaffRemunerationBillPage() {
  return (
    <RoleDashboard role="Staff" subtitle="Staff Portal" welcome="Remuneration Bill" items={staffItems} accent="from-emerald-500 to-teal-700">
      <div className="mb-7">
        <h1 className="text-3xl font-extrabold text-[#102555]">Remuneration Bill</h1>
        <p className="mt-2 text-slate-500">Edit the shared staff assignments, then save to update the teacher remuneration page.</p>
      </div>
      <StaffRemunerationTable editable />
    </RoleDashboard>
  );
}
