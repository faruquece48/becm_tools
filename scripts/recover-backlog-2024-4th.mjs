import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import XLSX from 'xlsx';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

const source = 'C:/Users/Windows 11/Downloads/result-input-Backlog-2024-4th.xlsx';
const backup = '.next/marks-recovery/2026-09-09T10-30-50-299Z/backup.json';
const folder = '.next/marks-recovery/backlog-2024-4th';
const sections = JSON.parse(await readFile(backup, 'utf8'));
const get = name => sections.find(section => section.section === name)?.data || [];
const norm = value => String(value || '').replace(/\s/g, '').toLowerCase();
const exam = record => record.examYear === '2024' && record.academicYear === '4th';
const syllabuses = get('syllabuses'), all = syllabuses.flatMap(segment => segment.courses);
const book = XLSX.readFile(source), sheet = XLSX.utils.sheet_to_json(book.Sheets.Marks, { header: 1, defval: '' });
if (!String(sheet[2][0]).includes('Backlog Examination 2024') || !String(sheet[2][0]).includes('4th Year')) throw Error('Wrong examination');
const records = [], missing = [], seen = new Set(), stamp = new Date().toISOString();
for (const row of sheet.slice(5)) {
  const roll = String(row[1]);
  const special = get('old-student-directory').find(student => norm(student.rollNo) === norm(roll));
  const promotion = special?.promotions.find(item => exam(item) && item.examType === 'Backlog' && item.semester === 'Backlog');
  const registration = get('backlog-registrations').find(item => exam(item) && norm(item.rollNo) === norm(roll));
  const directory = get('student-directory').find(student => student.id === registration?.studentId);
  const student = promotion ? special : directory;
  if (!student) throw Error('Student identity not found for ' + roll);
  const placement = directory?.obeBatchPlacements?.filter(item => item.academicYear === '4th' && Number(item.effectiveExamYear) <= 2024).sort((a,b) => Number(b.effectiveExamYear)-Number(a.effectiveExamYear))[0];
  const series = Number(placement?.series || registration?.series || directory?.series);
  const candidates = promotion ? all.filter(course => promotion.courseIds.includes(course.id)) : syllabuses.filter(segment => segment.active !== false && series >= Number(segment.fromSeries) && series <= Number(segment.toSeries)).flatMap(segment => segment.courses);
  const expected = promotion ? candidates : registration.courses;
  const recovered = new Set();
  for (let column = 4; column < sheet[0].length; column++) {
    const match = String(sheet[0][column]).match(/^(.*) (Odd|Even) Registered$/);
    if (!match || norm(row[column]) !== 'yes') continue;
    const [, code, semester] = match;
    const matching = candidates.filter(course => norm(course.code) === norm(code) && course.semester === semester);
    if (matching.length !== 1) throw Error('Ambiguous syllabus course for ' + roll + ' ' + code);
    const course = matching[0];
    if (!expected.some(item => norm(item.courseCode || item.code) === norm(code) && item.semester === semester)) throw Error('Unregistered course');
    const values = row.slice(column + 1, column + 4).map(value => String(value).trim());
    if (values.every(value => value === '' || value === '-')) continue;
    if (values.some(value => value !== '' && (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 100))) throw Error('Invalid mark');
    const identity = student.id + '|' + semester + '|' + norm(code);
    if (seen.has(identity)) throw Error('Duplicate recovered marks');
    seen.add(identity); recovered.add(semester + '|' + norm(code));
    const [partA, partB, classTestAttendance] = values;
    const score = Math.round(values.reduce((sum,value) => sum + Number(value),0));
    records.push({ id: randomUUID(), studentId: student.id, studentName: student.name, rollNo: student.rollNo, registrationNo: student.registrationNo,
      examYear: '2024', academicYear: '4th', semester, courseId: course.id, courseCode: course.code, courseTitle: course.title,
      present: true, partA, partB, classTestAttendance, marks: String(score), result: Number(partA)+Number(partB)<15 || score<40 ? 'Fail' : 'Pass', remarks: '', updatedAt: stamp });
  }
  for (const course of expected) if (!recovered.has(course.semester + '|' + norm(course.courseCode || course.code))) missing.push({ roll, code: course.courseCode || course.code, semester: course.semester });
}
await mkdir(folder, { recursive: true });
await copyFile(source, folder + '/original-export.xlsx');
await writeFile(folder + '/recovered-records.json', JSON.stringify(records, null, 2));
console.log(JSON.stringify({ records: records.length, students: new Set(records.map(record => record.studentId)).size, missing, incomplete: records.filter(record => [record.partA,record.partB,record.classTestAttendance].some(value => value === '')).map(record => ({ roll: record.rollNo, code: record.courseCode })), prepared: folder }, null, 2));
if (process.argv.includes('--apply')) {
  const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });
  try {
    await prisma.$transaction(async tx => {
      const stored = await tx.$queryRawUnsafe('SELECT "section", "data" FROM "ResultSectionStore" WHERE "section" IN (\'prepare-result-backlog\',\'add-viva-marks\') ORDER BY "section" FOR UPDATE');
      const existing = stored.find(row => row.section === 'prepare-result-backlog')?.data || [];
      const publications = stored.find(row => row.section === 'add-viva-marks')?.data || [];
      if (publications.some(item => exam(item) && item.examType === 'Backlog' && item.published)) throw Error('Exam is published');
      if (existing.some(exam)) throw Error('Exam now contains saved marks; refusing to overwrite');
      await writeFile(folder + '/before-restore.json', JSON.stringify(stored));
      await tx.$executeRawUnsafe('UPDATE "ResultSectionStore" SET "data"=CAST($1 AS jsonb), "updatedAt"=NOW() WHERE "section"=\'prepare-result-backlog\'', JSON.stringify([...existing, ...records]));
    }, { timeout: 20000 });
    const saved = await prisma.$queryRawUnsafe('SELECT "data" FROM "ResultSectionStore" WHERE "section"=\'prepare-result-backlog\'');
    const restored = saved[0].data.filter(exam);
    assert.deepEqual(restored, records, 'Restore verification failed');
    console.log('Verified saved recovery: ' + restored.length + ' course marks.');
  } finally { await prisma.$disconnect(); }
}
