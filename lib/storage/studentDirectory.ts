export type BacklogEligibility = { examYear: string; academicYear: string; semester: "Odd" | "Even"; createdAt: string };

export type StudentDirectoryRecord = {
  id: string;
  department: string;
  series: string;
  year: string;
  semester: string;
  section: string;
  name: string;
  rollNo: string;
  registrationNo: string;
  fatherName: string;
  motherName: string;
  localGuardian: string;
  gender: string;
  birthDate: string;
  backlogEligibility?: BacklogEligibility[];
};

export const departmentName = "Building Engineering & Construction Management";
export const academicYears = ["1st", "2nd", "3rd", "4th"];
export const semesters = ["Odd", "Even", "Short Semester"];
