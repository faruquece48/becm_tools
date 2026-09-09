import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { mkdir, writeFile } from 'node:fs/promises';

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });
try {
  const sections = await prisma.$queryRawUnsafe('SELECT "section", "data", "updatedAt" FROM "ResultSectionStore"');
  const folder = '.next/marks-recovery/' + new Date().toISOString().replace(/[:.]/g, '-');
  await mkdir(folder, { recursive: true });
  await writeFile(folder + '/backup.json', JSON.stringify(sections));
  const summary = sections.filter(section => /prepare-result|marks-sheet|registration|tabulation/.test(section.section)).map(section => {
    const records = Array.isArray(section.data) ? section.data : [];
    const exam = records.filter(record => record.examYear === '2024' && record.academicYear === '4th');
    const marks = exam.flatMap(record => record.students || [record]);
    return { section: section.section, updatedAt: section.updatedAt, totalRecords: records.length, examRecords: exam.length,
      students: new Set(marks.map(mark => mark.studentId || mark.id).filter(Boolean)).size,
      enteredMarks: marks.filter(mark => ['partA', 'partB', 'classTestAttendance', 'sessional', 'marks'].some(field => String(mark[field] ?? '').trim() !== '')).length,
      latestMarkUpdate: exam.map(record => record.updatedAt || '').sort().at(-1),
    };
  });
  console.log(JSON.stringify({ backup: folder + '/backup.json', summary }, null, 2));
} catch (error) {
  console.error('Read-only recovery audit failed:', error.code || error.name);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
