const STORAGE_KEY = "individualTeacherInformation";

export interface SavedIndividualTeacherInformation {
  englishName?: string;
  departmentKey?: string;
  nameBangla: string;
  designationBangla: string;
  addressBangla: string;
  accountNumber: string;
  email?: string;
}

type TeacherInformationIndex = Record<string, SavedIndividualTeacherInformation>;

const CE_ADDRESS = "পুরকৌশল বিভাগ, রুয়েট।";
const teacherKey = (teacherName: string) => teacherName.normalize("NFKC").trim().replace(/\s+/gu, " ").toLocaleLowerCase();
const ceTeacher = (englishName: string, nameBangla: string, designationBangla: string, email: string): SavedIndividualTeacherInformation => ({
  englishName, departmentKey: "ce", nameBangla, designationBangla, addressBangla: CE_ADDRESS, accountNumber: "", email,
});
const ceTeacherInformation = [
  ceTeacher("Dr. Md. Abdul Alim", "", "অধ্যাপক", "maalim89@yahoo.com"),
  ceTeacher("Dr. NHM Kamrujjaman Serker", "এন. এইচ. এম. কামরুজ্জামান সরকার", "অধ্যাপক", "kserker@yahoo.com"),
  ceTeacher("Dr. Md. Kumruzzaman (1)", "মোঃ কামরুজ্জামান রিপন", "অধ্যাপক", "kzzaman2000@gmail.com"),
  ceTeacher("Dr. Md. Niamul Bari", "", "অধ্যাপক", "niamulbari@yahoo.com"),
  ceTeacher("Dr. Md. Kamruzzaman (2)", "", "অধ্যাপক", "kzaman93@gmail.com"),
  ceTeacher("Dr. Md. Mahmud Sazzad", "ড. মোঃ মাহমুদ সাজ্জাদ", "অধ্যাপক", "mmsruet@gmail.com"),
  ceTeacher("Dr. Md. Akhtar Hossain", "ড. মোঃ আখতার হোসেন", "অধ্যাপক", "akhtar412002@yahoo.com"),
  ceTeacher("Dr. Md. Shafiqul Islam", "", "অধ্যাপক", "islam94001@yahoo.com"),
  ceTeacher("Dr. Md. Robiul Awall", "ড. মোঃ রবিউল আওয়াল", "অধ্যাপক", "robi95@gmail.com"),
  ceTeacher("Dr. Abu Sufian Md. Zia Hasan", "", "অধ্যাপক", "ziaruet@gmail.com"),
  ceTeacher("Dr. H. M. Rasel", "ড. এইচ. এম. রাসেল", "অধ্যাপক", "hmruetce02@gmail.com"),
  ceTeacher("Dr. Md. Abu Sayeed", "", "অধ্যাপক", "sayeed.ce00@gmail.com"),
  ceTeacher("Dr. Md. Zahangir Alam", "মোঃ জাহাঙ্গীর আলম", "অধ্যাপক", "zahangir02@gmail.com"),
  ceTeacher("Dr. Anupam Chowdhury", "", "অধ্যাপক", "anupam19ce@gmail.com"),
  ceTeacher("Md. Rafiul Islam", "মোঃ রাফিউল ইসলাম", "সহকারী অধ্যাপক", "rafiulislam.1500080@gmail.com"),
  ceTeacher("Sumaya Tabassum", "সুমাইয়া তাবাসসুম", "সহকারী অধ্যাপক", "sumayatabassum161@gmail.com"),
  ceTeacher("Mohammad Ali", "মোহাম্মদ আলী", "প্রভাষক", "ali433427@gmail.com"),
  ceTeacher("Abu Shad", "আবু সাদ", "প্রভাষক", ""),
  ceTeacher("Shraboni Rani Paul", "শ্রাবনী রানী পাল", "প্রভাষক", "shrabonipaul.ce19@gmail.com"),
  ceTeacher("Atonu Saha", "অতনু সাহা", "প্রভাষক", "atonusaha2002@gmail.com"),
  ceTeacher("Briti Ray", "", "প্রভাষক", "britirayce29@gmail.com"),
  ceTeacher("Ragib Noor Srijan", "", "প্রভাষক", "ragibnoor7108@gmail.com"),
];
export const defaultTeacherInformation: TeacherInformationIndex = Object.fromEntries(
  ceTeacherInformation.map((teacher) => [teacherKey(teacher.englishName ?? ""), teacher]),
);
export function mergeDefaultTeacherInformation(value: unknown): TeacherInformationIndex {
  const saved = value && typeof value === "object" && !Array.isArray(value) ? value as TeacherInformationIndex : {};
  return { ...defaultTeacherInformation, ...saved };
}

function loadIndex(): TeacherInformationIndex {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return mergeDefaultTeacherInformation(raw ? JSON.parse(raw) : {});
  } catch {
    return defaultTeacherInformation;
  }
}

export function loadIndividualTeacherInformation(
  teacherName: string
): SavedIndividualTeacherInformation | null {
  return loadIndex()[teacherKey(teacherName)] ?? null;
}

export function saveIndividualTeacherInformation(
  teacherName: string,
  information: SavedIndividualTeacherInformation
): boolean {
  try {
    const index = loadIndex();
    index[teacherKey(teacherName)] = information;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(index));
    return true;
  } catch {
    return false;
  }
}

export function loadAllIndividualTeacherInformation(): TeacherInformationIndex {
  return loadIndex();
}

export function saveAllIndividualTeacherInformation(index: TeacherInformationIndex): boolean {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(index)); return true; } catch { return false; }
}

export function getSavedIndividualTeacherNames(): string[] {
  return Object.entries(loadIndex()).map(([key, information]) =>
    information.englishName?.trim() ||
    key.replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase())
  );
}
