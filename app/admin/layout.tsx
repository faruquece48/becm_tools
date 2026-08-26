import type { ReactNode } from "react";
import AdminLogin from "@/components/AdminLogin";
import AdminSidebar from "@/components/AdminSidebar";
import { adminCredentialsConfigured, isAdminAuthenticated } from "@/lib/adminAuth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!await isAdminAuthenticated()) return <AdminLogin configured={adminCredentialsConfigured()} />;
  return <main className="min-h-screen bg-[#f4f7fb] text-[#102555]"><div className="mx-auto flex min-h-screen max-w-[1800px]"><div className="sticky top-0 h-screen"><AdminSidebar /></div><section className="min-w-0 flex-1"><header className="flex h-20 items-center justify-end border-b border-slate-200 bg-white px-8"><p className="text-sm font-semibold text-slate-500">Administrator Account</p></header><div className="mx-auto max-w-7xl p-8">{children}</div></section></div></main>;
}
