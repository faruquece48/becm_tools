import Link from "next/link";
import { ArrowRight, BookOpenText, PackageCheck, UsersRound } from "lucide-react";
import { getPrisma } from "@/lib/prisma";

export default async function AdminOverviewPage() {
  const prisma = getPrisma();
  let databaseAvailable = Boolean(prisma);
  let accounts = 0;
  let books = 0;
  let stock = { _sum: { quantity: null as number | null } };
  let activeRentals = 0;
  if (prisma) {
    try {
      [accounts, books, stock, activeRentals] = await Promise.all([
        prisma.portalAccount.count(), prisma.rentalBook.count({ where: { active: true } }),
        prisma.rentalBook.aggregate({ where: { active: true }, _sum: { quantity: true } }),
        prisma.rentalOrder.count({ where: { status: "ACTIVE" } }),
      ]);
    } catch (error) {
      databaseAvailable = false;
      console.error("Unable to load admin overview statistics", error);
    }
  }
  const cards = [
    { label: "Registered accounts", value: accounts, icon: UsersRound, href: "/admin/accounts", color: "from-blue-600 to-cyan-500" },
    { label: "Rental book titles", value: books, icon: BookOpenText, href: "/admin/rental-library", color: "from-violet-600 to-indigo-500" },
    { label: "Books currently in stock", value: stock._sum.quantity || 0, icon: PackageCheck, href: "/admin/rental-library", color: "from-emerald-600 to-teal-500" },
    { label: "Active rental orders", value: activeRentals, icon: BookOpenText, href: "/admin/rental-library", color: "from-amber-500 to-orange-500" },
  ];
  return <div><p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">Admin dashboard</p><h1 className="mt-2 text-3xl font-extrabold">System overview</h1><p className="mt-2 text-slate-500">Monitor portal accounts and departmental rental-library activity.</p>{!databaseAvailable && <p role="alert" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">The database is temporarily unavailable. Overview totals will refresh when the connection is restored.</p>}<section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, icon: Icon, href, color }) => <Link key={label} href={href} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><span className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-white`}><Icon className="h-5 w-5" /></span><p className="mt-5 text-3xl font-extrabold">{value}</p><div className="mt-2 flex items-center justify-between text-sm text-slate-500"><span>{label}</span><ArrowRight className="h-4 w-4" /></div></Link>)}</section></div>;
}
