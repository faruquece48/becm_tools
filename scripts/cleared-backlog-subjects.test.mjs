import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clearedBacklogSubjects } from '../lib/clearedBacklogSubjects.ts';
const student={id:'student',rollNo:'2012001'};
const mark={studentId:'student',examYear:'2023',academicYear:'3rd',semester:'Odd',courseCode:'CE 2225',result:'Pass',marks:'55',present:true};
test('previous backlog pass clears status regardless of archival and matches historical roll identity',()=>{
 assert.deepEqual(clearedBacklogSubjects(student,{examYear:'2024',academicYear:'4th',semester:'Odd'},[{...mark,studentId:'historical',rollNo:'2012001',published:true}]),['ce2225']);
});
test('backlog is later than regular semesters and does not clear its own examination',()=>{
 for(const semester of ['Odd','Even','Short Semester']) assert.deepEqual(clearedBacklogSubjects(student,{examYear:'2023',academicYear:'3rd',semester},[mark]),[]);
 assert.deepEqual(clearedBacklogSubjects(student,{examYear:'2023',academicYear:'3rd',semester:'Backlog',examType:'Backlog'},[mark]),[]);
});
test('failed, absent and other-student marks do not clear status',()=>{
 assert.deepEqual(clearedBacklogSubjects(student,{examYear:'2024',academicYear:'4th',semester:'Even'},[{...mark,result:'Fail'},{...mark,present:false},{...mark,studentId:'other'}]),[]);
});
