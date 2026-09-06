const regularGrades = [
  ["80 and above", "A+", "4.00"], ["75–79", "A", "3.75"], ["70–74", "A−", "3.50"],
  ["65–69", "B+", "3.25"], ["60–64", "B", "3.00"], ["55–59", "B−", "2.75"],
  ["50–54", "C+", "2.50"], ["45–49", "C", "2.25"], ["40–44", "D", "2.00"], ["Below 40", "F", "0.00"],
] as const;

const rules = [
  { title: "Odd semester", text: "The semester result uses the latest cumulative credit and grade points available before the Odd examination. A passed backlog course updates that carried total before the next academic year's Odd-semester calculation." },
  { title: "Even semester", text: "The Even-semester result continues from the same academic year's Odd-semester result and adds the eligible Even-semester courses, credits, and grade points." },
  { title: "Backlog examination", text: "Only students registered and eligible for the selected exam year and academic year are included. A passing backlog result is capped at B+ (3.25), even when the mark is above 65. Scores from 40 through 64 retain the normal D through B bands." },
  { title: "Short semester", text: "Short-semester courses follow the registered course list for the selected examination. Only registered and eligible students and subjects are included in preparation and publication." },
  { title: "Re-add", text: "A re-added student is included according to the student's saved promotion and course assignment for the selected exam. Courses that still require registration remain separate from failed courses." },
  { title: "Non-OBE", text: "A Non-OBE student is included only when a matching promotion or registration exists for the selected exam year, academic year, semester, and course. Marks and tabulation documents place the Non-OBE table after the OBE table; the result sheet uses one continuous student table." },
  { title: "Result statistics", text: "Backlogged students are students with a failed or status subject in that semester. Need to Register Again counts only students with registration-pending subjects. Cleared All Subjects equals appeared students minus the union of those two groups." },
  { title: "Publication and archive", text: "Admin acceptance publishes the prepared result and saves the corresponding archive automatically. The archived marksheet or result can be downloaded later without regenerating it before acceptance." },
] as const;

export default function ResultRulesPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-7">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-wider text-blue-700">Result</p>
          <h1 className="mt-1 text-3xl font-extrabold text-[#102555]">Rules</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Operational rules used when preparing, calculating, publishing, and archiving examination results.</p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {rules.map((rule) => (
            <article key={rule.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-[#102555]">{rule.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{rule.text}</p>
            </article>
          ))}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-xl font-bold text-[#102555]">Grading system</h2>
            <p className="mt-1 text-sm text-slate-600">The regular scale applies to Odd, Even, Short Semester, and other regular examinations. Backlog grades have a B+ ceiling.</p>
          </div>
          <div className="grid gap-0 lg:grid-cols-2">
            <GradeTable title="Regular examination" rows={regularGrades} />
            <GradeTable title="Backlog examination" rows={[["65 and above", "B+", "3.25"], ...regularGrades.slice(4)]} />
          </div>
          <p className="border-t border-slate-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">For a theory course, absence or a combined Part A and Part B score below 15 produces an F. A score below 40 also produces an F.</p>
        </section>
      </div>
    </main>
  );
}

function GradeTable({ title, rows }: { title: string; rows: ReadonlyArray<readonly [string, string, string]> }) {
  return (
    <div className="p-5 lg:first:border-r lg:first:border-slate-200">
      <h3 className="mb-3 font-bold text-[#102555]">{title}</h3>
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-[#082f57] text-white"><tr><th className="p-3 text-left">Marks (%)</th><th className="p-3 text-center">Grade</th><th className="p-3 text-center">Point</th></tr></thead>
          <tbody>{rows.map(([marks, grade, point]) => <tr key={marks} className="border-t border-slate-200 even:bg-slate-50"><td className="p-3">{marks}</td><td className="p-3 text-center font-semibold">{grade}</td><td className="p-3 text-center">{point}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
