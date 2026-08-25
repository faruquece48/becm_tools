import type { ExaminationBillData } from "@/app/bills/create/components/types";

const STORAGE_PREFIX = "examBillDraft:";
const INDEX_KEY = "examBillDraftIndex";

export interface DraftMeta {
  name: string;
  savedAt: string;
}

function getIndex(): DraftMeta[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setIndex(index: DraftMeta[]) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

export function saveDraft(name: string, data: ExaminationBillData): void {
  const key = STORAGE_PREFIX + name;
  localStorage.setItem(key, JSON.stringify(data));

  const index = getIndex().filter((d) => d.name !== name);
  index.push({ name, savedAt: new Date().toISOString() });
  setIndex(index);
}

export function loadDraft(name: string): ExaminationBillData | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + name);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function listDrafts(): DraftMeta[] {
  return getIndex().sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );
}

export function deleteDraft(name: string): void {
  localStorage.removeItem(STORAGE_PREFIX + name);
  setIndex(getIndex().filter((d) => d.name !== name));
}

const CURRENT_WORK_KEY = "examBillDraft:__current__";

export function saveCurrentWork(data: ExaminationBillData): void {
  try {
    localStorage.setItem(CURRENT_WORK_KEY, JSON.stringify(data));
  } catch {
    // localStorage might be full or unavailable; fail silently
  }
}

export function loadCurrentWork(): ExaminationBillData | null {
  try {
    const raw = localStorage.getItem(CURRENT_WORK_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearCurrentWork(): void {
  localStorage.removeItem(CURRENT_WORK_KEY);
}