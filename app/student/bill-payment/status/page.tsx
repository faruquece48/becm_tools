import Link from "next/link";
import { CheckCircle2, CircleX, RotateCcw } from "lucide-react";
import RoleDashboard, { studentItems } from "@/components/RoleDashboard";

export default async function StudentPaymentStatusPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const result = typeof params.result === "string" ? params.result : "failed";
  const transactionId = typeof params.transactionId === "string" ? params.transactionId : "";
  const success = result === "success";
  const cancelled = result === "cancelled";

  return <RoleDashboard role="Student" subtitle="Student Portal" welcome="Welcome to your student portal" items={studentItems} accent="from-cyan-500 to-blue-700">
    <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
      <span className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${success ? "bg-emerald-100 text-emerald-600" : cancelled ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600"}`}>{success ? <CheckCircle2 className="h-10 w-10" /> : cancelled ? <RotateCcw className="h-10 w-10" /> : <CircleX className="h-10 w-10" />}</span>
      <h1 className="mt-6 text-3xl font-extrabold text-[#102555]">{success ? "Payment successful" : cancelled ? "Payment cancelled" : "Payment failed"}</h1>
      <p className="mt-3 text-slate-500">{success ? "Your transaction was validated and recorded successfully." : cancelled ? "No payment was completed. You can return and try again." : "The transaction could not be validated. No service will be released for this attempt."}</p>
      {transactionId && <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm"><span className="text-slate-500">Transaction ID</span><strong className="ml-2 break-all text-slate-800">{transactionId}</strong></div>}
      <Link href="/student/bill-payment" className="mt-7 inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-6 font-semibold text-white hover:bg-blue-700">Return to Bill Payment</Link>
    </div>
  </RoleDashboard>;
}
