import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applySpecialPromotion } from '../lib/specialPromotion.ts';
const student={earnedCredit:150,gradePoints:450,outstandingCourses:[{courseId:'A',status:'failed'},{courseId:'B',status:'need-register'}]};
const courses=[{id:'A',code:'CE 1',credit:3},{id:'B',code:'CE 2',credit:2}];
const entry={id:'one',examYear:'2023',academicYear:'4th',semester:'Backlog',examType:'Backlog',gradePoints:9,courseIds:['A']};
test('cleared exam adds incremental totals and preserves exam and subject history',()=>{
 const updated=applySpecialPromotion(student,entry,courses);
 assert.equal(updated.earnedCredit,153);assert.equal(updated.gradePoints,459);
 assert.deepEqual(updated.outstandingCourses,[student.outstandingCourses[1]]);
 assert.equal(updated.specialPromotions[0].examYear,'2023');
 assert.equal(updated.specialPromotions[0].courses[0].code,'CE 1');
 assert.equal(student.earnedCredit,150);
 assert.throws(()=>applySpecialPromotion(updated,entry,courses),/already exists/);
 assert.throws(()=>applySpecialPromotion(updated,{...entry,id:'two',examYear:'2024'},courses),/no longer outstanding/);
});
test('invalid points, duplicate courses and backlog need-register subjects are rejected',()=>{
 assert.throws(()=>applySpecialPromotion(student,{...entry,gradePoints:450},courses),/Grade points/);
 assert.throws(()=>applySpecialPromotion(student,{...entry,courseIds:['A','A']},courses),/unique/);
 assert.throws(()=>applySpecialPromotion(student,{...entry,courseIds:['B']},courses),/Need-to-register/);
});
