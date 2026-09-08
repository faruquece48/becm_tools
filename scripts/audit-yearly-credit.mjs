import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { mkdir, writeFile } from 'node:fs/promises';
const p=new PrismaClient({adapter:new PrismaNeon({connectionString:process.env.DATABASE_URL})});
try {
 const rows=await p.$queryRawUnsafe('SELECT "section","data" FROM "ResultSectionStore" WHERE "section" IN (\'marks-sheet\',\'marks-sheet-backlog\',\'result-sheet\',\'result-sheet-backlog\',\'tabulation-sheet\',\'tabulation-sheet-backlog\')');
 const folder='.next/yearly-credit-audit/'+new Date().toISOString().replace(/[:.]/g,'-');await mkdir(folder,{recursive:true});await writeFile(folder+'/backup.json',JSON.stringify(rows));
 const yearlyFields=[];function scan(value,path){if(!value||typeof value!=='object')return;for(const [key,child] of Object.entries(value)){if(/yearly/i.test(key))yearlyFields.push(path+'/'+key);scan(child,path+'/'+key)}}
 rows.forEach(row=>scan(row.data,row.section));console.log(JSON.stringify({backup:folder,sections:rows.map(row=>({section:row.section,exams:Array.isArray(row.data)?row.data.length:0})),storedYearlyFields:yearlyFields},null,2));
}finally{await p.$disconnect()}
