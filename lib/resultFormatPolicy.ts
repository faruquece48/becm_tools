export const LEGACY_RESULT_FORMAT_CUTOFF = "2026-07-17";
export const OBE_GRADUATION_CREDIT = 163.5;
export const NON_OBE_GRADUATION_CREDIT = 161;
export const GRADUATION_CREDIT = OBE_GRADUATION_CREDIT;

export function graduationCreditForSeries(series: string | number) {
  return Number(series) >= 2020 ? OBE_GRADUATION_CREDIT : NON_OBE_GRADUATION_CREDIT;
}

function comparableDate(value?: string) {
  if (!value) return "";
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const display = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (display) return `${display[3]}-${display[2].padStart(2, "0")}-${display[1].padStart(2, "0")}`;
  return "";
}

export function usesLegacyResultFormat(resultPublishDate?: string) {
  const date = comparableDate(resultPublishDate);
  return !date || date <= LEGACY_RESULT_FORMAT_CUTOFF;
}

export function completionStatus(cgpa: number, legacy: boolean) {
  if (!legacy) return "Passed";
  if (cgpa >= 3) return "First Class";
  if (cgpa >= 2.5) return "Second Class";
  if (cgpa >= 2.2) return "Third Class";
  return "";
}

export function roundedCgpaHundredths(cgpa: number) {
  return Math.round((cgpa + Number.EPSILON) * 100);
}

export function topTenCompetitionRanks(cgpas: number[]) {
  const ranks = new Map<number, number>();
  const distinctCgpas = [...new Set(cgpas.map(roundedCgpaHundredths))].sort((left, right) => right - left);
  distinctCgpas.slice(0, 10).forEach((cgpa, index) => ranks.set(cgpa, index + 1));
  return ranks;
}

export function ordinalRank(rank: number) {
  const remainder100 = rank % 100;
  if (remainder100 >= 11 && remainder100 <= 13) return `${rank}th`;
  if (rank % 10 === 1) return `${rank}st`;
  if (rank % 10 === 2) return `${rank}nd`;
  if (rank % 10 === 3) return `${rank}rd`;
  return `${rank}th`;
}

export function rankedPassedStatus(cgpa: number, ranks: Map<number, number>) {
  const rank = ranks.get(roundedCgpaHundredths(cgpa));
  return rank ? `Passed (${ordinalRank(rank)})` : "Passed";
}
