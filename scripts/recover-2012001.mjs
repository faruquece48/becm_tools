import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });
try {
  const rows = await prisma.$queryRawUnsafe('SELECT "section", "data" FROM "ResultSectionStore"');
  const data = Object.fromEntries(rows.map(row => [row.section, row.data]));
  const folder = '.next/recovery-2012001/' + new Date().toISOString().replace(/[:.]/g, '-');
  await mkdir(folder, { recursive: true });
  await writeFile(folder + '/backup.json', JSON.stringify(data));
  const candidates = [];
  function discover(value, section, path = '') {
    if (!value || typeof value !== 'object') return;
    if (value.rollNo === '2012001' || value.roll === '2012001') candidates.push({ section, path, value });
    for (const [key, child] of Object.entries(value)) if (child && typeof child === 'object') discover(child, section, path + '/' + key);
  }
  for (const row of rows) discover(row.data, row.section);
  const ids = new Set(candidates.flatMap(item => [item.value.id, item.value.studentId]).filter(Boolean));
  const matches = [];
  function find(value, section, context = {}) {
    if (!value || typeof value !== 'object') return;
    const next = { ...context };
    for (const key of ['examYear', 'academicYear', 'semester', 'courseCode', 'courseId']) if (value[key]) next[key] = value[key];
    if (ids.has(value.studentId) || ids.has(value.id) || value.rollNo === '2012001') matches.push({ section, ...next, value });
    for (const child of Object.values(value)) if (child && typeof child === 'object') find(child, section, next);
  }
  for (const row of rows) find(row.data, row.section);
  await writeFile(folder + '/matches.json', JSON.stringify(matches, null, 2));
  if (process.argv.includes('--apply')) {
    const source = JSON.parse(await readFile('.next/2021-series-2023-second-year-correction/2026-09-06T06-34-27-939Z/backup.json', 'utf8'));
    const original = source['student-directory'].filter(student => student.rollNo === '2012001');
    if (original.length !== 1 || original[0].id !== '3c0930c0-ff01-4ab3-8732-73370293b3c5') throw Error('Original identity is ambiguous.');
    const student = original[0];
    const semesters = new Set(matches.filter(item => item.section === 'marks-sheet' && item.value.studentId === student.id).map(item => item.academicYear + '/' + item.semester));
    if (semesters.size !== 8 || !semesters.has('4th/Even')) throw Error('Expected semester records are missing.');
    if (data['student-directory'].some(item => item.id === student.id || item.rollNo === student.rollNo)) throw Error('Student already exists; no changes made.');
    const restored = [...data['student-directory'], student];
    await prisma.$transaction(async tx => {
      const locked = await tx.$queryRawUnsafe('SELECT "section", "data" FROM "ResultSectionStore" ORDER BY "section" FOR UPDATE');
      if (!isDeepStrictEqual(Object.fromEntries(locked.map(row => [row.section, row.data])), data)) throw Error('Database changed during recovery; rerun.');
      await tx.$executeRawUnsafe('UPDATE "ResultSectionStore" SET "data"=CAST($1 AS jsonb), "updatedAt"=NOW() WHERE "section"=$2', JSON.stringify(restored), 'student-directory');
    }, { timeout: 30000 });
    const verified = await prisma.$queryRawUnsafe('SELECT "section", "data" FROM "ResultSectionStore"');
    const expected = { ...data, 'student-directory': restored };
    if (!isDeepStrictEqual(Object.fromEntries(verified.map(row => [row.section, row.data])), expected)) throw Error('Read-back verification mismatch.');
    console.log(JSON.stringify({ recovered: student.name, roll: student.rollNo, semesters: [...semesters], verified: true, backup: folder }));
    await writeFile(folder + '/restored-student.json', JSON.stringify(student, null, 2));
  }
  console.log(JSON.stringify({ folder, directory: candidates.filter(item => item.section.includes('student')), sections: rows.map(row => ({ section: row.section, matches: matches.filter(item => item.section === row.section).length })), archives: matches.filter(item => ['marks-sheet', 'result-sheet', 'result-sheet-backlog'].includes(item.section)) }, null, 2));
} finally { await prisma.$disconnect(); }
