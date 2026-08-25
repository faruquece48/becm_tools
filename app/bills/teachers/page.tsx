"use client";
import { useEffect, useState } from "react";
import { emptyBill } from "../create/components/emptyBill";
import { loadCurrentWork } from "@/lib/storage/draft";
import { collectTeacherNames } from "../individual/individualBill";
import { getSavedIndividualTeacherNames, loadAllIndividualTeacherInformation, saveAllIndividualTeacherInformation, type SavedIndividualTeacherInformation } from "@/lib/storage/individualTeacher";

const departments = [{ key: "becm", label: "BECM", address: "বিইসিএম বিভাগ, রুয়েট।" }, { key: "ce", label: "CE", address: "পুরকৌশল বিভাগ, রুয়েট।" }, { key: "eee", label: "EEE", address: "তওই বিভাগ, রুয়েট।" }, { key: "me", label: "ME", address: "যন্ত্রকৌশল বিভাগ, রুয়েট।" }, { key: "architecture", label: "Architecture", address: "স্থাপত্য বিভাগ, রুয়েট।" }, { key: "phy", label: "Physics", address: "পদার্থবিদ্যা বিভাগ, রুয়েট।" }, { key: "chem", label: "Chemistry", address: "রসায়ন বিভাগ, রুয়েট।" }, { key: "math", label: "Mathematics", address: "গণিত বিভাগ, রুয়েট।" }, { key: "hum", label: "Humanities", address: "মানবিক বিভাগ, রুয়েট।" }, { key: "external", label: "External Member", address: "" }];
const designations = ["অধ্যাপক", "সহকারী অধ্যাপক", "সহযোগী অধ্যাপক", "প্রভাষক", "কর্মকর্তা"];
const blank: SavedIndividualTeacherInformation = { nameBangla: "", designationBangla: "", addressBangla: departments[0].address, accountNumber: "" };
const input = "w-full rounded-md border border-slate-300 bg-white px-3 py-2";
type Department = typeof departments[number];

export default function TeacherInformationPage() {
  const [records, setRecords] = useState<Record<string, SavedIndividualTeacherInformation>>({});
  const [names, setNames] = useState<string[]>([]); const [status, setStatus] = useState("");
  useEffect(() => { const timer = window.setTimeout(() => { const bill = loadCurrentWork(); const billNames = bill ? collectTeacherNames({ ...emptyBill, ...bill }) : []; const saved = loadAllIndividualTeacherInformation(); const canonical = new Map<string, string>(); [...billNames, ...getSavedIndividualTeacherNames()].forEach((name) => { const key = name.trim().toLocaleLowerCase(); if (!canonical.has(key)) canonical.set(key, billNames.find((billName) => billName.toLocaleLowerCase() === key) ?? name); }); setRecords(saved); setNames(Array.from(canonical.values()).sort()); }, 0); return () => window.clearTimeout(timer); }, []);
  const deptOf = (name: string) => {
    const record = records[name.toLocaleLowerCase()];
    return departments.find((department) =>
      record?.departmentKey
        ? department.key === record.departmentKey
        : record?.addressBangla === department.address
    );
  };
  const rows = (dept: Department) => names.filter((name) => deptOf(name)?.key === dept.key);
  const update = (name: string, key: keyof SavedIndividualTeacherInformation, value: string) => setRecords((old) => {
    const recordKey = name.toLocaleLowerCase();
    const record = old[recordKey] ?? blank;
    const departmentKey = record.departmentKey ?? departments.find(
      (department) => department.address === record.addressBangla
    )?.key;
    return {
      ...old,
      [recordKey]: { ...record, departmentKey, [key]: value },
    };
  });
  const rename = (name: string, value: string) => {
    setNames((old) => old.map((current) => current === name ? value : current));
    setRecords((old) => {
      const oldKey = name.toLocaleLowerCase();
      const newKey = value.toLocaleLowerCase();
      const next = { ...old };
      const record = next[oldKey] ?? blank;
      delete next[oldKey];
      next[newKey] = { ...record, englishName: value };
      return next;
    });
  };
  const add = (dept: Department) => {
    const name = `__new_${dept.key}_${names.length}`;
    setNames((old) => [...old, name]);
    setRecords((old) => ({ ...old, [name.toLocaleLowerCase()]: { ...blank, departmentKey: dept.key, addressBangla: dept.address } }));
  };
  const remove = (name: string) => { setNames((old) => old.filter((n) => n !== name)); setRecords((old) => { const next = { ...old }; delete next[name.toLocaleLowerCase()]; return next; }); };
  const save = () => {
    const persisted = Object.fromEntries(Object.entries(records).filter(([key]) => !key.startsWith("__new_")));
    saveAllIndividualTeacherInformation(persisted);
    setStatus("Saved.");
  };
  const exportDept = (dept: Department) => { const data = Object.fromEntries(rows(dept).map((name) => [name.toLocaleLowerCase(), records[name.toLocaleLowerCase()] ?? blank])); const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `${dept.key}-teachers.json`; link.click(); URL.revokeObjectURL(url); };
  const importDept = async (dept: Department, file: File) => { try { const data = JSON.parse(await file.text()) as Record<string, SavedIndividualTeacherInformation>; const departmentRecords = Object.fromEntries(Object.entries(data).map(([key, record]) => [key, { ...record, departmentKey: dept.key, addressBangla: record.addressBangla || dept.address }])); setRecords((old) => ({ ...old, ...departmentRecords })); setNames((old) => Array.from(new Set([...old, ...Object.keys(data)]))); setStatus(`${dept.label} loaded.`); } catch { setStatus("Invalid JSON."); } };
  return <main className="mx-auto max-w-7xl space-y-6 p-6"><div><h1 className="text-2xl font-bold">Teacher Information</h1><p className="text-sm text-slate-500">Each department has an independent table and JSON file.</p></div>{departments.map((dept) => <section key={dept.key} className="overflow-x-auto rounded-xl border bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold">{dept.label} Department</h2><div className="flex gap-2"><button onClick={() => add(dept)} className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white">+ Add Row</button><button onClick={() => exportDept(dept)} className="rounded-md border px-3 py-2 text-sm">Export JSON</button><label className="cursor-pointer rounded-md border px-3 py-2 text-sm">Import JSON<input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importDept(dept, e.target.files[0])} /></label></div></div><table className="w-full min-w-[1050px] text-sm"><thead><tr className="border-b text-left"><th className="p-2">Sl.</th><th className="p-2">Teacher Name</th><th className="p-2">Name (বাংলা)</th><th className="p-2">Designation</th><th className="p-2">Department</th><th className="p-2">Account No.</th><th className="p-2">Action</th></tr></thead><tbody>{rows(dept).map((name, index) => { const record = records[name.toLocaleLowerCase()] ?? { ...blank, departmentKey: dept.key, addressBangla: dept.address }; const displayName = name.startsWith("__new_") ? "" : name; return <tr key={`${dept.key}-${index}`} className="border-b"><td className="p-2">{index + 1}</td><td className="p-2"><input className={input} placeholder="Teacher Name" value={displayName} onChange={(e) => rename(name, e.target.value)} /></td><td className="p-2"><input className={input} value={record.nameBangla} onChange={(e) => update(name, "nameBangla", e.target.value)} /></td><td className="p-2"><select className={input} value={record.designationBangla} onChange={(e) => update(name, "designationBangla", e.target.value)}><option value="">Select</option>{designations.map((d) => <option key={d}>{d}</option>)}</select></td><td className="p-2"><input className={input} value={record.addressBangla} onChange={(e) => update(name, "addressBangla", e.target.value)} /></td><td className="p-2"><input className={input} value={record.accountNumber} onChange={(e) => update(name, "accountNumber", e.target.value)} /></td><td className="p-2"><button onClick={() => remove(name)} className="rounded-md bg-red-50 px-3 py-2 text-red-600">Delete</button></td></tr>; })}</tbody></table></section>)}<div className="flex gap-3"><button onClick={save} className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white">Save All Information</button>{status && <span className="self-center text-sm text-emerald-700">{status}</span>}</div></main>;
}
