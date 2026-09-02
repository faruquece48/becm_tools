import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });
const selection = { examType: "Regular", examYear: "2022", academicYear: "2nd", semester: "Odd" };
const points = { "A+":4, A:3.75, "A-":3.5, "B+":3.25, B:3, "B-":2.75, "C+":2.5, C:2.25, D:2, F:0 };
const n = value => Number(value) || 0;
const grade = score => score>=80?"A+":score>=75?"A":score>=70?"A-":score>=65?"B+":score>=60?"B":score>=55?"B-":score>=50?"C+":score>=45?"C":score>=40?"D":"F";
const read = async section => (await prisma.resultSectionStore.findUnique({ where:{section}, select:{data:true} }))?.data || [];
try {
  const [students, syllabuses, prepared, eligibility, vivas, publications, storedLedger] = await Promise.all([
    read("old-student-directory"), read("syllabuses"), read("prepare-result"), read("student-eligibility"), read("add-viva-marks"), read("add-viva-marks"), read("old-student-result-updates")
  ]);
  const publication = publications.find(row => row.examType !== "Backlog" && row.examYear===selection.examYear && row.academicYear===selection.academicYear && row.semester===selection.semester && row.published===true);
  if (!publication) throw new Error("Approved published result was not found");
  const key = [selection.examType,selection.examYear,selection.academicYear,selection.semester].join("|");
  const ledger = Array.isArray(storedLedger) ? storedLedger : [];
  if (ledger.some(entry => entry.key===key && entry.applied)) throw new Error("This result was already reconciled");
  const courses = syllabuses.flatMap(segment=>segment.courses), byId = new Map(courses.map(course=>[course.id,course]));
  const viva = vivas.find(row=>row.examYear===selection.examYear&&row.academicYear===selection.academicYear&&row.semester===selection.semester);
  const changes=[];
  for (const student of students) {
    const promotion=student.promotions.find(row=>row.examType==="Regular"&&row.examYear===selection.examYear&&row.academicYear===selection.academicYear&&row.semester===selection.semester);
    if(!promotion) continue;
    const statuses=new Map(student.outstandingCourses.map(course=>[course.courseId,course.status])), change={studentId:student.id,credit:0,quality:0,courses:[]};
    for(const courseId of promotion.courseIds){
      const course=byId.get(courseId); if(!course) continue;
      const before=statuses.get(courseId)??null;
      const eligible=eligibility.find(row=>row.examYear===selection.examYear&&row.academicYear===selection.academicYear&&row.semester===selection.semester&&row.courseId===courseId)?.students.find(item=>item.studentId===student.id)?.eligible??true;
      const mark=prepared.find(row=>row.examYear===selection.examYear&&row.academicYear===selection.academicYear&&row.semester===selection.semester&&row.courseId===courseId)?.students.find(item=>item.studentId===student.id);
      let after=before,letter="";
      if(!eligible) after="need-register";
      else if(mark){const theory=course.type==="Theory",vs=viva?.students.find(item=>item.id===student.id),vm=vs?.present?n(vs.marks):0,total=Math.round(theory?(mark.present?n(mark.partA)+n(mark.partB):0)+n(mark.classTestAttendance):n(mark.sessional)+vm);letter=mark.withheld?"W":!mark.present||(theory&&n(mark.partA)+n(mark.partB)<15)?"F":grade(total);after=letter==="F"||letter==="W"?"failed":null;}
      if(after===before) continue;
      change.courses.push({courseId,before,after});
      if(after===null&&letter&&letter!=="F"&&letter!=="W"){const credit=n(course.credit);change.credit+=credit;change.quality+=credit*(points[letter]||0);}
      if(after===null)statuses.delete(courseId);else statuses.set(courseId,after);
    }
    if(!change.courses.length)continue;
    student.earnedCredit+=change.credit;student.gradePoints+=change.quality;student.outstandingCourses=Array.from(statuses,([courseId,status])=>({courseId,status}));student.updatedAt=new Date().toISOString();changes.push(change);
  }
  ledger.push({...selection,key,applied:true,approvedAt:publication.publishedAt||new Date().toISOString(),students:changes});
  await prisma.$transaction([
    prisma.resultSectionStore.update({where:{section:"old-student-directory"},data:{data:students}}),
    prisma.resultSectionStore.upsert({where:{section:"old-student-result-updates"},create:{section:"old-student-result-updates",data:ledger},update:{data:ledger}})
  ]);
  console.log(JSON.stringify({key,changes,students:students.filter(s=>changes.some(c=>c.studentId===s.id)).map(s=>({rollNo:s.rollNo,earnedCredit:s.earnedCredit,gradePoints:s.gradePoints,outstandingCourses:s.outstandingCourses}))},null,2));
} finally { await prisma.$disconnect(); }
