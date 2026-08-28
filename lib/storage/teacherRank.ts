export type TeacherRankEntry = { id: string; name: string };
export type TeacherRankDepartment = { id: string; title: string; teachers: TeacherRankEntry[] };
export type TeacherRankData = { departments: TeacherRankDepartment[] };

const becmNames = [
  "Mrs. Shayla Sharmin", "Mr. Mehedi Hasan", "Mr. Aojoy Kumar Shuvo", "Mr. Faruque Abdullah",
  "Mr. Md. Ashraful Islam", "Mr. Nur Alam Riad", "Mr. Towfik Hassan", "Mr. MD. Mehedi Hassan Galib",
  "Mr. Md. Jubaer Hossain", "Mr. Md. Mustakim", "Mr. Mithun Chakrabartty", "Mr. Md. Rumman Howlader",
];
const ceNames = [
  "Dr. Md. Abdul Alim", "Dr. N.H.M. Kamrujjaman Serker", "Dr. Md. Kumruzzaman (1)", "Dr. Md. Niamul Bari",
  "Dr. Md. Kamruzzaman (2)", "Dr. Md. Mahmud Sazzad", "Dr. S. M. Zahurul Islam", "Dr. Md. Akhtar Hossain",
  "Dr. Md. Shafiqul Islam", "Dr. Md. Robiul Awall", "Dr. Abu Sufian Md. Zia Hasan", "Dr. H. M. Rasel",
  "Dr. Md. Abu Sayeed", "Dr. Md. Zahangir Alam", "Dr. Anupam Chowdhury", "Dr. Bulbul Ahmed",
];
const entries = (department: string, names: string[]) => names.map((name, index) => ({ id: `${department}-teacher-${index + 1}`, name }));

export const defaultTeacherRankData: TeacherRankData = {
  departments: [
    { id: "becm", title: "BECM Department Teachers", teachers: entries("becm", becmNames) },
    { id: "ce", title: "CE Department Teachers", teachers: entries("ce", ceNames) },
    { id: "arch", title: "Architecture Department Teachers", teachers: [] },
    { id: "eee", title: "EEE Department Teachers", teachers: [] },
    { id: "me", title: "ME Department Teachers", teachers: [] },
    { id: "math", title: "Mathematics Department Teachers", teachers: [] },
    { id: "chem", title: "Chemistry Department Teachers", teachers: [] },
    { id: "phy", title: "Physics Department Teachers", teachers: [] },
    { id: "hum", title: "Humanities Department Teachers", teachers: [] },
    { id: "other-university", title: "Other University Teachers", teachers: [] },
  ],
};

export function normalizeTeacherRankData(value: unknown): TeacherRankData {
  const input = value as { teachers?: TeacherRankEntry[]; departments?: TeacherRankDepartment[] } | null;
  const savedDepartments = Array.isArray(input?.departments) ? input.departments : [];
  const legacyBecmTeachers = Array.isArray(input?.teachers) ? input.teachers : undefined;
  return {
    departments: defaultTeacherRankData.departments.map((fallback) => {
      const saved = savedDepartments.find((department) => department.id === fallback.id);
      return {
        id: fallback.id,
        title: saved?.title || fallback.title,
        teachers: saved?.teachers ?? (fallback.id === "becm" && legacyBecmTeachers ? legacyBecmTeachers : fallback.teachers),
      };
    }),
  };
}