"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowRight, Building2, CheckCircle2, Eye, EyeOff, GraduationCap, LockKeyhole, MousePointerClick, UserRound } from "lucide-react";
import logoImage from "@/app/images/image_03.png";

const roles = {
  student: { label: "Student", description: "Academic notices, schedules and student services", idLabel: "Student ID", idPlaceholder: "Enter your student ID", icon: GraduationCap, destination: "/student/dashboard", accent: "from-cyan-500 to-blue-600" },
  teacher: { label: "Teacher", description: "Official files and examination activities", idLabel: "Teacher ID or email", idPlaceholder: "Enter your teacher ID or email", icon: UserRound, destination: "/teacher/dashboard", accent: "from-violet-500 to-indigo-700" },
  staff: { label: "Staff", description: "Administration, records and office services", idLabel: "Staff ID or email", idPlaceholder: "Enter your staff ID or email", icon: Building2, destination: "/staff/dashboard", accent: "from-emerald-500 to-teal-700" },
} as const;

type Role = keyof typeof roles;

export default function RoleLoginPortal() {
  const router = useRouter();
  const [activeRole, setActiveRole] = useState<Role>("teacher");
  const [showPassword, setShowPassword] = useState(false);
  const role = roles[activeRole];

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(role.destination);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#edf3f2] text-slate-900">
      <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-teal-200/40 blur-3xl" />
      <div className="absolute -bottom-24 right-0 h-96 w-96 rounded-full bg-indigo-200/40 blur-3xl" />

      <div className="relative mx-auto grid min-h-screen max-w-[1500px] items-center gap-6 px-5 py-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8">
        <section className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-[#0b6b68] via-[#075d67] to-[#163f68] px-7 py-9 text-white shadow-2xl shadow-slate-400/30 sm:px-10 lg:min-h-[calc(100vh-3rem)] lg:px-14 lg:py-12">
          <div className="absolute -right-28 -top-28 h-80 w-80 rounded-full border-[55px] border-white/[0.06]" />
          <div className="absolute -bottom-32 -left-28 h-96 w-96 rounded-full border-[60px] border-cyan-300/[0.06]" />
          <div className="relative z-10">
          <div className="flex items-center gap-4">
            <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white p-2 shadow-xl">
              <Image src={logoImage} alt="RUET logo" className="h-full w-full object-contain" priority />
            </span>
            <div><p className="font-serif text-3xl font-bold tracking-wide">RUET</p><p className="text-sm text-teal-100">Rajshahi University of Engineering &amp; Technology</p></div>
          </div>
          <div className="my-12 max-w-2xl lg:my-16">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-300">Department of BECM</p>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] sm:text-5xl lg:text-[3.5rem]">
              Everything you need.<br /><span className="text-teal-200">One place to begin.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-teal-50/80">
              A unified digital workspace built for the people who learn, teach and keep our department moving.
            </p>
            <div className="mt-7 space-y-3 text-sm text-teal-50/90">
              <p className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-amber-300" /> Role-focused tools and information</p>
              <p className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-amber-300" /> Fast access from any device</p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-2 backdrop-blur-md">
            <p className="flex items-center gap-2 px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-teal-100"><MousePointerClick className="h-4 w-4" /> Select your workspace</p>
            <div className="grid grid-cols-3 gap-2">
            {(Object.keys(roles) as Role[]).map((key) => {
              const item = roles[key]; const Icon = item.icon; const selected = activeRole === key;
              return <button key={key} type="button" onClick={() => setActiveRole(key)} aria-pressed={selected} className={`flex items-center justify-center gap-2 rounded-xl px-2 py-3 text-sm font-semibold transition ${selected ? "bg-white text-[#075d67] shadow-lg" : "text-white/75 hover:bg-white/10 hover:text-white"}`}><Icon className="h-4 w-4" />{item.label}</button>;
            })}
            </div>
          </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-xl rounded-[30px] border border-white bg-white/95 p-5 shadow-2xl shadow-slate-300/60 backdrop-blur sm:p-8">
          <p className="text-sm font-semibold text-indigo-600">Welcome back</p>
          <h2 className="mt-1 text-3xl font-bold text-[#102555]">Sign in to continue</h2>
          <p className="mt-2 text-sm text-slate-500">Choose your account type and enter your details.</p>

          <div className="mt-7 grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1.5" role="tablist" aria-label="Account type">
            {(Object.keys(roles) as Role[]).map((key) => {
              const item = roles[key]; const Icon = item.icon; const selected = activeRole === key;
              return <button key={key} type="button" role="tab" aria-selected={selected} onClick={() => setActiveRole(key)} className={`flex items-center justify-center gap-2 rounded-xl px-2 py-3 text-sm font-semibold transition ${selected ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}><Icon className="h-4 w-4" />{item.label}</button>;
            })}
          </div>

          <div className={`mt-6 rounded-2xl bg-gradient-to-r ${role.accent} p-4 text-white`}><p className="font-semibold">{role.label} portal</p><p className="mt-1 text-sm text-white/80">{role.description}</p></div>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <label className="block text-sm font-semibold text-slate-700">{role.idLabel}<span className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-100"><UserRound className="h-5 w-5 shrink-0 text-slate-400" /><input name="identifier" required autoComplete="username" placeholder={role.idPlaceholder} className="h-12 min-w-0 flex-1 bg-transparent px-2 text-sm font-normal outline-none placeholder:text-slate-400" /></span></label>
            <label className="block text-sm font-semibold text-slate-700">Password<span className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-100"><LockKeyhole className="h-5 w-5 shrink-0 text-slate-400" /><input name="password" required autoComplete="current-password" type={showPassword ? "text" : "password"} placeholder="Enter your password" className="h-12 min-w-0 flex-1 bg-transparent px-2 text-sm font-normal outline-none placeholder:text-slate-400" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="rounded-md p-1 text-slate-400 hover:text-slate-700" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></span></label>
            <div className="flex items-center justify-between text-sm"><label className="flex items-center gap-2 text-slate-600"><input type="checkbox" className="h-4 w-4 rounded border-slate-300 accent-indigo-600" /> Remember me</label><button type="button" className="font-semibold text-indigo-600 hover:text-indigo-800">Forgot password?</button></div>
            <button type="submit" className={`flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${role.accent} font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl`}>Sign in as {role.label} <ArrowRight className="h-5 w-5" /></button>
          </form>
          <p className="mt-6 text-center text-xs leading-5 text-slate-400">For account access problems, contact the BECM department office.</p>
        </section>
      </div>
    </main>
  );
}
