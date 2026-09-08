import { test } from 'node:test';
import assert from 'node:assert/strict';
import { priorYearlyCredit, specialPriorYearlyCredit } from '../lib/yearlyEarnedCredit.ts';
const student={id:'s',rollNo:'1'},exam={examYear:'2024',academicYear:'2nd',semester:'Even'};
const archive=(semester,credit,examYear='2024')=>({...exam,semester,examYear,students:[{studentId:'s',earnedCredit:credit}]});
test('even includes odd; backlog includes both; other exam years are excluded',()=>{
 const regular=[archive('Odd',20),archive('Even',21),archive('Odd',99,'2023')];
 assert.equal(priorYearlyCredit(student,exam,regular)+21,41);
 assert.equal(priorYearlyCredit(student,{...exam,semester:'Odd'},regular),0);
 assert.equal(priorYearlyCredit(student,{...exam,semester:'Backlog',examType:'Backlog'},regular)+3,44);
});
test('published cumulative snapshots recover missing semester credits',()=>{
 const results=[{...exam,academicYear:'1st',examYear:'2023',students:[{studentId:'s',totalEarnedCredit:40}]},{...exam,semester:'Odd',students:[{studentId:'s',totalEarnedCredit:60}]}];
 assert.equal(priorYearlyCredit(student,exam,[],[],results)+21,41);
});
test('backlog excludes short semester, other academic years and current backlog from prior credit',()=>{
 const regular=[archive('Odd',20),archive('Even',21),archive('Short Semester',6),{...archive('Odd',90),academicYear:'1st'}];
 assert.equal(priorYearlyCredit(student,{...exam,semester:'Backlog',examType:'Backlog'},regular,[archive('Backlog',3)])+3,44);
});
test('incomplete cumulative history never counts lifetime credits as yearly credits',()=>{
 const results=[{...exam,semester:'Odd',students:[{studentId:'s',totalEarnedCredit:120}]}];
 assert.equal(priorYearlyCredit(student,exam,[],[],results),0);
});
test('Non-OBE yearly totals use only applied credits and recorded special promotions in this year',()=>{
 const history=[{...exam,semester:'Odd',examType:'Regular',applied:true,students:[{studentId:'s',credit:6}]},{...exam,semester:'Short Semester',examType:'Regular',applied:true,students:[{studentId:'s',credit:4}]}];
 const special={...student,specialPromotions:[{...exam,examType:'Regular',earnedCredit:3}]};
 assert.equal(specialPriorYearlyCredit(special,exam,history),6);
 assert.equal(specialPriorYearlyCredit(special,{...exam,semester:'Backlog',examType:'Backlog'},history)+2,11);
 assert.equal(specialPriorYearlyCredit(special,{...exam,semester:'Odd'},history),0);
});
