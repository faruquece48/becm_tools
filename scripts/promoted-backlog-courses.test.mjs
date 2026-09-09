import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promotedBacklogCourses } from '../lib/promotedBacklogCourses.ts';
import { defaultSyllabuses } from '../lib/storage/syllabuses.ts';

test('non-OBE backlog promotions retain their registered historical courses when syllabus is inactive', () => {
  const historical = defaultSyllabuses[0];
  assert.equal(historical.active, false);
  const course = historical.courses.find(course => course.code === 'CE 3171');
  const result = promotedBacklogCourses([course.id], defaultSyllabuses);
  assert.deepEqual(result, [{ courseId: course.id, courseCode: course.code, courseTitle: course.title, semester: 'Odd' }]);
});

test('only explicitly promoted courses are allowed', () => {
  const course = defaultSyllabuses[1].courses[0];
  assert.deepEqual(promotedBacklogCourses(['unknown'], defaultSyllabuses), []);
  assert.equal(promotedBacklogCourses([course.id], defaultSyllabuses).length, 1);
});
