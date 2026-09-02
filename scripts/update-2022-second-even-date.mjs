import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });
const matches = (record) => record.examType === "Regular" && record.examYear === "2022" && record.academicYear === "2nd" && record.semester === "Even";
const matchesArchive = (record) => record.examYear === "2022" && record.academicYear === "2nd" && record.semester === "Even";

try {
  await prisma.$transaction(async (tx) => {
    const committeeRows = await tx.$queryRawUnsafe('SELECT "data" FROM "ExamCommitteeStore" WHERE "id"=$1', "shared");
    const committees = committeeRows[0]?.data || [];
    let committeeChanges = 0;
    committees.forEach((record) => {
      if (matches(record)) {
        record.resultPublishDate = "2024-03-05";
        committeeChanges += 1;
      }
    });
    if (committeeChanges !== 1) throw new Error(`Expected one committee record, found ${committeeChanges}.`);
    await tx.$executeRawUnsafe('UPDATE "ExamCommitteeStore" SET "data"=CAST($1 AS jsonb), "updatedAt"=NOW() WHERE "id"=$2', JSON.stringify(committees), "shared");

    for (const section of ["marks-sheet", "result-sheet"]) {
      const rows = await tx.$queryRawUnsafe('SELECT "data" FROM "ResultSectionStore" WHERE "section"=$1', section);
      if (!rows.length || !Array.isArray(rows[0].data)) continue;
      const records = rows[0].data;
      let changed = false;
      records.forEach((record) => {
        if (matchesArchive(record)) {
          record.resultPublishDate = "2024-03-05";
          changed = true;
        }
      });
      if (changed) await tx.$executeRawUnsafe('UPDATE "ResultSectionStore" SET "data"=CAST($1 AS jsonb), "updatedAt"=NOW() WHERE "section"=$2', JSON.stringify(records), section);
    }
  });
  console.log("Updated Regular 2022 2nd Year Even result publication date to 2024-03-05.");
} finally {
  await prisma.$disconnect();
}
