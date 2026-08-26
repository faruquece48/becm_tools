"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  Building2,
  Eye,
  EyeOff,
  GraduationCap,
  LockKeyhole,
  Presentation,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import logoImage from "@/app/images/image_03.png";
import SiteVisitorPanel from "@/components/SiteVisitorPanel";

const roles = {
  student: {
    label: "Student",
    title: "Student Login",
    description: "Access academic notices, schedules, learning resources and student services.",
    idLabel: "Email ID",
    placeholder: "Enter your email address",
    destination: "/student/dashboard",
    icon: GraduationCap,
    accent: "#159f82",
  },
  teacher: {
    label: "Teacher",
    title: "Teacher Login",
    description: "Access your dashboard to manage official files and examination activities.",
    idLabel: "Email ID",
    placeholder: "Enter your email address",
    destination: "/teacher/dashboard",
    icon: Presentation,
    accent: "#2563eb",
  },
  staff: {
    label: "Staff",
    title: "Staff Login",
    description: "Access office resources, document records and departmental services.",
    idLabel: "Email ID",
    placeholder: "Enter your email address",
    destination: "/staff/dashboard",
    icon: BriefcaseBusiness,
    accent: "#7c3aed",
  },
} as const;

const features = [
  { icon: GraduationCap, title: "Academic Resources" },
  { icon: Bell, title: "Live Notices" },
  { icon: Building2, title: "Department Services" },
  { icon: ShieldCheck, title: "Secure Access" },
] as const;

type Role = keyof typeof roles;

export default function RoleLoginPortal() {
  const router = useRouter();
  const [activeRole, setActiveRole] = useState<Role>("teacher");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [showPassword, setShowPassword] = useState(false);
  const role = roles[activeRole];
  const RoleIcon = role.icon;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (activeRole === "student") {
      let existing: { studentName?: string; phone?: string } = {};
      try { existing = JSON.parse(window.localStorage.getItem("becm-student-profile") || "{}"); } catch {}
      window.localStorage.setItem("becm-student-profile", JSON.stringify({
        studentName: authMode === "signup" ? String(form.get("fullName") || "") : existing.studentName || "",
        email: String(form.get("identifier") || ""),
        phone: authMode === "signup" ? String(form.get("phone") || "") : existing.phone || "",
      }));
    }
    const trackingResponse = await fetch("/api/portal-accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: String(form.get("identifier") || ""), role: activeRole, name: String(form.get("fullName") || "") || undefined, phone: String(form.get("phone") || "") || undefined }) }).catch(() => null);
    if (trackingResponse?.status === 403) {
      const data = await trackingResponse.json().catch(() => ({ error: "This account is disabled" }));
      window.alert(data.error || "This account is disabled");
      return;
    }
    router.push(role.destination);
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900 [zoom:0.98]">
      <div className="mx-auto flex min-h-[calc(100vh-68px)] max-w-[1536px] items-start px-5 pb-7 pt-7 sm:px-8 lg:px-14 xl:px-[84px]">
        <div className="grid w-full grid-cols-1 gap-10 lg:h-[min(790px,calc(100vh-40px))] lg:grid-cols-[1.04fr_1fr] lg:gap-14 xl:gap-[58px]">
          <section className="relative flex min-h-0 flex-col overflow-hidden rounded-t-[28px] bg-white">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[430px] overflow-hidden bg-gradient-to-br from-teal-50 via-white to-blue-50">
              <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(8,127,139,0.12)_1px,transparent_1px)] bg-[size:22px_22px] opacity-55" />
              <div className="absolute -left-24 -top-28 h-72 w-72 rounded-full bg-teal-200/30 blur-3xl" />
              <div className="absolute -right-20 top-10 h-64 w-64 rounded-full bg-blue-200/30 blur-3xl" />
              <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full border-[28px] border-[#168790]/[0.06]" />
              <div className="absolute left-10 top-10 h-24 w-24 rotate-45 rounded-3xl border border-teal-200/35" />
            </div>
            <div className="relative z-10 flex flex-1 flex-col p-3 sm:p-7 lg:p-3">
              <div className="mx-auto max-w-[620px] text-center">
                <div className="mx-auto flex h-[124px] w-[124px] items-center justify-center">
                  <Image src={logoImage} alt="RUET logo" className="h-[112px] w-[112px] object-contain" priority />
                </div>

                <p className="mt-5 text-sm font-bold uppercase tracking-[0.22em] text-[#168790]">Department of</p>
                <h1 className="mt-2 whitespace-nowrap text-[clamp(0.82rem,2.25vw,1.75rem)] font-extrabold leading-[1.14] tracking-[-0.025em] text-[#087f8b]">
                  Building Engineering &amp; Construction Management
                </h1>

                <div className="mx-auto mt-5 flex max-w-[520px] items-center gap-4">
                  <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#178b97]" />
                  <span className="h-2 w-2 rotate-45 bg-[#178b97]" />
                  <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#178b97]" />
                </div>

                <h2 className="mt-4 text-base font-extrabold uppercase leading-[1.5] tracking-[0.045em] text-[#112b52] sm:text-lg">
                  Rajshahi University of Engineering &amp; Technology
                </h2>
              </div>

              <div className="mb-3 mt-[52px]">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {features.map(({ icon: Icon, title }, index) => (
                    <div key={title} className="flex min-w-0 items-center rounded-xl border border-white bg-white/95 p-3 shadow-[0_8px_22px_rgba(15,64,93,0.14)] backdrop-blur-sm transition hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(15,64,93,0.2)]">
                      <div className="flex items-center gap-2.5">
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${index % 2 === 0 ? "border-teal-400 text-teal-600" : "border-blue-400 text-blue-600"}`}><Icon className="h-[18px] w-[18px]" strokeWidth={2} /></span>
                        <h3 className="text-[12px] font-bold leading-4 text-[#102555]">{title}</h3>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative -mx-3 -mb-3 mt-[10px] min-h-[250px] flex-1 overflow-hidden sm:-mx-7 sm:-mb-7 lg:-mx-3 lg:-mb-3">
                <Image src="/Image/becm.jpg" alt="Department of BECM building at RUET" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover object-bottom" unoptimized />
                <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/35 to-transparent" />
                <div className="absolute bottom-0 right-0 max-w-full text-slate-600">
                  <SiteVisitorPanel variant="compact" />
                </div>
              </div>
            </div>
          </section>

          <section className="flex min-h-0 items-stretch">
            <div className="flex h-full w-full flex-col rounded-[17px] border border-slate-100 bg-white p-6 shadow-[0_8px_35px_rgba(15,23,42,0.10)] sm:p-9 xl:p-10">
              <div className="text-center">
                <h2 className="text-[28px] font-bold tracking-[-0.02em] text-[#12294c]">{authMode === "signin" ? "Welcome Back!" : "Create Your Account"}</h2>
                <p className="mt-1.5 text-base text-slate-500">{authMode === "signin" ? "Sign in to continue to BECM Tools" : "Join the BECM digital community"}</p>
                <div className="mx-auto mt-4 h-[3px] w-12 rounded-full bg-[#0ea5a9]" />
              </div>

              <div className="mt-8 grid grid-cols-3 gap-4" role="tablist" aria-label="Account type">
                {(Object.keys(roles) as Role[]).map((key) => {
                  const item = roles[key];
                  const Icon = item.icon;
                  const active = activeRole === key;
                  return (
                    <button key={key} type="button" role="tab" aria-selected={active} onClick={() => setActiveRole(key)} className={`flex min-h-16 items-center justify-center gap-2.5 rounded-[9px] border bg-white px-3 font-semibold transition-all ${active ? "shadow-[0_4px_12px_rgba(15,23,42,0.06)]" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`} style={{ borderColor: active ? item.accent : undefined, color: item.accent, boxShadow: active ? `0 0 0 1px ${item.accent}18` : undefined }}>
                      <Icon className="h-6 w-6" /><span className="hidden sm:inline">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              <form onSubmit={handleSubmit} className="mt-5 overflow-hidden rounded-[10px] border border-slate-200 bg-white">
                {authMode === "signin" && <div className="flex items-center gap-4 bg-gradient-to-b from-slate-50/90 to-white px-5 py-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${role.accent}, ${role.accent}cc)` }}><RoleIcon className="h-7 w-7" /></span>
                  <div><h3 className="text-lg font-semibold" style={{ color: role.accent }}>{role.title}</h3><p className="mt-1 max-w-[430px] text-sm leading-[1.55] text-slate-500">{role.description}</p></div>
                </div>}

                <div className="border-t border-slate-200 px-5 pb-4 pt-4">
                  {authMode === "signup" ? <>
                    <label htmlFor="full-name" className="mb-2 block text-sm font-semibold text-slate-800">Full Name</label>
                    <div className="relative"><UserRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" /><input id="full-name" name="fullName" required autoComplete="name" placeholder="Enter your full name" className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100" /></div>
                    <div className={`mt-3 grid gap-3 ${activeRole === "student" ? "sm:grid-cols-2" : ""}`}>
                      <div><label htmlFor="user-id" className="mb-2 block text-sm font-semibold text-slate-800">Email ID</label><div className="relative"><UserRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" /><input id="user-id" name="identifier" required type="email" autoComplete="email" placeholder="Enter your email address" className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100" /></div></div>
                      {activeRole === "student" && <div><label htmlFor="mobile-number" className="mb-2 block text-sm font-semibold text-slate-800">Mobile Number</label><div className="relative"><UserRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" /><input id="mobile-number" name="phone" required type="tel" autoComplete="tel" placeholder="01XXXXXXXXX" className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100" /></div></div>}
                    </div>
                  </> : <>
                    <label htmlFor="user-id" className="mb-2 block text-sm font-semibold text-slate-800">{role.idLabel}</label>
                    <div className="relative"><UserRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" /><input id="user-id" name="identifier" required type="email" autoComplete="email" placeholder={role.placeholder} className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100" /></div>
                  </>}

                  <label htmlFor="password" className={`mb-2 block text-sm font-semibold text-slate-800 ${authMode === "signup" ? "mt-3" : "mt-4"}`}>Password</label>
                  <div className="relative"><LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-500" /><input id="password" name="password" required type={showPassword ? "text" : "password"} autoComplete={authMode === "signin" ? "current-password" : "new-password"} placeholder="Enter your password" className={`${authMode === "signup" ? "h-11" : "h-12"} w-full rounded-lg border border-slate-200 bg-white pl-12 pr-14 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100`} /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-0 top-0 flex h-full w-12 items-center justify-center border-l border-slate-200 text-slate-500 transition hover:bg-slate-50" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div>

                  {authMode === "signup" && <>
                    <label htmlFor="confirm-password" className="mb-2 mt-3 block text-sm font-semibold text-slate-800">Confirm Password</label>
                    <div className="relative"><LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-500" /><input id="confirm-password" name="confirmPassword" required type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Re-enter your password" className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100" /></div>
                  </>}

                  {authMode === "signin" && <div className="mt-4 flex items-center justify-between gap-4"><label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600"><input type="checkbox" className="h-4 w-4 rounded border-slate-300" style={{ accentColor: role.accent }} />Remember me</label><button type="button" className="text-sm font-medium text-blue-600 hover:underline">Forgot password?</button></div>}

                  <button type="submit" className={`${authMode === "signup" ? "mt-4 h-11" : "mt-5 h-12"} flex w-full items-center justify-center gap-3 rounded-[7px] font-semibold text-white shadow-sm transition hover:-translate-y-px hover:shadow-lg`} style={{ background: `linear-gradient(90deg, ${role.accent}, #168fd3)` }}>{authMode === "signin" ? "Sign In" : "Create Account"} <ArrowRight className="h-5 w-5" /></button>
                  {authMode === "signin" && <p className="mt-3 text-center text-[12px] leading-5 text-slate-500">By signing in, you agree to our <button type="button" className="font-medium text-blue-600 hover:underline">Terms of Service</button> and <button type="button" className="font-medium text-blue-600 hover:underline">Privacy Policy</button>.</p>}
                </div>
              </form>
              <p className="mt-4 text-center text-sm text-slate-500">
                {authMode === "signin" ? "New to BECM Tools?" : "Already have an account?"}{" "}
                <button type="button" onClick={() => setAuthMode((mode) => mode === "signin" ? "signup" : "signin")} className="font-semibold text-blue-600 hover:underline">{authMode === "signin" ? "Sign Up" : "Sign In"}</button>
              </p>
              <p className="mt-auto pt-5 text-center text-[11px] font-medium leading-5 tracking-wide text-[#405777]">© 2026 BECM, RUET <span className="mx-1.5 text-[#07949a]">•</span> Empowering education, innovation &amp; collaboration.</p>
            </div>
          </section>
        </div>
      </div>

    </main>
  );
}
