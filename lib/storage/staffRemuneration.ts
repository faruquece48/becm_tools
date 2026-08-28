export type StaffRemunerationCourse = { id: string; code: string; title: string; staff: { id: string; name: string }[] };
export type StaffRemunerationSemester = { id: string; title: string; courses: StaffRemunerationCourse[] };
export type StaffRemunerationData = { semesters: StaffRemunerationSemester[] };

const STORAGE_KEY = "becm-staff-remuneration";
const names = (course: string, values: string[]) => values.map((name, index) => ({ id: `${course}-staff-${index + 1}`, name }));

const oddSemester: StaffRemunerationSemester = {
  id: "first-year-odd",
  title: "1st Year Odd Semester Examination",
  courses: [
    { id: "becm-1100", code: "BECM 1100", title: "Graphics and Basic Engineering Drawing", staff: names("becm-1100", ["Mr. Koushik Ghosh, Senior Technican, Dept. of BECM, RUET.", "Mr. Md. Aman Forhad, Lab Technican, Dept. of BECM, RUET.", "Md. Jwel Rana, M.L.S.S, Dept. of BECM, RUET."]) },
    { id: "becm-1102", code: "BECM 1102", title: "Wood and Sheet Metal Shop", staff: names("becm-1102", ["Md. Ashfaqul Bari, Chief Technical Officer, Dept. of ME, RUET.", "Md. Mizan-ur-Rahman Khan, Assistant Chief Technical Officer, Dept. of ME, RUET.", "Md. Rajibur Rahaman, Technical Officer, Dept. of ME, RUET.", "Md. Sofiqul Islam, Technical Officer, Dept. of ME, RUET.", "Md. Rabiul Islam, Technical Officer, Dept. of ME, RUET.", "Md. Sader Ali, M.L.S.S, Dept. of ME, RUET.", "Md. Sahabul Islam, M.L.S.S, Dept. of ME, RUET.", "Md. Moklasur Rahaman, M.L.S.S, Dept. of ME, RUET.", "Md. Kalu, M.L.S.S, Dept. of ME, RUET.", "Mr. Koushik Ghosh, Senior Technican, Dept. of BECM, RUET.", "Mr. Md. Aman Forhad, Lab Technican, Dept. of BECM, RUET.", "Md. Jwel Rana, M.L.S.S, Dept. of BECM, RUET."]) },
    { id: "phy-1108", code: "PHY 1108", title: "Sessional of Physics", staff: names("phy-1108", ["Md. Masum Billah Azad, Senior Technical Office, Dept. of Phy, RUET.", "Azizur Rahman, Technical Office, Dept. of Phy, RUET.", "Md. Ruhul Amin, M.L.S.S, Dept. of Phy, RUET.", "Mr. Koushik Ghosh, Senior Technican, Dept. of BECM, RUET.", "Mr. Md. Aman Forhad, Lab Technican, Dept. of BECM, RUET.", "Md. Jwel Rana, M.L.S.S, Dept. of BECM, RUET."]) },
    { id: "eee-1148", code: "EEE 1148", title: "Sessional of Basic Electrical Engineering", staff: names("eee-1148", ["Abdul Mozid, Senior Assistant Registrer, Dept. of EEE, RUET.", "Md. Rabiul Islam, Section Officer, Dept. of EEE, RUET.", "Mr. Ishtiaque Ahammad, Senior Technical Office, Dept. of EEE, RUET.", "Md. Mijanur Rahman, M.L.S.S, Dept. of EEE, RUET.", "Mr. Koushik Ghosh, Senior Technican, Dept. of BECM, RUET.", "Mr. Md. Aman Forhad, Lab Technican, Dept. of BECM, RUET.", "Md. Jwel Rana, M.L.S.S, Dept. of BECM, RUET."]) },
  ],
};

const evenSemester: StaffRemunerationSemester = {
  id: "first-year-even",
  title: "1st Year Even Semester Examination",
  courses: [
    { id: "becm-1202", code: "BECM 1202", title: "Sessional on Building and Construction Materials", staff: names("becm-1202", ["Mr. Koushik Ghosh, Senior Technican, Dept. of BECM, RUET.", "Mr. Md. Aman Forhad, Lab Technican, Dept. of BECM, RUET.", "Md. Jwel Rana, M.L.S.S, Dept. of BECM, RUET."]) },
    { id: "hum-1206", code: "HUM 1206", title: "Sessional of Basic Electrical Engineering", staff: names("hum-1206", ["Md. Masud Rana, Junior Section Officer, Dept. of Hum, RUET.", "Mr. Koushik Ghosh, Senior Technican, Dept. of BECM, RUET.", "Mr. Md. Aman Forhad, Lab Technican, Dept. of BECM, RUET.", "Md. Jwel Rana, M.L.S.S, Dept. of BECM, RUET."]) },
    { id: "chem-1208", code: "CHEM 1208", title: "Sessional on Chemistry", staff: names("chem-1208", ["Md. Rased Mahmud, Senior Technical Office, Dept. of Chem, RUET.", "Md. Abul Kalam, Gard, Dept. of Chem, RUET.", "Mr. Koushik Ghosh, Senior Technican, Dept. of BECM, RUET.", "Mr. Md. Aman Forhad, Lab Technican, Dept. of BECM, RUET.", "Md. Jwel Rana, M.L.S.S, Dept. of BECM, RUET."]) },

  ],
};

const secondYearOddSemester: StaffRemunerationSemester = {
  id: "second-year-odd",
  title: "2nd Year Odd Semester Examination",
  courses: [
    { id: "becm-2100", code: "BECM 2100", title: "Construction Estimating Sessional", staff: names("becm-2100", ["Mr. Koushik Ghosh, Senior Technican, Dept. of BECM, RUET.", "Mr. Md. Aman Forhad, Lab Technican, Dept. of BECM, RUET.", "Md. Jwel Rana, M.L.S.S, Dept. of BECM, RUET."]) },
    { id: "becm-2132", code: "BECM 2132", title: "Architectural Design Sessional-I", staff: names("becm-2132", ["Mr. Koushik Ghosh, Senior Technican, Dept. of BECM, RUET.", "Mr. Md. Aman Forhad, Lab Technican, Dept. of BECM, RUET.", "Md. Jwel Rana, M.L.S.S, Dept. of BECM, RUET."]) },
    { id: "becm-2104", code: "BECM 2104", title: "Construction Technique and Equipments Sessional-I", staff: names("becm-2104", ["Mr. Koushik Ghosh, Senior Technican, Dept. of BECM, RUET.", "Mr. Md. Aman Forhad, Lab Technican, Dept. of BECM, RUET.", "Md. Jwel Rana, M.L.S.S, Dept. of BECM, RUET."]) },
  ],
};
const secondYearEvenSemester: StaffRemunerationSemester = {
  id: "second-year-even",
  title: "2nd Year Even Semester Examination",
  courses: [
    { id: "becm-2202", code: "BECM 2202", title: "Construction Techniques and Equipment Sessional-II", staff: names("becm-2202", ["Mr. Koushik Ghosh, Senior Technican, Dept. of BECM, RUET.", "Mr. Md. Aman Forhad, Lab Technican, Dept. of BECM, RUET.", "Md. Jwel Rana, M.L.S.S, Dept. of BECM, RUET."]) },
    { id: "becm-2204", code: "BECM 2204", title: "Computer Application and Programming Sessional", staff: names("becm-2204", ["Mr. Koushik Ghosh, Senior Technican, Dept. of BECM, RUET.", "Mr. Md. Aman Forhad, Lab Technican, Dept. of BECM, RUET.", "Md. Jwel Rana, M.L.S.S, Dept. of BECM, RUET."]) },
    { id: "becm-2226-obe", code: "BECM 2226 (OBE)", title: "Mechanics of Materials Sessional", staff: names("becm-2226-obe", ["Mr. Koushik Ghosh, Senior Technican, Dept. of BECM, RUET.", "Mr. Md. Aman Forhad, Lab Technican, Dept. of BECM, RUET.", "Md. Jwel Rana, M.L.S.S, Dept. of BECM, RUET."]) },
    { id: "becm-2226-non-obe", code: "BECM 2226 (Non OBE)", title: "Mechanics of Materials Sessional", staff: names("becm-2226-non-obe", ["Mr. Koushik Ghosh, Senior Technican, Dept. of BECM, RUET.", "Mr. Md. Aman Forhad, Lab Technican, Dept. of BECM, RUET.", "Md. Jwel Rana, M.L.S.S, Dept. of BECM, RUET."]) },
    { id: "becm-2232", code: "BECM 2232", title: "Architectural Design Sessional-II", staff: names("becm-2232", ["Mr. Koushik Ghosh, Senior Technican, Dept. of BECM, RUET.", "Mr. Md. Aman Forhad, Lab Technican, Dept. of BECM, RUET.", "Md. Jwel Rana, M.L.S.S, Dept. of BECM, RUET."]) },
  ],
};
const thirdYearOddSemester: StaffRemunerationSemester = {
  id: "third-year-odd",
  title: "3rd Year Odd Semester Examination",
  courses: [
    { id: "becm-3142", code: "BECM 3142", title: "Geotechnical Engineering Sessional-I", staff: names("becm-3142", ["Mr. Koushik Ghosh, Senior Technican, Dept. of BECM, RUET.", "Mr. Md. Aman Forhad, Lab Technican, Dept. of BECM, RUET.", "Md. Jwel Rana, M.L.S.S, Dept. of BECM, RUET."]) },
    { id: "becm-3134", code: "BECM 3134", title: "Architectural Design of High Rise Building Sessional", staff: names("becm-3134", ["Mr. Koushik Ghosh, Senior Technican, Dept. of BECM, RUET.", "Mr. Md. Aman Forhad, Lab Technican, Dept. of BECM, RUET.", "Md. Jwel Rana, M.L.S.S, Dept. of BECM, RUET."]) },
    { id: "becm-3132", code: "BECM 3132", title: "Landscape Design Sessional", staff: names("becm-3132", ["Mr. Koushik Ghosh, Senior Technican, Dept. of BECM, RUET.", "Mr. Md. Aman Forhad, Lab Technican, Dept. of BECM, RUET.", "Md. Jwel Rana, M.L.S.S, Dept. of BECM, RUET."]) },
  ],
};
const thirdYearEvenSemester: StaffRemunerationSemester = {
  id: "third-year-even",
  title: "3rd Year Even Semester Examination",
  courses: [
    { id: "becm-3202", code: "BECM 3202", title: "Research Methodology Sessional", staff: names("becm-3202", ["Mr. Koushik Ghosh, Senior Technican, Dept. of BECM, RUET.", "Mr. Md. Aman Forhad, Lab Technican, Dept. of BECM, RUET.", "Md. Jwel Rana, M.L.S.S, Dept. of BECM, RUET."]) },
    { id: "becm-3242", code: "BECM 3242", title: "Geotechnical Engineering Sessional-II", staff: names("becm-3242", ["Mr. Koushik Ghosh, Senior Technican, Dept. of BECM, RUET.", "Mr. Md. Aman Forhad, Lab Technican, Dept. of BECM, RUET.", "Md. Jwel Rana, M.L.S.S, Dept. of BECM, RUET."]) },
    { id: "becm-3210", code: "BECM 3210", title: "Building Project Management Sessional", staff: names("becm-3210", ["Mr. Koushik Ghosh, Senior Technican, Dept. of BECM, RUET.", "Mr. Md. Aman Forhad, Lab Technican, Dept. of BECM, RUET.", "Md. Jwel Rana, M.L.S.S, Dept. of BECM, RUET."]) },
    { id: "becm-3270", code: "BECM 3270", title: "Structural Analysis and Design Sessional", staff: names("becm-3270", ["Mr. Koushik Ghosh, Senior Technican, Dept. of BECM, RUET.", "Mr. Md. Aman Forhad, Lab Technican, Dept. of BECM, RUET.", "Md. Jwel Rana, M.L.S.S, Dept. of BECM, RUET."]) },
  ],
};
const fourthYearOddSemester: StaffRemunerationSemester = {
  id: "fourth-year-odd",
  title: "4th Year Odd Semester Examination",
  courses: [
    { id: "becm-4170", code: "BECM 4170", title: "Computer Aided Analysis and Design of Tall Building Sessional", staff: names("becm-4170", ["Mr. Koushik Ghosh, Senior Technican, Dept. of BECM, RUET.", "Mr. Md. Aman Forhad, Lab Technican, Dept. of BECM, RUET.", "Md. Jwel Rana, M.L.S.S, Dept. of BECM, RUET."]) },
    { id: "becm-4130", code: "BECM 4130", title: "Interior Design Sessional", staff: names("becm-4130", ["Mr. Koushik Ghosh, Senior Technican, Dept. of BECM, RUET.", "Mr. Md. Aman Forhad, Lab Technican, Dept. of BECM, RUET.", "Md. Jwel Rana, M.L.S.S, Dept. of BECM, RUET."]) },
    { id: "becm-4132", code: "BECM 4132", title: "Working Drawing Sessional", staff: names("becm-4132", ["Mr. Koushik Ghosh, Senior Technican, Dept. of BECM, RUET.", "Mr. Md. Aman Forhad, Lab Technican, Dept. of BECM, RUET.", "Md. Jwel Rana, M.L.S.S, Dept. of BECM, RUET."]) },
    { id: "becm-4100", code: "BECM 4100", title: "Professional Training", staff: names("becm-4100", ["Mr. Koushik Ghosh, Senior Technican, Dept. of BECM, RUET.", "Mr. Md. Aman Forhad, Lab Technican, Dept. of BECM, RUET.", "Md. Jwel Rana, M.L.S.S, Dept. of BECM, RUET."]) },
  ],
};
const fourthYearEvenSemester: StaffRemunerationSemester = {
  id: "fourth-year-even",
  title: "4th Year Even Semester Examination",
  courses: [
    { id: "becm-4200", code: "BECM 4200", title: "Professional Practices and Communication Sessional", staff: names("becm-4200", ["Mr. Koushik Ghosh, Senior Technican, Dept. of BECM, RUET.", "Mr. Md. Aman Forhad, Lab Technican, Dept. of BECM, RUET.", "Md. Jwel Rana, M.L.S.S, Dept. of BECM, RUET."]) },
    { id: "becm-4242", code: "BECM 4242", title: "Foundation Engineering Sessional", staff: names("becm-4242", ["Mr. Koushik Ghosh, Senior Technican, Dept. of BECM, RUET.", "Mr. Md. Aman Forhad, Lab Technican, Dept. of BECM, RUET.", "Md. Jwel Rana, M.L.S.S, Dept. of BECM, RUET."]) },
    { id: "becm-4276", code: "BECM 4276", title: "Structural Health Monitoring Sessional", staff: names("becm-4276", ["Mr. Koushik Ghosh, Senior Technican, Dept. of BECM, RUET.", "Mr. Md. Aman Forhad, Lab Technican, Dept. of BECM, RUET.", "Md. Jwel Rana, M.L.S.S, Dept. of BECM, RUET."]) },
    { id: "becm-4214", code: "BECM 4214", title: "Building Information Modelling Sessional", staff: names("becm-4214", ["Mr. Koushik Ghosh, Senior Technican, Dept. of BECM, RUET.", "Mr. Md. Aman Forhad, Lab Technican, Dept. of BECM, RUET.", "Md. Jwel Rana, M.L.S.S, Dept. of BECM, RUET."]) },
  ],
};
const fourthYearShortSemester: StaffRemunerationSemester = {
  id: "fourth-year-short",
  title: "4th Year Short Semester",
  courses: [
    { id: "becm-4120", code: "BECM 4120", title: "Analysis and Design of Tall Building Sessional", staff: names("becm-4120", ["Mr. Koushik Ghosh, Senior Technican, Dept. of BECM, RUET.", "Mr. Md. Aman Forhad, Lab Technican, Dept. of BECM, RUET.", "Md. Jwel Rana, M.L.S.S, Dept. of BECM, RUET."]) },
  ],
};
const practicalSurveying: StaffRemunerationSemester = {
  id: "practical-surveying-ce-1226",
  title: "List of Officer & Staff Associated with practical Surveying (CE 1226)",
  courses: [
    { id: "ce-1226", code: "CE 1226", title: "Surveying", staff: names("ce-1226", ["Md. Golam Shahriar, Assistant Registrar, Dept. of CE, RUET.", "Mr. Koushik Ghosh, Senior Technican, Dept. of BECM, RUET.", "Mr. Md. Aman Forhad, Lab Technican, Dept. of BECM, RUET.", "Md. Jwel Rana, M.L.S.S, Dept. of BECM, RUET."]) },
  ],
};

export const defaultStaffRemunerationData: StaffRemunerationData = { semesters: [oddSemester, evenSemester, practicalSurveying, secondYearOddSemester, secondYearEvenSemester, thirdYearOddSemester, thirdYearEvenSemester, fourthYearOddSemester, fourthYearEvenSemester, fourthYearShortSemester] };

function withSecondYearOddSection(data: StaffRemunerationData): StaffRemunerationData {
  return data.semesters.some((semester) => semester.id === secondYearOddSemester.id)
    ? data
    : { semesters: [...data.semesters, secondYearOddSemester] };
}
function withSecondYearEvenSection(data: StaffRemunerationData): StaffRemunerationData {
  return data.semesters.some((semester) => semester.id === secondYearEvenSemester.id)
    ? data
    : { semesters: [...data.semesters, secondYearEvenSemester] };
}
function withThirdYearOddSection(data: StaffRemunerationData): StaffRemunerationData {
  return data.semesters.some((semester) => semester.id === thirdYearOddSemester.id)
    ? data
    : { semesters: [...data.semesters, thirdYearOddSemester] };
}
function withThirdYearEvenSection(data: StaffRemunerationData): StaffRemunerationData {
  return data.semesters.some((semester) => semester.id === thirdYearEvenSemester.id)
    ? data
    : { semesters: [...data.semesters, thirdYearEvenSemester] };
}
function withFourthYearOddSection(data: StaffRemunerationData): StaffRemunerationData {
  return data.semesters.some((semester) => semester.id === fourthYearOddSemester.id)
    ? data
    : { semesters: [...data.semesters, fourthYearOddSemester] };
}
function withFourthYearEvenSection(data: StaffRemunerationData): StaffRemunerationData {
  return data.semesters.some((semester) => semester.id === fourthYearEvenSemester.id)
    ? data
    : { semesters: [...data.semesters, fourthYearEvenSemester] };
}
function withFourthYearShortSection(data: StaffRemunerationData): StaffRemunerationData {
  return data.semesters.some((semester) => semester.id === fourthYearShortSemester.id)
    ? data
    : { semesters: [...data.semesters, fourthYearShortSemester] };
}
function withPracticalSurveyingSection(data: StaffRemunerationData): StaffRemunerationData {
  const existingSection = data.semesters.find((semester) => semester.id === practicalSurveying.id);
  if (existingSection) return data;
  const surveyingCourse = data.semesters.flatMap((semester) => semester.courses).find((course) => course.id === "ce-1226" || course.code.trim().toUpperCase() === "CE 1226");
  return {
    semesters: [
      ...data.semesters.map((semester) => ({ ...semester, courses: semester.courses.filter((course) => course !== surveyingCourse) })),
      { ...practicalSurveying, courses: surveyingCourse ? [surveyingCourse] : practicalSurveying.courses },
    ],
  };
}

function orderSections(data: StaffRemunerationData): StaffRemunerationData {
  const sectionOrder = defaultStaffRemunerationData.semesters.map((semester) => semester.id);
  return {
    semesters: [...data.semesters].sort((left, right) => {
      const leftIndex = sectionOrder.indexOf(left.id);
      const rightIndex = sectionOrder.indexOf(right.id);
      if (leftIndex === -1) return rightIndex === -1 ? 0 : 1;
      if (rightIndex === -1) return -1;
      return leftIndex - rightIndex;
    }),
  };
}

export function loadStaffRemunerationData(): StaffRemunerationData {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultStaffRemunerationData;
    const parsed = JSON.parse(saved) as StaffRemunerationData | { examinationTitle?: string; courses?: StaffRemunerationCourse[] };
    if ("semesters" in parsed && Array.isArray(parsed.semesters)) {
      const completeData = parsed.semesters.some((semester) => semester.id === evenSemester.id)
        ? parsed
        : { semesters: [...parsed.semesters, evenSemester] };
      return orderSections(withFourthYearShortSection(withFourthYearEvenSection(withFourthYearOddSection(withThirdYearEvenSection(withThirdYearOddSection(withSecondYearEvenSection(withSecondYearOddSection(withPracticalSurveyingSection(completeData)))))))));
    }
    const legacy = parsed as { examinationTitle?: string; courses?: StaffRemunerationCourse[] };
    return orderSections(withFourthYearShortSection(withFourthYearEvenSection(withFourthYearOddSection(withThirdYearEvenSection(withThirdYearOddSection(withSecondYearEvenSection(withSecondYearOddSection(withPracticalSurveyingSection({ semesters: [{ ...oddSemester, title: legacy.examinationTitle || oddSemester.title, courses: legacy.courses || oddSemester.courses }, evenSemester] })))))))));
  } catch { return defaultStaffRemunerationData; }
}

export function saveStaffRemunerationData(data: StaffRemunerationData): boolean {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); return true; } catch { return false; }
}
