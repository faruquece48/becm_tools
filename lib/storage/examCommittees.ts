export type ExamCommitteeRecord = {
  id: string;
  examType: "Regular" | "Backlog";
  examYear: string;
  academicYear: string;
  semester: "Odd" | "Even" | "";
  chairman: string;
  member1: string;
  member2: string;
  member3: string;
  member4: string;
  examDate: string;
  resultPublishDate: string;
  memoNo: string;
  memoDate: string;
  resultNote: string;
};

type Seed = [string, "Regular" | "Backlog", string, string, "Odd" | "Even" | "", string, string, string, string, string, string, string, string, string, string?];
const seeds: Seed[] = [
  ["1","Regular","2021","1st","Odd","Dr. Md. Robiul Awall","Mohd. Abdus Sobhan","Dr. Mohammad Kamrul Hasan","Dr. Md. Abbas Ali","Dr. Md. Sazzad Hossain","2022-08-17","2023-04-08","3769/35","2023-04-11"],
  ["2","Regular","2021","1st","Even","Dr. Md. Robiul Awall","Dr. Md. Bellal Hossain","Prof. Dr. Md. Abdul Kader Zilani","Mr. Faruque Abdullah","Dr. Tarif Uddin Ahmed","2023-01-11","2023-09-30","1305/35","2023-10-03"],
  ["3","Regular","2022","1st","Odd","Dr. Md. Robiul Awall","Dr. Md. Shamsul Alam","Dr. Md. Nuruzzaman","Mr. Aojoy Kumar Shuvo","Dr. Md. Al-Amin-Al-Azadul Islam","2023-05-24","2023-10-17","1600/35","2023-10-17"],
  ["4","Backlog","2021","1st","","Dr. Md. Robiul Awall","Dr. Md. Majedur Rahman","Dr. Md. Nuruzzaman","Mr. Faruque Abdullah","Dr. Md. Al-Amin-Al-Azadul Islam","2023-05-13","2023-06-24","299/35","2023-08-09"],
  ["5","Regular","2022","2nd","Odd","Dr. Md. Robiul Awall","Md. Abu Bokar Siddique","Md. Asaduzzaman","Mr. Faruque Abdullah","Dr. Md. Majedur Rahman","2023-08-09","2023-11-26","2921/35","2023-12-18"],
  ["6","Regular","2022","1st","Even","Dr. Md. Robiul Awall","Dr. Md. Bellal Hossain","Dr. Saila Ahmed","Mr. Mehedi Hasan","Dr. Md. Sazzad Hossain","2023-11-01","2024-01-22","3894/35","2024-01-29"],
  ["7","Regular","2022","2nd","Even","Dr. Md. Robiul Awall","Md. Sabbir Ahsan","Md. Golam Mostakim","Mr. Mehedi Hasan","Dr. Md. Saifur Rahman","2024-01-02","2024-03-05","","2024-03-05"],
  ["8","Backlog","2022","1st","","Dr. Md. Robiul Awall","Dr. Mohammad Kamrul Hasan","Prof. Dr. Md. Abdul Kader Zilani","Mr. Faruque Abdullah","Dr. Md. Ashraful Alam","2024-03-12","2024-03-27","5111/35","2024-03-27"],
  ["9","Regular","2023","1st","Odd","Dr. Md. Robiul Awall","Prof. Dr. Md. Al-Amin-Al-Azadul Islam","Dr. Md. Nuruzzaman","Mr. Faruque Abdullah","Dr. Md. Shamsul Alam","2024-02-13","2024-04-03","5309/35","2024-04-03"],
  ["10","Backlog","2022","2nd","","Dr. Md. Robiul Awall","Dr. Md. Feruj Alam","Mr. Mehedi Hasan","Mr. Faruque Abdullah","Dr. Md. Abdul Alim","2024-05-15","2024-08-13","567/35","2024-08-13"],
  ["11","Regular","2023","2nd","Odd","Ashadul Islam","Kaniz Fatema","Mr. Mehedi Hasan","Mr. Faruque Abdullah","Dr. Md. Alal Hosen","2024-06-05","2025-06-21","1580/35","2025-06-21"],
  ["12","Regular","2023","3rd","Odd","Ashadul Islam","Dr. H. M. Rasel","Mr. Mehedi Hasan","Mr. Faruque Abdullah","Dr. Md. Basir Zisan","2024-09-25","2024-11-05","2004/35","2024-11-05"],
  ["13","Regular","2023","1st","Even","Ashadul Islam","Dr. Md. Bellal Hossain","Dr. Saila Ahmed","Mr. Mehedi Hasan","Dr. Md. Abdul Kader Zilani","2024-10-30","2024-12-28","2756/35","2024-12-28"],
  ["14","Regular","2023","2nd","Even","Mrs. Shayla Sharmin","Mr. Mehedi Hasan","Mr. Faruque Abdullah","Md. Golam Mostakim","Dr. Md. Majedur Rahman","2025-01-22","2025-06-21","3335","2025-06-21"],
  ["15","Regular","2024","3rd","Odd","Mrs. Shayla Sharmin","Dr. Md. Abu Sayeed","Mr. Faruque Abdullah","Mr. Md. Ashraful Islam","Dr. H. M. Rasel","2025-08-06","2025-09-23","","2025-09-23"],
  ["16","Backlog","2023","1st","","Mrs. Shayla Sharmin","Dr. Md. Ashraful Alam","Mr. Mehedi Hasan","Mr. Faruque Abdullah","Dr. Mohammad Kamrul Hasan","2025-02-17","2025-06-21","3035/21","2025-06-21"],
  ["17","Regular","2023","3rd","Even","Mrs. Shayla Sharmin","Dr. N.H.M. Kamrujjaman Serker","Mr. Mehedi Hasan","Mr. Faruque Abdullah","Dr. Md. Mahmud Sazzad","2025-02-24","2025-07-23","441/35","2025-07-27"],
  ["18","Regular","2024","1st","Odd","Mrs. Shayla Sharmin","Md. Faruk Hossain","Md. Zahangir Alam","Mr. Faruque Abdullah","Dr. Md. Mayeedul Islam","2025-02-25","2025-06-24","5309","2025-06-28"],
  ["19","Backlog","2023","2nd","","Mrs. Shayla Sharmin","Dr. Md. Feruj Alam","Mr. Mehedi Hasan","Mr. Faruque Abdullah","Dr. Md. Abdul Alim","2025-06-18","2025-07-01","","2025-07-01"],
  ["20","Regular","2024","2nd","Odd","Mrs. Shayla Sharmin","Kaniz Fatema","Mr. Faruque Abdullah","Mr. Md. Ashraful Islam","Dr. Md. Shamsul Alam","2025-06-18","2025-08-12","","2025-08-12"],
  ["21","Backlog","2023","3rd","","Mrs. Shayla Sharmin","Dr. Abu Sufian Md. Zia Hasan","Mr. Mehedi Hasan","Mr. Faruque Abdullah","Dr. Md. Shafiqul Islam","2025-08-13","2025-09-10","","2025-09-10"],
  ["22","Regular","2025","1st","Even","Mrs. Shayla Sharmin","Dr. Md. Johirul Islam","Dr. Saila Ahmed","Mr. Mehedi Hasan","Dr. Md. Alal Hosen","2025-09-23","2025-12-03","2323","2025-12-03"],
  ["23","Regular","2024","1st","Even","Mrs. Shayla Sharmin","Dr. Md. Johirul Islam","Dr. Saila Ahmed","Mr. Mehedi Hasan","Dr. Md. Alal Hosen","2025-09-23","2025-12-03","2492/35","2025-12-03"],
  ["24","Regular","2024","4th","Odd","Mrs. Shayla Sharmin","Dr. Md. Niamul Bari","Mr. Faruque Abdullah","Mr. Md. Ashraful Islam","Dr. Md. Mahmud Sazzad","2025-09-23","2025-12-10","8738758397","2025-12-13"],
  ["25","Regular","2025","1st","Odd","Head","Md. Saifur Rahman","Dr. Md. Johirul Islam","Mr. Nur Alam Riad","Dr. Md. Abbas Ali","2025-09-23","2025-12-17","5309/35","2025-12-17"],
  ["26","Regular","2024","2nd","Even","Mrs. Shayla Sharmin","Dr. Md. Helal Uddin Molla","Mr. Mehedi Hasan","Mr. Aojoy Kumar Shuvo","Dr. Mst. Marzina Begum","2025-11-19","2026-01-20","5309","2026-01-20"],
  ["27","Backlog","2024","1st","","Mrs. Shayla Sharmin","Dr. Md. Alal Hosen","Md. Mehedi Hasan","Mr. Md. Ashraful Islam","Dr. Md. Motahar Hossain","2026-02-03","2026-02-16","5309","2026-02-16"],
  ["28","Regular","2024","3rd","Even","Mrs. Shayla Sharmin","Mr. Mehedi Hasan","Mr. Faruque Abdullah","Mr. Md. Ashraful Islam","Dr. Md. Abdul Alim","2026-01-20","2026-05-05","5309","2026-04-20"],
  ["29","Backlog","2024","2nd","","Mrs. Shayla Sharmin","Mr. Faruque Abdullah","Mr. Md. Ashraful Islam","Mr. Nur Alam Riad","Dr. Md. Bellal Hossain","2026-04-21","2026-05-17","1350","2026-05-17"],
  ["30","Regular","2024","4th","Even","Mrs. Shayla Sharmin","Dr. S.M. Zahurul Islam","Dr. Md. Robiul Awall","Mr. Aojoy Kumar Shuvo","Dr. Md. Mokhlesur Rahman","2026-04-29","2026-07-18","11","2026-07-22"],
  ["31","Regular","2025","1st","Even","Head","Dr. Md. Nuruzzaman","Dr. Saila Ahmed","Mr. Mehedi Hasan","Dr. Md. Bellal Hossain","2026-05-06","2026-07-21","530","2026-07-21"],
  ["32","Backlog","2024","3rd","","Mrs. Shayla Sharmin","Mr. Mehedi Hasan","Mr. Aojoy Kumar Shuvo","Mr. Md. Ashraful Islam","Dr. N.H.M. Kamrujjaman Serker","2026-06-17","2026-08-03","5309","2026-08-03"],
  ["33","Regular","2025","2nd","Odd","Mrs. Shayla Sharmin","Kaniz Fatema","Mr. Mehedi Hasan","Mr. Faruque Abdullah","Dr. Md. Alal Hosen","2026-05-13","2026-07-29","1","2026-07-29"],
  ["34","Regular","2025","3rd","Odd","Mrs. Shayla Sharmin","Mr. Faruque Abdullah","Mr. Md. Ashraful Islam","Mr. Nur Alam Riad","Dr. Md. Shafiqul Islam","2026-06-24","2026-08-23","123","2026-08-23"],
];

export const defaultExamCommitteeRecords: ExamCommitteeRecord[] = seeds.map(([id, examType, examYear, academicYear, semester, chairman, member1, member2, member3, member4, examDate, resultPublishDate, memoNo, memoDate, resultNote = ""]) => ({ id, examType, examYear, academicYear, semester, chairman, member1, member2, member3, member4, examDate, resultPublishDate, memoNo, memoDate, resultNote }));

export async function loadExamCommittees(): Promise<ExamCommitteeRecord[]> {
  const response = await fetch("/api/exam-committees", { cache: "no-store" });
  const payload = await response.json().catch(() => null) as { data?: ExamCommitteeRecord[]; error?: string } | null;
  if (!response.ok || !payload?.data) throw new Error(payload?.error || "Unable to load exam committees");
  return payload.data;
}

export async function saveExamCommittees(records: ExamCommitteeRecord[]): Promise<ExamCommitteeRecord[]> {
  const response = await fetch("/api/exam-committees", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: records }) });
  const payload = await response.json().catch(() => null) as { data?: ExamCommitteeRecord[]; error?: string } | null;
  if (!response.ok || !payload?.data) throw new Error(payload?.error || "Unable to save exam committees");
  return payload.data;
}
