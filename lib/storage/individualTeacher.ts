const STORAGE_KEY = "individualTeacherInformation";

export interface SavedIndividualTeacherInformation {
  englishName?: string;
  departmentKey?: string;
  nameBangla: string;
  designationBangla: string;
  addressBangla: string;
  accountNumber: string;
}

type TeacherInformationIndex = Record<string, SavedIndividualTeacherInformation>;

const teacherKey = (teacherName: string) => teacherName.trim().toLocaleLowerCase();

function loadIndex(): TeacherInformationIndex {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
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
