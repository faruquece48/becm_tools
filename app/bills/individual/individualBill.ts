import type { ExaminationBillData } from "../create/components/types";
import { computeThesisVivaFormula, flattenBoardViva } from "../create/components/pdf/pdfHelpers";

export interface IndividualBillRow {
  id: string;
  description: string;
  course: string;
  quantity: string;
  courseCount: string;
  classTestCount: string;
  rate: string;
  minimumAmount?: number;
}

const withoutCourtesyTitle = (value: string) =>
  value.trim().replace(/^(mr|mrs|ms|mst)\.?(?=\s)/i, "").trim();
const clean = (value: string) => withoutCourtesyTitle(value).toLocaleLowerCase();
const sameTeacher = (left: string, right: string) => clean(left) === clean(right);
const isVerificationApplicable = (bill: ExaminationBillData) =>
  bill.billInfo.hasGraduatingStudents === "yes";
const isThesisApplicable = (bill: ExaminationBillData) =>
  bill.billInfo.examType === "semester" &&
  bill.billInfo.year === "4th Year" &&
  bill.billInfo.semester === "Even";
const isCourseCoordinatorApplicable = (bill: ExaminationBillData) =>
  bill.billInfo.examType === "semester" &&
  bill.billInfo.year === "4th Year" &&
  (bill.billInfo.semester === "Odd" || bill.billInfo.semester === "Even");
const isPracticalSurveyingApplicable = (bill: ExaminationBillData) =>
  bill.billInfo.examType === "semester" &&
  bill.billInfo.year === "1st Year" &&
  bill.billInfo.semester === "Even";

const currentEvaluationData = (bill: ExaminationBillData): ExaminationBillData => {
  const includeNonObe = bill.billInfo.evaluationSystem === "mixed";
  const includeNonObeSessional =
    includeNonObe && bill.sessionalEvaluationSystem === "mixed";
  return {
    ...bill,
    courseDuties: {
      ...bill.courseDuties,
      nonObe: includeNonObe ? bill.courseDuties.nonObe : [],
    },
    scrutinies: {
      ...bill.scrutinies,
      nonObe: includeNonObe ? bill.scrutinies.nonObe : [],
    },
    sessionalDuties: includeNonObeSessional
      ? bill.sessionalDuties
      : bill.sessionalDuties.filter(
          (course) => (course.syllabus ?? "obe") === "obe"
        ),
  };
};

export function collectTeacherNames(bill: ExaminationBillData): string[] {
  bill = currentEvaluationData(bill);
  const names = new Map<string, string>();
  const add = (name: string) => {
    const displayName = withoutCourtesyTitle(name);
    if (displayName) names.set(clean(displayName), displayName);
  };

  bill.committees.forEach((teacher) => add(teacher.name));
  [...bill.courseDuties.obe, ...bill.courseDuties.nonObe].forEach((course) =>
    course.parts.forEach((part) => {
      add(part.teacher);
      part.additionalTeachers.forEach((teacher) => add(teacher.name));
    })
  );
  bill.sessionalDuties.forEach((course) => {
    add(course.teacher);
    course.additionalTeachers.forEach((teacher) => add(teacher.name));
  });
  (bill.vivaBoardTeachers ?? []).forEach((teacher) => add(teacher.name));
  const teacherLists = [
    ...bill.questionWorks,
    ...bill.scrutinies.obe,
    ...bill.scrutinies.nonObe,
    ...bill.studentDuties,
    ...bill.courseAdvisers,
  ];
  if (isVerificationApplicable(bill)) {
    teacherLists.push(...bill.verificationTeachers);
  }
  if (isThesisApplicable(bill)) {
    teacherLists.push(...bill.thesisTeachers);
  }
  if (isCourseCoordinatorApplicable(bill)) {
    teacherLists.push(...bill.courseCoordinatorTeachers);
  }
  if (isPracticalSurveyingApplicable(bill)) {
    teacherLists.push(...bill.practicalSurveyingTeachers);
  }
  teacherLists.forEach((teacher) => add(teacher.name));

  return Array.from(names.values()).sort((a, b) => a.localeCompare(b));
}

export interface TeacherNameWarning {
  name: string;
  location: string;
}

export function collectTeacherNameWarnings(bill: ExaminationBillData): TeacherNameWarning[] {
  bill = currentEvaluationData(bill);
  const warnings: TeacherNameWarning[] = [];
  const check = (name: string, location: string) => {
    const trimmed = name.trim();
    if (!trimmed || /(?:^|\s)dr\.?(?=\s|$)/i.test(trimmed) || /^(mr|mrs|mst)\.?(?=\s)/i.test(trimmed)) return;
    warnings.push({ name: trimmed, location });
  };

  bill.committees.forEach((teacher, index) => check(teacher.name, `Examination Committee, row ${index + 1}`));
  const checkCourses = (label: string, courses: ExaminationBillData["courseDuties"]["obe"]) =>
    courses.forEach((course) => course.parts.forEach((part) => {
      const courseLocation = `${label}, course ${course.courseCode || "(course code missing)"}, Part ${part.part}`;
      check(part.teacher, courseLocation);
      part.additionalTeachers.forEach((teacher, index) => check(teacher.name, `${courseLocation}, additional teacher ${index + 1}`));
    }));
  checkCourses("OBE course duties", bill.courseDuties.obe);
  checkCourses("Non-OBE course duties", bill.courseDuties.nonObe);
  bill.sessionalDuties.forEach((course) => {
    const location = `Sessional duties, course ${course.courseCode || "(course code missing)"}`;
    check(course.teacher, location);
    course.additionalTeachers.forEach((teacher, index) => check(teacher.name, `${location}, additional teacher ${index + 1}`));
  });
  const checkList = (label: string, teachers: { name: string }[]) =>
    teachers.forEach((teacher, index) => check(teacher.name, `${label}, row ${index + 1}`));
  checkList("Additional Board Viva teachers", bill.vivaBoardTeachers ?? []);
  checkList("Question typing/sketching/printing", bill.questionWorks);
  checkList("OBE scrutiny", bill.scrutinies.obe);
  checkList("Non-OBE scrutiny", bill.scrutinies.nonObe);
  checkList("Student duties", bill.studentDuties);
  checkList("Course advisers", bill.courseAdvisers);
  if (isCourseCoordinatorApplicable(bill)) {
    checkList("Thesis/project examination", bill.thesisTeachers);
  }
  if (isVerificationApplicable(bill)) {
    checkList("Final-result verification", bill.verificationTeachers);
  }
  if (isThesisApplicable(bill)) {
    checkList("Course coordinators", bill.courseCoordinatorTeachers);
  }
  if (isPracticalSurveyingApplicable(bill)) {
    checkList("Practical surveying", bill.practicalSurveyingTeachers);
  }
  return warnings;
}

export function deriveTeacherRows(
  bill: ExaminationBillData,
  teacherName: string
): IndividualBillRow[] {
  bill = currentEvaluationData(bill);
  if (!teacherName) return [];
  let sequence = 0;
  const rows: IndividualBillRow[] = [];
  const add = (row: Omit<IndividualBillRow, "id">) =>
    rows.push({ ...row, id: `duty-${sequence++}` });

  bill.committees.forEach((member, index) => {
    if (!sameTeacher(member.name, teacherName)) return;
    add({
      description: index === 0 ? "পরীক্ষা কমিটির সভাপতি" : "পরীক্ষা কমিটির সদস্য",
      course: "",
      quantity: "",
      courseCount: "",
      classTestCount: "",
      rate: "5000",
    });
  });

  [
    ...bill.courseDuties.obe.map((course) => ({ course, isNonObe: false })),
    ...bill.courseDuties.nonObe.map((course) => ({ course, isNonObe: true })),
  ].forEach(({ course, isNonObe }) => {
    const shortSemesterClassTestTeachers =
      bill.billInfo.examType === "short"
        ? course.parts.flatMap((part) => [
            ...(part.duties.classTest && part.teacher.trim() ? [part.teacher] : []),
          ])
        : [];
    const shortSemesterClassTestTeacher =
      shortSemesterClassTestTeachers.length > 0
        ? shortSemesterClassTestTeachers[0]
        : undefined;
    course.parts.forEach((part) => {
      const entries = [
        { name: part.teacher, duties: part.duties, students: part.students },
        ...part.additionalTeachers.map((teacher) => ({
          name: teacher.name,
          duties: teacher.duties,
          students: teacher.students,
        })),
      ];
      entries.filter((entry) => sameTeacher(entry.name, teacherName)).forEach((entry) => {
        const classTestStudents =
          entry.students.classTestStudents === "" ||
          entry.students.classTestStudents == null
            ? bill.billInfo.totalStudents
            : entry.students.classTestStudents;
        if (entry.duties.paperSetter)
          add({ description: "প্রশ্নপত্র প্রণয়ন", course: course.courseCode, quantity: "", courseCount: "1", classTestCount: "", rate: "5000" });
        // A semester-final row with zero scripts/students is not billable;
        // do not create it, so the minimum amount cannot be applied.
        if (entry.duties.examiner && Number(entry.students.examiner) > 0)
          add({ description: "সেমিস্টার ফাইনাল", course: course.courseCode, quantity: entry.students.examiner, courseCount: "1", classTestCount: "", rate: "120", minimumAmount: 1000 });
        if (
          entry.duties.classTest &&
          (bill.billInfo.examType !== "short" ||
            (shortSemesterClassTestTeacher !== undefined &&
              sameTeacher(entry.name, shortSemesterClassTestTeacher))) &&
          Number(classTestStudents) > 0 &&
          (Number(entry.students.classTestCount) > 0 || bill.billInfo.examType === "short")
        )
          add({ description: "ক্লাস টেস্ট", course: course.courseCode, quantity: String(classTestStudents || ""), courseCount: "1", classTestCount: String(entry.students.classTestCount || (bill.billInfo.examType === "short" ? 4 : 2)), rate: "50" });
        if (entry.duties.assignment && !isNonObe && bill.billInfo.examType !== "short") {
          add({
            description: "এসাইনমেন্ট / প্রেজেন্টেশন",
            course: course.courseCode,
            quantity: Number(classTestStudents) > 0 ? `${classTestStudents}/2` : "",
            courseCount: "1",
            classTestCount: "",
            rate: "50",
          });
        }
        if (entry.duties.courseFile && !isNonObe && bill.billInfo.examType !== "short")
          add({ description: "কোর্স ফাইল প্রস্তুতকরণ", course: course.courseCode, quantity: "", courseCount: "1/2", classTestCount: "", rate: "6000" });
      });
    });
  });

  bill.sessionalDuties.forEach((course) => {
    const entries = [
      { name: course.teacher, duties: course.duties, students: course.students },
      ...course.additionalTeachers.map((teacher) => ({ name: teacher.name, duties: teacher.duties, students: teacher.students })),
    ];
    if (course.courseCode.replace(/\s+/g, "").toUpperCase() === "BECM4100") {
      const engagedEntries = entries.slice(1).filter((entry) => entry.name.trim());
      const engagedTeacherCount = engagedEntries.length;
      engagedEntries.filter((entry) => sameTeacher(entry.name, teacherName)).forEach(() => {
        const totalStudents = Number(course.students.sessional) || 0;
        add({
          description: "ইন্ডাস্ট্রিয়াল অ্যাটাচমেন্ট",
          course: course.courseCode,
          quantity: totalStudents && engagedTeacherCount
            ? `${totalStudents}/${engagedTeacherCount}`
            : "",
          courseCount: "1",
          classTestCount: "",
          rate: "400",
        });
        add({
          description: "কোর্স ফাইল প্রস্তুতকরণ",
          course: course.courseCode,
          quantity: "",
          courseCount: `1/${engagedTeacherCount}`,
          classTestCount: "",
          rate: "6000",
        });
      });
      return;
    }
    const sharedCourseCount = course.teacherCount === 2 ? "1/2" : "1";
    entries.filter((entry) => sameTeacher(entry.name, teacherName)).forEach((entry) => {
      if (entry.duties.sessional)
        add({ description: Number(course.credit) === 1.5 ? "সেশনাল (১.৫)" : "সেশনাল (০.৭৫)", course: course.courseCode, quantity: String(entry.students.sessional || ""), courseCount: sharedCourseCount, classTestCount: "", rate: "400", minimumAmount: Number(course.credit) === 1.5 ? 1500 : undefined });
      if (entry.duties.boardViva)
        add({ description: "ভাইভা (সেন্ট্রাল/বোর্ড)", course: course.courseCode, quantity: String(entry.students.boardViva || ""), courseCount: "1", classTestCount: "", rate: "150", minimumAmount: 500 });
      if (entry.duties.courseFile && bill.billInfo.examType !== "short")
        add({ description: "কোর্স ফাইল প্রস্তুতকরণ", course: course.courseCode, quantity: "", courseCount: sharedCourseCount, classTestCount: "", rate: "6000" });
    });
  });

  (bill.vivaBoardTeachers ?? [])
    .filter((teacher) => sameTeacher(teacher.name, teacherName))
    .forEach(() =>
      add({
        description: "ভাইভা (সেন্ট্রাল/বোর্ড)",
        course: "",
        quantity: String(bill.billInfo.totalStudents || ""),
        courseCount: "1",
        classTestCount: "",
        rate: "150",
        minimumAmount: 500,
      }),
    );

  [...bill.scrutinies.obe, ...bill.scrutinies.nonObe]
    .filter((teacher) => sameTeacher(teacher.name, teacherName))
    .forEach((teacher) => add({ description: "স্ক্রুটিনি", course: "", quantity: String(teacher.scriptCount || ""), courseCount: "", classTestCount: "", rate: "30", minimumAmount: 1200 }));
  bill.studentDuties
    .filter((teacher) => sameTeacher(teacher.name, teacherName))
    .forEach(() =>
      add({
        description: "রেজাল্ট প্রস্তুতকরণ",
        course: "",
        quantity: bill.tabulationStudentCount
          ? `${bill.tabulationStudentCount}/${bill.studentDuties.length}`
          : "",
        courseCount: "",
        classTestCount: "",
        rate: "90",
      })
    );
  bill.studentDuties
    .filter((teacher) => sameTeacher(teacher.name, teacherName))
    .forEach(() =>
      add({
        description: "রেজাল্ট ভেরিফিকেশন",
        course: "",
        quantity: bill.tabulationStudentCount
          ? `${bill.tabulationStudentCount}/${bill.studentDuties.length}`
          : "",
        courseCount: "",
        classTestCount: "",
        rate: "60",
      })
    );
  bill.studentDuties.filter((teacher) => sameTeacher(teacher.name, teacherName)).forEach(() =>
    add({ description: "টেবুলেশন", course: "", quantity: String(bill.tabulationStudentCount || ""), courseCount: "", classTestCount: "", rate: "90", minimumAmount: 1500 })
  );
  bill.questionWorks.filter((teacher) => sameTeacher(teacher.name, teacherName)).forEach(() =>
    add({ description: "প্রশ্নপত্র টাইপ, অঙ্কন ও তুলনা, প্রশ্নপত্র ছাপানো", course: "", quantity: `${bill.questionWorkTotal || 5}/${bill.questionWorks.filter((teacher) => teacher.name.trim()).length || 1}`, courseCount: "", classTestCount: "", rate: "2400" })
  );
  if (isThesisApplicable(bill)) {
    const thesisVivaFormula = computeThesisVivaFormula(
      flattenBoardViva(
        bill.sessionalDuties,
        bill.vivaBoardTeachers,
        Number(bill.billInfo.totalStudents) || "",
        bill.boardVivaMemberOrder ?? []
      ),
      bill.thesisTeachers
    );
    bill.thesisTeachers
      .filter((teacher) => sameTeacher(teacher.name, teacherName))
      .forEach((teacher) => {
      if (teacher.supervisorCount !== "") {
        add({
          description: "থিসিস সুপারভিশন",
          course: "",
          quantity: String(teacher.supervisorCount),
          courseCount: "",
          classTestCount: "",
          rate: "6000",
        });
      }
      if (teacher.examinerCount !== "") {
        add({
          description: "পরীক্ষক (বহিঃ)",
          course: "",
          quantity: String(teacher.examinerCount),
          courseCount: "",
          classTestCount: "",
          rate: "4000",
        });
      }
      if (teacher.attendsViva) {
        add({
          description: "মৌখিক পরীক্ষা (ফাইনাল)",
          course: "",
          quantity: thesisVivaFormula,
          courseCount: "",
          classTestCount: "",
          rate: "250",
        });
      }
      });
  }
  if (isPracticalSurveyingApplicable(bill)) {
    bill.practicalSurveyingTeachers
      .filter((teacher) => sameTeacher(teacher.name, teacherName))
      .forEach(() =>
        add({
          description: "ইঞ্জিনিয়ারিং সার্ভে",
          course: "CE 1226",
          quantity: bill.practicalSurveyingStudentCount
            ? `${bill.practicalSurveyingStudentCount}/${bill.practicalSurveyingTeachers.filter((teacher) => teacher.name.trim()).length || 1}`
            : "",
          courseCount: "1",
          classTestCount: "",
          rate: "1000",
        })
      );
  }
  if (isVerificationApplicable(bill)) {
    bill.verificationTeachers
      .filter((teacher) => sameTeacher(teacher.name, teacherName))
      .forEach(() =>
        add({
          description: "ফাইনাল গ্রাজুয়েশন রেজাল্ট ভেরিফিকেশন",
          course: "",
          quantity: bill.verificationStudentCount
            ? `${bill.verificationStudentCount}/${bill.verificationTeachers.filter((teacher) => teacher.name.trim()).length || 1}`
            : "",
          courseCount: "",
          classTestCount: "",
          rate: "2500",
        })
      );
  }
  const namedCourseAdviserCount = bill.courseAdvisers.filter(
    (adviser) => adviser.name.trim()
  ).length;
  bill.courseAdvisers
    .filter((adviser) => sameTeacher(adviser.name, teacherName))
    .forEach(() =>
      add({
        description: "কোর্স এডভাইজার",
        course: "",
        quantity: bill.courseAdviserStudentCount
          ? namedCourseAdviserCount > 1
            ? `${bill.courseAdviserStudentCount}/${namedCourseAdviserCount}`
            : bill.courseAdviserStudentCount
          : "",
        courseCount: "",
        classTestCount: "",
        rate: "225",
      })
    );
  if (isThesisApplicable(bill)) {
    bill.courseCoordinatorTeachers
      .filter((coordinator) => sameTeacher(coordinator.name, teacherName))
      .forEach(() => add({ description: "কোর্স কো-অর্ডিনেটর", course: "", quantity: "", courseCount: "1", classTestCount: "", rate: "2500" }));
  }
  return rows;
}

export interface RemunerationChartRow {
  id: string;
  description: string;
  duty?: IndividualBillRow;
}

export interface RemunerationChartSection {
  serial: number;
  title: string;
  rows: RemunerationChartRow[];
}

/**
 * Returns the number of consecutive rows that share this description.
 * A zero means the cell is covered by the rowSpan of an earlier row.
 */
export function descriptionRowSpan(
  rows: RemunerationChartRow[],
  rowIndex: number
): number {
  const description = rows[rowIndex]?.description;
  if (rowIndex > 0 && rows[rowIndex - 1]?.description === description) return 0;

  let span = 1;
  while (rows[rowIndex + span]?.description === description) span += 1;
  return span;
}

interface ChartTemplate {
  label: string;
  matches: (description: string) => boolean;
}

const exact = (label: string): ChartTemplate => ({
  label,
  matches: (description) => description === label,
});

/**
 * Keeps the university's complete remuneration chart visible. A template row
 * is retained when no matching duty exists; repeated duties expand beneath the
 * same work-description heading.
 */
export function buildRemunerationChart(
  duties: IndividualBillRow[]
): RemunerationChartSection[] {
  const templates: { title: string; items: ChartTemplate[] }[] = [
    { title: "প্রশ্নপত্র প্রণয়ন", items: [exact("প্রশ্নপত্র প্রণয়ন")] },
    {
      title: "প্রশ্নপত্র নিয়ামক (মডারেশন)",
      items: [exact("পরীক্ষা কমিটির সভাপতি"), exact("পরীক্ষা কমিটির সদস্য")],
    },
    {
      title: "উত্তরপত্র পরীক্ষণ",
      items: [
        exact("সেমিস্টার ফাইনাল"),
        exact("ক্লাস টেস্ট"),
        exact("এসাইনমেন্ট / প্রেজেন্টেশন"),
        exact("কোর্স ফাইল প্রস্তুতকরণ"),
      ],
    },
    {
      title: "ব্যবহারিক / সেশনাল",
      items: [
        exact("ইঞ্জিনিয়ারিং সার্ভে"),
        exact("সেমিনার"),
        exact("প্রজেক্ট ডিজাইন"),
        exact("সেশনাল (১.৫)"),
        exact("সেশনাল (০.৭৫)"),
        exact("ইন্ডাস্ট্রিয়াল অ্যাটাচমেন্ট"),
        exact("ভাইভা (সেন্ট্রাল/বোর্ড)"),
      ],
    },
    {
      title: "থিসিস/প্রজেক্ট পরীক্ষক",
      items: [
        exact("থিসিস সুপারভিশন"),
        exact("পরীক্ষক (বহিঃ)"),
        exact("মৌখিক পরীক্ষা (ফাইনাল)"),
      ],
    },
    {
      title: "টেবুলেশন",
      items: [
        exact("টেবুলেশন"),
        exact("রেজাল্ট প্রস্তুতকরণ"),
        exact("রেজাল্ট ভেরিফিকেশন"),
      ],
    },
    {
      title: "অন্যান্য",
      items: [
        exact("ফাইনাল গ্রাজুয়েশন রেজাল্ট ভেরিফিকেশন"),
        exact("কোর্স এডভাইজার"),
        exact("কোর্স কো-অর্ডিনেটর"),
      ],
    },
    { title: "স্ক্রুটিনি", items: [exact("স্ক্রুটিনি")] },
    {
      title: "প্রশ্নপত্র প্রস্তুতকরণ",
      items: [
        exact("প্রশ্নপত্র টাইপ, অঙ্কন ও তুলনা, প্রশ্নপত্র ছাপানো"),
      ],
    },
  ];

  const used = new Set<string>();
  const sections = templates.map((section, sectionIndex) => ({
    serial: sectionIndex + 1,
    title: section.title,
    rows: section.items.flatMap((item, itemIndex) => {
      const matching = duties.filter(
        (duty) => !used.has(duty.id) && item.matches(duty.description)
      );
      matching.forEach((duty) => used.add(duty.id));
      return matching.length
        ? matching.map((duty) => ({
            id: duty.id,
            description: duty.description,
            duty,
          }))
        : [{
            id: `blank-${sectionIndex}-${itemIndex}`,
            description: item.label,
          }];
    }),
  }));

  const unmatched = duties.filter((duty) => !used.has(duty.id));
  if (unmatched.length) {
    const other = sections[6];
    other.rows.push(
      ...unmatched.map((duty) => ({
        id: duty.id,
        description: duty.description,
        duty,
      }))
    );
  }
  return sections;
}

export function evaluateQuantity(value: string | number | null | undefined): number {
  const normalized = String(value ?? "").trim().replace(/[()\s]/g, "");
  if (!normalized) return 1;
  const parts = normalized.split("/");
  if (parts.length > 2) return 0;
  const product = (part: string) => part.split(/[x×*]/i).map(Number).reduce((result, factor) => Number.isFinite(factor) ? result * factor : 0, 1);
  const numerator = product(parts[0]);
  const denominator = parts[1] ? product(parts[1]) : 1;
  return denominator ? numerator / denominator : 0;
}

export function rowAmount(row: IndividualBillRow): number {
  const rate = Number(row.rate) || 0;
  const quantity = evaluateQuantity(row.quantity);
  const courses = evaluateQuantity(row.courseCount);
  const tests = evaluateQuantity(row.classTestCount);
  const calculatedAmount = Math.round(rate * quantity * courses * tests * 100) / 100;
  return Math.max(row.minimumAmount ?? 0, calculatedAmount);
}

export function isMinimumAmountApplied(row: IndividualBillRow): boolean {
  if (!row.minimumAmount) return false;
  const rate = Number(row.rate) || 0;
  const calculatedAmount =
    rate *
    evaluateQuantity(row.quantity) *
    evaluateQuantity(row.courseCount) *
    evaluateQuantity(row.classTestCount);
  return calculatedAmount < row.minimumAmount;
}

const bengaliNumbers = [
  "শূন্য", "এক", "দুই", "তিন", "চার", "পাঁচ", "ছয়", "সাত", "আট", "নয়",
  "দশ", "এগারো", "বারো", "তেরো", "চৌদ্দ", "পনেরো", "ষোলো", "সতেরো", "আঠারো", "উনিশ",
  "বিশ", "একুশ", "বাইশ", "তেইশ", "চব্বিশ", "পঁচিশ", "ছাব্বিশ", "সাতাশ", "আটাশ", "ঊনত্রিশ",
  "ত্রিশ", "একত্রিশ", "বত্রিশ", "তেত্রিশ", "চৌত্রিশ", "পঁয়ত্রিশ", "ছত্রিশ", "সাঁইত্রিশ", "আটত্রিশ", "ঊনচল্লিশ",
  "চল্লিশ", "একচল্লিশ", "বিয়াল্লিশ", "তেতাল্লিশ", "চুয়াল্লিশ", "পঁয়তাল্লিশ", "ছেচল্লিশ", "সাতচল্লিশ", "আটচল্লিশ", "ঊনপঞ্চাশ",
  "পঞ্চাশ", "একান্ন", "বাহান্ন", "তিপ্পান্ন", "চুয়ান্ন", "পঞ্চান্ন", "ছাপ্পান্ন", "সাতান্ন", "আটান্ন", "ঊনষাট",
  "ষাট", "একষট্টি", "বাষট্টি", "তেষট্টি", "চৌষট্টি", "পঁয়ষট্টি", "ছেষট্টি", "সাতষট্টি", "আটষট্টি", "ঊনসত্তর",
  "সত্তর", "একাত্তর", "বাহাত্তর", "তিয়াত্তর", "চুয়াত্তর", "পঁচাত্তর", "ছিয়াত্তর", "সাতাত্তর", "আটাত্তর", "ঊনআশি",
  "আশি", "একাশি", "বিরাশি", "তিরাশি", "চুরাশি", "পঁচাশি", "ছিয়াশি", "সাতাশি", "আটাশি", "ঊননব্বই",
  "নব্বই", "একানব্বই", "বিরানব্বই", "তিরানব্বই", "চুরানব্বই", "পঁচানব্বই", "ছিয়ানব্বই", "সাতানব্বই", "আটানব্বই", "নিরানব্বই",
] as const;

function integerInBanglaWords(value: number): string {
  if (value < 100) return bengaliNumbers[value];
  const groups: [number, string][] = [[10000000, "কোটি"], [100000, "লক্ষ"], [1000, "হাজার"], [100, "শত"]];
  let remainder = value;
  const words: string[] = [];
  groups.forEach(([unit, label]) => {
    const count = Math.floor(remainder / unit);
    if (count) {
      words.push(`${integerInBanglaWords(count)} ${label}`);
      remainder %= unit;
    }
  });
  if (remainder) words.push(bengaliNumbers[remainder]);
  return words.join(" ");
}

export function amountInBanglaWords(input: number): string {
  const totalPaisa = Math.max(0, Math.round(input * 100));
  const taka = Math.floor(totalPaisa / 100);
  const paisa = totalPaisa % 100;
  const takaWords = `${integerInBanglaWords(taka)} টাকা`;
  return paisa ? `${takaWords} ${integerInBanglaWords(paisa)} পয়সা` : takaWords;
}
