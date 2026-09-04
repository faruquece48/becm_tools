"use client";
import Link from "next/link";
import {useState} from "react";
import * as XLSX from "xlsx";
import {loadResultSection,saveResultSection} from "@/lib/storage/resultSections";
import {academicYears,oldStudentPromotionForExam,type OldStudentRecord,type StudentDirectoryRecord} from "@/lib/storage/studentDirectory";
import {cohortSeries,type CourseEligibility} from "@/lib/storage/studentEligibility";
import {syllabusCoursesForExam,type SyllabusCourse,type SyllabusSegment} from "@/lib/storage/syllabuses";
import type {VivaCohort} from "@/lib/storage/vivaMarks";

type Cell={a:string;b:string;ct:string;sessional:string;internal:string;external:string;viva:string};
type GridRow={id:string;name:string;roll:string;registration:string;boardViva:string;cells:Record<string,Cell>;registered:Record<string,boolean>;failed:string[];need:string[];specialCourseIds?:Set<string>};
type Mark={studentId:string;name:string;rollNo:string;registrationNo:string;registrationType:string;withheld:boolean;present:boolean;partA:string;partB:string;classTestAttendance:string;sessional:string;internal?:string;external?:string;thesisViva?:string;remarks:string;sourceCourseId?:string};
type Prepared={examYear:string;academicYear:string;semester:string;courseId:string;courseCode:string;courseTitle:string;courseType?:SyllabusCourse["type"];students:Mark[];updatedAt:string;published?:boolean};
type Backlog={id:string;studentId:string;studentName:string;rollNo:string;registrationNo:string;examYear:string;academicYear:string;semester:"Odd"|"Even";courseId?:string;courseCode:string;courseTitle:string;present:boolean;partA:string;partB:string;classTestAttendance:string;marks:string;result:"Pass"|"Fail";remarks:string;updatedAt:string;published?:boolean};
type RegCourse={courseId?:string;courseCode:string;courseTitle:string;semester:"Odd"|"Even"};
type Registration={studentId:string;studentName:string;rollNo:string;registrationNo:string;examYear:string;academicYear:string;courses:RegCourse[]};
const empty=():Cell=>({a:"",b:"",ct:"",sessional:"",internal:"",external:"",viva:""});
const norm=(v:string)=>v.replace(/\s/g,"").toLowerCase(),number=(v:string)=>Number(v)||0,key=(c:SyllabusCourse)=>c.semester+"|"+c.id,rollSeries=(roll:string)=>roll.replace(/\D/g,"").slice(0,2);
const total=(x:Cell,c:SyllabusCourse,v:string)=>Math.round(c.type==="Theory"?number(x.a)+number(x.b)+number(x.ct):c.type==="Thesis"?number(x.internal)+number(x.external)+number(x.viva):number(x.sessional)+number(v));
const grade=(x:Cell,c:SyllabusCourse,v:string)=>{const s=total(x,c,v);if(c.type==="Theory"&&number(x.a)+number(x.b)<15)return"F";if(c.type==="Sessional"&&number(v)<=0)return"F";return s>=80?"A+":s>=75?"A":s>=70?"A-":s>=65?"B+":s>=60?"B":s>=55?"B-":s>=50?"C+":s>=45?"C":s>=40?"D":"F"};
const field="h-9 rounded border border-slate-300 bg-white px-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100";

export default function ExcelResultInput(){
 const current=String(new Date().getFullYear());
 const[examType,setExamType]=useState<"Regular"|"Backlog">("Regular"),[examYear,setExamYear]=useState(current),[academicYear,setAcademicYear]=useState("1st"),[semester,setSemester]=useState<"Odd"|"Even">("Odd");
 const[courses,setCourses]=useState<SyllabusCourse[]>([]),[rows,setRows]=useState<GridRow[]>([]),[eligibility,setEligibility]=useState<CourseEligibility[]>([]),[prepared,setPrepared]=useState<Prepared[]>([]),[backlog,setBacklog]=useState<Backlog[]>([]);
 const[busy,setBusy]=useState(false),[submitted,setSubmitted]=useState(false),[message,setMessage]=useState("");
 const years=Array.from({length:10},(_,i)=>String(Number(current)-i));
 const enabled=(r:GridRow,c:SyllabusCourse)=>examType==="Backlog"?Boolean(r.registered[key(c)]):r.specialCourseIds?r.specialCourseIds.has(c.id)&&eligibility.find(e=>e.examYear===examYear&&e.academicYear===academicYear&&e.semester===semester&&e.courseId===c.id)?.students.find(s=>s.studentId===r.id)?.eligible!==false:eligibility.find(e=>e.examYear===examYear&&e.academicYear===academicYear&&e.semester===semester&&e.courseId===c.id)?.students.find(s=>s.studentId===r.id)?.eligible!==false;
 const columns=(c:SyllabusCourse)=>c.type==="Theory"?["A","B","CT"]:c.type==="Thesis"?["Internal","External","Viva"]:["Sessional"];

 async function openSheet(){
  setBusy(true);setSubmitted(false);setMessage("");setRows([]);
  try{
   const get=async(u:string)=>{const response=await fetch(u,{cache:"no-store"}),body=await response.json();if(!response.ok)throw Error(body.error||"Unable to load data");return body};
   const[d,s,e,p,b,r,v,o]=await Promise.all([get("/api/students/directory?includeHistorical=true"),get("/api/syllabuses"),get("/api/student-eligibility"),loadResultSection<Prepared[]>("prepare-result"),loadResultSection<Backlog[]>("prepare-result-backlog"),get("/api/backlog-registrations"),loadResultSection<VivaCohort[]>("add-viva-marks"),get("/api/students/old")]);
   const syllabi=(s.syllabuses||[]) as SyllabusSegment[],elig=(e.records||[]) as CourseEligibility[];setEligibility(elig);setPrepared(p||[]);setBacklog(b||[]);
   if(examType==="Regular"){
    const cs=syllabusCoursesForExam(syllabi,cohortSeries(examYear,academicYear),academicYear as SyllabusCourse["year"],semester);
    const viva=(v as VivaCohort[]).find(x=>(x.examType||"Regular")==="Regular"&&x.examYear===examYear&&x.academicYear===academicYear&&x.semester===semester);
    const promotedOld=((o.records||[]) as OldStudentRecord[]).filter(student=>Boolean(oldStudentPromotionForExam(student,examYear,academicYear,semester,"Regular")));
    const oldCourseIds=new Set(promotedOld.flatMap(student=>oldStudentPromotionForExam(student,examYear,academicYear,semester,"Regular")?.courseIds||[]));
    const extraCourses=syllabi.flatMap(segment=>segment.courses).filter(course=>oldCourseIds.has(course.id)&&!cs.some(item=>item.id===course.id));
    if(extraCourses.length)cs.push(...extraCourses);
    const examEligibilityIds=new Set(elig.filter(record=>record.examYear===examYear&&record.academicYear===academicYear&&record.semester===semester&&cs.some(course=>course.id===record.courseId)).flatMap(record=>record.students.map(student=>student.studentId)));
    const savedIds=new Set((p as Prepared[]).filter(record=>record.examYear===examYear&&record.academicYear===academicYear&&record.semester===semester).flatMap(record=>record.students.map(student=>student.studentId)));
    const candidates=(d.records as StudentDirectoryRecord[]).filter(student=>((student.placementExamYear||String(Number(student.series)+academicYears.indexOf(student.year)+1))===examYear&&student.year===academicYear&&student.semester===semester)||examEligibilityIds.has(student.id)||savedIds.has(student.id)||Boolean(viva?.students.some(item=>item.id===student.id)));
    const expectedSeries=cohortSeries(examYear,academicYear),byRoll=new Map<string,StudentDirectoryRecord>();
    candidates.forEach(student=>{const identity=norm(student.rollNo),current=byRoll.get(identity);if(!current||String(student.series)===expectedSeries&&String(current.series)!==expectedSeries)byRoll.set(identity,student)});
    const seriesCounts=new Map<string,number>();byRoll.forEach(student=>{const series=rollSeries(student.rollNo);seriesCounts.set(series,(seriesCounts.get(series)||0)+1)});
    const expectedRollSeries=expectedSeries.slice(-2),majoritySeries=[...seriesCounts.entries()].sort((a,b)=>b[1]-a[1]||(a[0]===expectedRollSeries?-1:b[0]===expectedRollSeries?1:0))[0]?.[0]||expectedRollSeries;
    const students=[...byRoll.values()].sort((a,b)=>(rollSeries(a.rollNo)===majoritySeries?0:1)-(rollSeries(b.rollNo)===majoritySeries?0:1)||Number(rollSeries(b.rollNo))-Number(rollSeries(a.rollNo))||a.rollNo.localeCompare(b.rollNo,undefined,{numeric:true}));
    const includedIds=new Set(students.map(st=>st.id)),includedRolls=new Set(students.map(st=>norm(st.rollNo)));
    const specialStudents=promotedOld.filter(student=>!includedIds.has(student.id)&&!includedRolls.has(norm(student.rollNo))).sort((a,b)=>a.rollNo.localeCompare(b.rollNo,undefined,{numeric:true}));
    const buildRow=(st:{id:string;name:string;rollNo:string;registrationNo:string},specialCourseIds?:Set<string>)=>({id:st.id,name:st.name,roll:st.rollNo,registration:st.registrationNo,boardViva:viva?.students.find(x=>x.id===st.id)?.marks||"",registered:{},failed:[],specialCourseIds,need:cs.filter(c=>elig.find(z=>z.examYear===examYear&&z.academicYear===academicYear&&z.semester===semester&&z.courseId===c.id)?.students.find(z=>z.studentId===st.id)?.eligible===false).map(c=>c.code),cells:Object.fromEntries(cs.map(c=>{const old=(p as Prepared[]).find(z=>z.examYear===examYear&&z.academicYear===academicYear&&z.semester===semester&&z.courseId===c.id)?.students.find(z=>z.studentId===st.id);return[key(c),old?{a:old.partA||"",b:old.partB||"",ct:old.classTestAttendance||"",sessional:old.sessional||"",internal:old.internal||"",external:old.external||"",viva:old.thesisViva||""}:empty()]}))});
    setCourses(cs);setRows([...students.map(st=>buildRow(st)),...specialStudents.map(st=>buildRow(st,new Set(oldStudentPromotionForExam(st,examYear,academicYear,semester,"Regular")?.courseIds||[])))]);
   }else{
    const relevant=[...(r.candidates||[]),...(r.registrations||[])].filter((x:Registration)=>x.examYear===examYear&&x.academicYear===academicYear),people=[...new Map(relevant.map((x:Registration)=>[x.studentId,x])).values()] as Registration[];
    const regCourses=[...new Map(relevant.flatMap((x:Registration)=>x.courses).map((c:RegCourse)=>[c.semester+"|"+norm(c.courseCode),c])).values()] as RegCourse[],all=syllabi.flatMap(x=>x.courses);
    const cs:SyllabusCourse[]=regCourses.map(c=>all.find(x=>(c.courseId&&x.id===c.courseId)||(norm(x.code)===norm(c.courseCode)&&x.semester===c.semester))||{id:c.courseId||c.semester+"-"+norm(c.courseCode),code:c.courseCode,title:c.courseTitle,credit:"0",type:"Theory" as const,department:"BECM",year:academicYear as SyllabusCourse["year"],semester:c.semester});
    setCourses(cs);setRows(people.map(st=>{const saved=(r.registrations||[]).find((x:Registration)=>x.studentId===st.studentId&&x.examYear===examYear&&x.academicYear===academicYear),available=(r.candidates||[]).find((x:Registration)=>x.studentId===st.studentId&&x.examYear===examYear&&x.academicYear===academicYear)?.courses||[],registered=Object.fromEntries(cs.map(c=>[key(c),Boolean(saved?.courses.some((x:RegCourse)=>x.semester===c.semester&&norm(x.courseCode)===norm(c.code)))]));return{id:st.studentId,name:st.studentName,roll:st.rollNo,registration:st.registrationNo,boardViva:"",registered,failed:available.map((x:RegCourse)=>x.courseCode),need:available.filter((x:RegCourse)=>!saved?.courses.some((y:RegCourse)=>y.semester===x.semester&&norm(y.courseCode)===norm(x.courseCode))).map((x:RegCourse)=>x.courseCode),cells:Object.fromEntries(cs.map(c=>{const old=(b as Backlog[]).find(x=>x.studentId===st.studentId&&x.examYear===examYear&&x.academicYear===academicYear&&x.semester===c.semester&&norm(x.courseCode)===norm(c.code));return[key(c),old?{...empty(),a:old.partA,b:old.partB,ct:old.classTestAttendance}:empty()]}))}}));
   }
  }catch(error){setMessage(error instanceof Error?error.message:"Unable to open Excel sheet.")}finally{setBusy(false)}
 }
 function updateCell(id:string,k:string,change:Partial<Cell>){setRows(old=>old.map(r=>r.id===id?{...r,cells:{...r.cells,[k]:{...r.cells[k],...change}}}:r))}
 function updateRow(id:string,change:Partial<GridRow>){setRows(old=>old.map(r=>r.id===id?{...r,...change}:r))}
 function toggle(r:GridRow,c:SyllabusCourse){const k=key(c),on=!r.registered[k];updateRow(r.id,{registered:{...r.registered,[k]:on},need:on?r.need.filter(x=>norm(x)!==norm(c.code)):[...new Set([...r.need,c.code])]})}
 function failedFor(row:GridRow){return courses.filter(course=>enabled(row,course)&&grade(row.cells[key(course)],course,row.boardViva)==="F").map(course=>course.code)}
 function needFor(row:GridRow){return examType==="Regular"?courses.filter(course=>(row.specialCourseIds?row.specialCourseIds.has(course.id):true)&&!enabled(row,course)).map(course=>course.code):courses.filter(course=>row.failed.some(code=>norm(code)===norm(course.code))&&!row.registered[key(course)]).map(course=>course.code)}
 async function exportExcel(){
  setBusy(true);setMessage("");
  try{
   const {Workbook}=await import("exceljs"),workbook=new Workbook(),sheet=workbook.addWorksheet("Marks",{views:[{state:"frozen",xSplit:4,ySplit:5}]});
   const definitions:Array<{key:string;width:number;label:string;course?:SyllabusCourse}>=[
    {key:"SL",width:7,label:"SL"},{key:"Roll No",width:15,label:"Roll No"},{key:"Student Name",width:30,label:"Student Name"},{key:"Registration No",width:21,label:"Registration No"},
    ...(examType==="Regular"?[{key:"Board Viva",width:14,label:"Board Viva"}]:[]),
    ...courses.flatMap(course=>{const prefix=course.code+" "+course.semester;return[...(examType==="Backlog"?[{key:prefix+" Registered",width:13,label:"Register",course}]:[]),...columns(course).map(label=>({key:prefix+" "+label,width:14,label,course}))]})
   ];
   sheet.columns=definitions.map(item=>({key:item.key,width:item.width}));
   sheet.getRow(1).values=definitions.map(item=>item.key);sheet.getRow(1).hidden=true;
   const lastColumn=definitions.length,title="RAJSHAHI UNIVERSITY OF ENGINEERING & TECHNOLOGY",details=`${examType} Examination ${examYear} • ${academicYear} Year${examType==="Regular"?` • ${semester} Semester`:""}`;
   sheet.mergeCells(2,1,2,lastColumn);sheet.getCell(2,1).value=title;
   sheet.mergeCells(3,1,3,lastColumn);sheet.getCell(3,1).value=details;
   const identityCount=4+(examType==="Regular"?1:0),identityLabels=["SL","Roll No","Student Name","Registration No",...(examType==="Regular"?["Board Viva"]:[])];
   identityLabels.forEach((label,index)=>{const column=index+1;sheet.mergeCells(4,column,5,column);sheet.getCell(4,column).value=label});
   let column=identityCount+1;
   courses.forEach(course=>{const subHeaders=[...(examType==="Backlog"?["Register"]:[]),...columns(course)],start=column,end=column+subHeaders.length-1;sheet.mergeCells(4,start,4,end);sheet.getCell(4,start).value=`${course.code} — ${course.title} (${course.semester})`;subHeaders.forEach((label,index)=>{sheet.getCell(5,start+index).value=label});column=end+1});
   rows.forEach((row,index)=>{const values:Record<string,string|number>={"SL":index+1,"Roll No":row.roll,"Student Name":row.name,"Registration No":row.registration};if(examType==="Regular")values["Board Viva"]=row.boardViva;courses.forEach(course=>{const prefix=course.code+" "+course.semester,value=row.cells[key(course)];if(examType==="Backlog")values[prefix+" Registered"]=row.registered[key(course)]?"Yes":"No";columns(course).forEach(heading=>{values[prefix+" "+heading]=enabled(row,course)?heading==="A"?value.a:heading==="B"?value.b:heading==="CT"?value.ct:heading==="Sessional"?value.sessional:heading==="Internal"?value.internal:heading==="External"?value.external:value.viva:"-"})});sheet.addRow(values)});
   const border={top:{style:"thin" as const,color:{argb:"FFB8C5D6"}},left:{style:"thin" as const,color:{argb:"FFB8C5D6"}},bottom:{style:"thin" as const,color:{argb:"FFB8C5D6"}},right:{style:"thin" as const,color:{argb:"FFB8C5D6"}}};
   sheet.getRow(2).height=28;sheet.getRow(3).height=23;sheet.getRow(4).height=34;sheet.getRow(5).height=25;
   sheet.getCell(2,1).font={bold:true,size:16,color:{argb:"FFFFFFFF"}};sheet.getCell(2,1).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF082F57"}};sheet.getCell(2,1).alignment={horizontal:"center",vertical:"middle"};
   sheet.getCell(3,1).font={bold:true,size:11,color:{argb:"FF102555"}};sheet.getCell(3,1).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFDCEAF7"}};sheet.getCell(3,1).alignment={horizontal:"center",vertical:"middle"};
   for(let rowNumber=4;rowNumber<=5;rowNumber++)for(let col=1;col<=lastColumn;col++){const cell=sheet.getCell(rowNumber,col);cell.font={bold:true,color:{argb:"FFFFFFFF"}};cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:rowNumber===4?"FF145A86":"FF287EAA"}};cell.alignment={horizontal:"center",vertical:"middle",wrapText:true};cell.border=border}
   for(let rowNumber=6;rowNumber<=sheet.rowCount;rowNumber++){const row=sheet.getRow(rowNumber);row.height=23;for(let col=1;col<=lastColumn;col++){const cell=row.getCell(col);cell.alignment={horizontal:col===3?"left":"center",vertical:"middle"};cell.border=border;if(rowNumber%2===0)cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFF2F7FB"}}}}
   sheet.pageSetup={orientation:"landscape",fitToPage:true,fitToWidth:1,fitToHeight:0,paperSize:9,margins:{left:0.25,right:0.25,top:0.5,bottom:0.5,header:0.2,footer:0.2}};
   const buffer=await workbook.xlsx.writeBuffer(),blob=new Blob([buffer as BlobPart],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),url=URL.createObjectURL(blob),anchor=document.createElement("a");anchor.href=url;anchor.download="result-input-"+examType+"-"+examYear+"-"+academicYear+".xlsx";anchor.click();URL.revokeObjectURL(url);setMessage("Smart marksheet Excel template exported successfully.");
  }catch(error){setMessage(error instanceof Error?error.message:"Unable to export the Excel template.")}finally{setBusy(false)}
 }
 async function importExcel(file:File){try{const book=XLSX.read(await file.arrayBuffer()),rawItems=XLSX.utils.sheet_to_json<Record<string,unknown>>(book.Sheets[book.SheetNames[0]],{defval:""}),items=rawItems.filter(item=>String(item["Roll No"]??"").trim()),byRoll=new Map(items.map(item=>[norm(String(item["Roll No"])),item])),rosterRolls=new Set(rows.map(row=>norm(row.roll))),matched=[...byRoll.keys()].filter(roll=>rosterRolls.has(roll)).length;setRows(old=>old.map(row=>{const record=byRoll.get(norm(row.roll));if(!record)return row;const cells={...row.cells},registered={...row.registered};courses.forEach(course=>{const k=key(course),prefix=course.code+" "+course.semester;if(examType==="Backlog"){const flag=norm(String(record[prefix+" Registered"]));if(flag==="yes"||flag==="true"||flag==="1")registered[k]=true;if(flag==="no"||flag==="false"||flag==="0")registered[k]=false}const canImport=examType==="Backlog"?Boolean(registered[k]):enabled(row,course);if(!canImport)return;const value={...cells[k]};value.a=String(record[prefix+" A"]??value.a);value.b=String(record[prefix+" B"]??value.b);value.ct=String(record[prefix+" CT"]??value.ct);value.sessional=String(record[prefix+" Sessional"]??value.sessional);value.internal=String(record[prefix+" Internal"]??value.internal);value.external=String(record[prefix+" External"]??value.external);value.viva=String(record[prefix+" Viva"]??value.viva);cells[k]=value});return{...row,registered,boardViva:examType==="Regular"?String(record["Board Viva"]??row.boardViva):row.boardViva,cells}}));setMessage("Excel imported: "+matched+" roll(s) matched, "+(items.length-matched)+" unmatched row(s).")}catch{setMessage("Invalid Excel file. Export and fill the template for this examination first.")}}

 async function submit(){
  setBusy(true);setMessage("");
  try{
   const stamp=new Date().toISOString();
   if(examType==="Regular"){
    const records: Prepared[] = courses.map((course) => {
      const students = rows.filter((row) => enabled(row, course)).map((row) => {
        const value = row.cells[key(course)];
        return { studentId: row.id, name: row.name, rollNo: row.roll, registrationNo: row.registration, registrationType: row.specialCourseIds?"Non-OBE":"Regular", withheld: false, present: true, partA: value.a, partB: value.b, classTestAttendance: value.ct, sessional: value.sessional, internal: value.internal, external: value.external, thesisViva: value.viva, remarks: "", sourceCourseId: course.id };
      });
      return { examYear, academicYear, semester, courseId: course.id, courseCode: course.code, courseTitle: course.title, courseType: course.type, students, updatedAt: stamp };
    });
    await saveResultSection("prepare-result",[...prepared.filter(x=>!(x.examYear===examYear&&x.academicYear===academicYear&&x.semester===semester&&courses.some(c=>c.id===x.courseId))),...records]);
    const vivas=await loadResultSection<VivaCohort[]>("add-viva-marks"),cohort:VivaCohort={department:"Building Engineering & Construction Management",examType:"Regular",examYear,academicYear,semester,students:rows.map(r=>({id:r.id,name:r.name,registrationNo:r.registration,rollNo:r.roll,registrationType:r.specialCourseIds?"Non-OBE":"Regular",marks:r.boardViva,present:true})),finalized:true,submitted:true,submittedAt:stamp,updatedAt:stamp,published:false};
    await saveResultSection("add-viva-marks",[...vivas.filter(x=>!((x.examType||"Regular")==="Regular"&&x.examYear===examYear&&x.academicYear===academicYear&&x.semester===semester)),cohort]);
   }else{
    const selections=rows.map(r=>({studentId:r.id,courses:courses.filter(c=>r.registered[key(c)]).map(c=>({courseCode:c.code,semester:c.semester as "Odd"|"Even"}))}));
    const response=await fetch("/api/backlog-registrations",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({examYear,academicYear,selections})}),body=await response.json();
    if(!response.ok)throw Error(body.error||"Unable to register backlog subjects.");
    const completed:Backlog[]=rows.flatMap(r=>courses.filter(c=>r.registered[key(c)]).map(c=>{const x=r.cells[key(c)],score=total(x,c,""),old=backlog.find(b=>b.studentId===r.id&&b.examYear===examYear&&b.academicYear===academicYear&&b.semester===c.semester&&norm(b.courseCode)===norm(c.code));return{id:old?.id||crypto.randomUUID(),studentId:r.id,studentName:r.name,rollNo:r.roll,registrationNo:r.registration,examYear,academicYear,semester:c.semester as "Odd"|"Even",courseId:c.id,courseCode:c.code,courseTitle:c.title,present:true,partA:x.a,partB:x.b,classTestAttendance:x.ct,marks:String(score),result:grade(x,c,"")==="F"?"Fail":"Pass",remarks:"",updatedAt:stamp}}));
    await saveResultSection("prepare-result-backlog",[...backlog.filter(b=>!(b.examYear===examYear&&b.academicYear===academicYear&&completed.some(x=>x.studentId===b.studentId&&x.semester===b.semester&&norm(x.courseCode)===norm(b.courseCode)))),...completed]);
   }
   setSubmitted(true);setMessage("Final submission completed. Viva and subject marks now feed all result sheets.");
  }catch(error){setMessage(error instanceof Error?error.message:"Final submission failed.")}finally{setBusy(false)}
 }
 const markInput=(r:GridRow,c:SyllabusCourse,name:keyof Cell,value:string)=><td key={key(c)+"-"+name} className="border p-1"><input type="number" min="0" step="0.5" value={value} onChange={e=>updateCell(r.id,key(c),{[name]:e.target.value})} className={field+" w-16"}/></td>;
 return <section className="min-h-screen bg-slate-50 p-3 sm:p-5"><div className="rounded-xl border bg-white shadow-sm">
  <header className="border-b p-5"><h1 className="text-2xl font-extrabold text-[#102555]">Excel Result Input</h1><p className="mt-1 text-sm text-slate-600">One row per roll number. Enter marks here or download, edit and import the Excel file.</p></header>
  <div className="grid gap-4 border-b p-5 md:grid-cols-2">
   <label className="grid gap-2 text-sm font-semibold">Exam Type<select className={field} value={examType} onChange={e=>{setExamType(e.target.value as "Regular"|"Backlog");setRows([])}}><option>Regular</option><option>Backlog</option></select></label>
   <label className="grid gap-2 text-sm font-semibold">Exam Year<select className={field} value={examYear} onChange={e=>setExamYear(e.target.value)}>{years.map(y=><option key={y}>{y}</option>)}</select></label>
   <label className="grid gap-2 text-sm font-semibold">Academic Year<select className={field} value={academicYear} onChange={e=>setAcademicYear(e.target.value)}>{academicYears.map(y=><option key={y}>{y}</option>)}</select></label>
   {examType==="Regular"&&<label className="grid gap-2 text-sm font-semibold">Semester<select className={field} value={semester} onChange={e=>setSemester(e.target.value as "Odd"|"Even")}><option>Odd</option><option>Even</option></select></label>}
   <div className="flex flex-wrap items-center gap-3 md:col-span-2"><button disabled={busy} onClick={()=>void openSheet()} className="rounded bg-emerald-600 px-5 py-2.5 font-semibold text-white disabled:opacity-50">{busy?"Loading...":"Open Excel Sheet"}</button><button disabled={!rows.length||busy} onClick={exportExcel} className="rounded bg-sky-700 px-5 py-2.5 font-semibold text-white disabled:opacity-40">Export Excel Template</button><label className={"rounded bg-amber-500 px-5 py-2.5 font-semibold text-white "+(!rows.length||busy?"pointer-events-none opacity-40":"cursor-pointer")}>Import Filled Excel<input type="file" accept=".xlsx,.xls" disabled={!rows.length||busy} className="hidden" onChange={e=>{const file=e.target.files?.[0];if(file)void importExcel(file);e.currentTarget.value=""}}/></label><span className="text-xs text-slate-500">Open the sheet first, export it, fill marks against Roll No., then import it.</span></div>
  </div>
  {message&&<p role="status" className="m-4 rounded bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</p>}
  {rows.length>0&&<>
  <div className="max-h-[70vh] overflow-auto"><table className="min-w-max border-collapse text-xs"><thead className="sticky top-0 z-10 bg-[#082f57] text-white"><tr><th rowSpan={2} className="sticky left-0 z-20 border bg-[#082f57] p-2">Roll No.</th><th rowSpan={2} className="border p-2">Student</th>{examType==="Regular"&&<th rowSpan={2} className="border p-2">Board Viva</th>}{courses.map(c=><th key={key(c)} colSpan={columns(c).length+2+(examType==="Backlog"?1:0)} className="border p-2">{c.code}<br/><span className="font-normal">{c.title} - {c.semester}</span></th>)}<th rowSpan={2} className="border p-2">Failed Subjects / Status</th><th rowSpan={2} className="border p-2">Need to Register</th></tr><tr>{courses.flatMap(c=>[...(examType==="Backlog"?["Register"]:[]),...columns(c),"Total","Grade"].map(h=><th key={key(c)+"-"+h} className="border p-2">{h}</th>))}</tr></thead>
  <tbody>{rows.map(r=><tr key={r.id} className="even:bg-slate-50"><td className="sticky left-0 border bg-inherit p-2 font-bold">{r.roll}</td><td className="max-w-44 border p-2">{r.name}</td>{examType==="Regular"&&<td className="border p-1"><input type="number" min="0" max="25" step="0.5" value={r.boardViva} onChange={e=>updateRow(r.id,{boardViva:e.target.value})} className={field+" w-16"}/></td>}
  {courses.flatMap(c=>{const k=key(c),x=r.cells[k],registration=examType==="Backlog"?<td key={k+"-reg"} className="border text-center"><input type="checkbox" checked={Boolean(r.registered[k])} onChange={()=>toggle(r,c)}/></td>:null;if(!enabled(r,c))return[registration,<td key={k+"-dash"} colSpan={columns(c).length+2} className="border bg-slate-100 p-2 text-center text-lg font-bold text-slate-500">-</td>];const inputs=c.type==="Theory"?[markInput(r,c,"a",x.a),markInput(r,c,"b",x.b),markInput(r,c,"ct",x.ct)]:c.type==="Thesis"?[markInput(r,c,"internal",x.internal),markInput(r,c,"external",x.external),markInput(r,c,"viva",x.viva)]:[markInput(r,c,"sessional",x.sessional)];return[registration,...inputs,<td key={k+"-total"} className="border p-2 text-center font-semibold">{total(x,c,r.boardViva)}</td>,<td key={k+"-grade"} className={"border p-2 text-center font-bold "+(grade(x,c,r.boardViva)==="F"?"text-red-600":"")}>{grade(x,c,r.boardViva)}</td>]})}
  <td className="max-w-48 border p-2 font-semibold text-red-700">{failedFor(r).join(", ")||"-"}</td><td className="max-w-48 border p-2 text-amber-700">{needFor(r).join(", ")||"-"}</td></tr>)}</tbody></table></div>
  <div className="border-t p-5 text-center"><button disabled={busy} onClick={()=>void submit()} className="rounded bg-blue-700 px-7 py-3 font-bold text-white disabled:opacity-50">{busy?"Submitting...":"Final Submission"}</button>{submitted&&<div className="mt-4 flex flex-wrap justify-center gap-2"><Link className="rounded border px-3 py-2" href={examType==="Regular"?"/teacher/result/marks-sheet":"/teacher/result/marks-sheet-backlog"}>Meeting / Marks Sheet</Link><Link className="rounded border px-3 py-2" href={examType==="Regular"?"/teacher/result/result-sheet":"/teacher/result/result-sheet-backlog"}>Result Sheet</Link><Link className="rounded border px-3 py-2" href={examType==="Regular"?"/teacher/result/tabulation-sheet":"/teacher/result/tabulation-sheet-backlog"}>Tabulation Sheet</Link></div>}</div></>}
 </div></section>
}
