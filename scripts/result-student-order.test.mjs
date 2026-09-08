import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareResultStudentRolls, compareResultStudentGroups } from '../lib/resultStudentOrder.ts';
test('special OBE precedes Non-OBE even when the Non-OBE roll prefix is newer',()=>{
 const students=[{roll:'1912001',nonObe:true},{roll:'1712020',nonObe:false},{roll:'2012035',nonObe:false},{roll:'2012001',nonObe:false}];
 students.sort((a,b)=>compareResultStudentGroups(a.roll,b.roll,a.nonObe,b.nonObe,'2024','4th'));
 assert.deepEqual(students.map(student=>student.roll),['2012001','2012035','1712020','1912001']);
});
for (const semester of ['Odd','Even','Short Semester','Backlog']) {
  test(`${semester}: current series precedes special student 1712020`, () => {
    const rolls=['1712020','2012035','2012001','2012020'];
    assert.deepEqual(rolls.sort((a,b)=>compareResultStudentRolls(a,b,'2024','4th')),['2012001','2012020','2012035','1712020']);
  });
}
