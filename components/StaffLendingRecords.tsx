"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, LoaderCircle, Search, UserRound, X } from "lucide-react";

type RecordItem = {
  id: string;
  quantity: number;
  returnedAt: string | null;
  book: { title: string; author: string; edition: string | null };
};

type RecordData = {
  id: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  status: string;
  rentedAt: string | null;
  dueAt: string | null;
  returnedAt: string | null;
  items: RecordItem[];
  payment: { transactionId: string; amount: number; status: string };
  profile: {
    roll: string;
    series: string;
    department: string;
    name: string;
    phone: string;
  } | null;
};

type Filter = "all" | "active" | "overdue" | "returned" | "pending_payment" | "awaiting_activation";

function condition(record: RecordData, item: RecordItem, now: number) {
  if (item.returnedAt) return "returned";
  if (record.status === "PENDING_PAYMENT") return "pending_payment";
  if (record.status === "AWAITING_ACTIVATION") return "awaiting_activation";
  if (record.dueAt && new Date(record.dueAt).getTime() < now) return "overdue";
  return "active";
}

function formatDate(value: string | null) {
  if (!value) return "Pending";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function labelFor(value: ReturnType<typeof condition>) {
  return value === "pending_payment"
    ? "Not submitted"
    : value.charAt(0).toUpperCase() + value.slice(1);
}

export default function StaffLendingRecords() {
  const [records, setRecords] = useState<RecordData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [updating, setUpdating] = useState<string | null>(null);
  const [protectedAction, setProtectedAction] = useState<{ targetId: string; action: "return" | "reopen" | "mark_paid" | "delete_pending" } | null>(null);
  const [password, setPassword] = useState("");
  const [now] = useState(() => Date.now());
  const [activationCode, setActivationCode] = useState("");
  const [activationMessage, setActivationMessage] = useState("");

  async function activateRental(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setActivationMessage(""); setUpdating("activation");
    try { const response=await fetch("/api/staff/rental-records",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"activate",code:activationCode})}); const payload=await response.json(); if(!response.ok)throw new Error(payload.error||"Unable to activate rental"); setActivationCode(""); setActivationMessage(`Rental activated. Valid until ${formatDate(payload.dueAt)}.`); await loadRecords(); }
    catch(error){setError(error instanceof Error?error.message:"Unable to activate rental");} finally{setUpdating(null);}
  }
  async function loadRecords() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/staff/rental-records", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to load lending records");
      setRecords(payload.records || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load lending records");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
void loadRecords();
  }, []);

  const groups = useMemo(() => {
    const term = search.trim().toLowerCase();
    const visible = records.filter((record) => {
      const matchesFilter = filter === "all" || record.items.some((item) => condition(record, item, now) === filter);
      const searchable = [
        record.studentName,
        record.studentEmail,
        record.studentPhone,
        record.profile?.name,
        record.profile?.roll,
        record.profile?.series,
        record.profile?.department,
        ...record.items.flatMap((item) => [item.book.title, item.book.author, item.book.edition]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesFilter && (!term || searchable.includes(term));
    });

    const grouped = new Map<string, RecordData[]>();
    for (const record of visible) {
      const key = record.studentEmail.trim().toLowerCase() || record.studentName.trim().toLowerCase();
      grouped.set(key, [...(grouped.get(key) || []), record]);
    }
    return Array.from(grouped.values());
  }, [filter, now, records, search]);

  async function updateRental(targetId: string, action: "return" | "mark_paid" | "delete_pending" | "reopen", actionPassword?: string) {
    setUpdating(targetId);
    setError("");
    try {
      const response = await fetch("/api/staff/rental-records", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "mark_paid" || action === "delete_pending" ? { orderId: targetId, action, password: actionPassword } : { itemId: targetId, action, password: actionPassword }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to update the rental");
      await loadRecords();
      return true;
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update the rental");
      return false;
    } finally {
      setUpdating(null);
    }
  }

  async function submitPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!protectedAction || !password) return;
    const succeeded = await updateRental(protectedAction.targetId, protectedAction.action, password);
    if (succeeded) {
      setProtectedAction(null);
      setPassword("");
    }
  }

  return (
    <section className="staff-records">
      <form onSubmit={activateRental} className="activation-box"><div><h2>Activate paid book rental</h2><p>Enter the code emailed to the student. The 180-day validity begins after activation.</p></div><input value={activationCode} onChange={(event)=>setActivationCode(event.target.value.replace(/\D/g, "").slice(0, 6))} required inputMode="numeric" pattern="\d{6}" maxLength={6} placeholder="" aria-label="Six-digit rental activation code"/><button disabled={updating==="activation"}>{updating==="activation"?<LoaderCircle className="spin" size={16}/>:<Check size={16}/>} Activate</button></form>
      {activationMessage && <p className="activation-success">{activationMessage}</p>}
      <div className="staff-records__tools">
        <label className="staff-records__search">
          <Search size={18} aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search student, roll, series or book"
            aria-label="Search lending records"
          />
        </label>
        <select value={filter} onChange={(event) => setFilter(event.target.value as Filter)}>
          <option value="all">All conditions</option>
          <option value="active">Active</option>
          <option value="overdue">Overdue</option>
          <option value="returned">Returned</option>
          <option value="pending_payment">Pending payment</option>
          <option value="awaiting_activation">Awaiting activation</option>
        </select>
      </div>

      {error && <p className="staff-records__error">{error}</p>}
      {loading ? (
        <p className="staff-records__empty"><LoaderCircle className="spin" /> Loading records...</p>
      ) : groups.length === 0 ? (
        <p className="staff-records__empty">No lending records found.</p>
      ) : (
        <div className="staff-records__groups">
          {groups.map((studentRecords) => {
            const student = studentRecords[0];
            const profile = student.profile;
            return (
              <article className="student-rental-table" key={student.studentEmail || student.studentName}>
                <header className="student-rental-table__header">
                  <span className="student-rental-table__avatar"><UserRound size={23} /></span>
                  <div>
                    <h2>{profile?.name || student.studentName}</h2>
                    <p>
                      Roll: {profile?.roll || "Not provided"} <span aria-hidden="true">&bull;</span> Series: {profile?.series || "Not provided"} <span aria-hidden="true">&bull;</span> {profile?.department || "Department not provided"}
                    </p>
                    <p>{student.studentEmail} <span aria-hidden="true">&bull;</span> {profile?.phone || student.studentPhone || "Phone not provided"}</p>
                  </div>
                </header>

                <div className="student-rental-table__scroll">
                  <table>
                    <thead>
                      <tr>
                        <th className="left-column">Book title</th>
                        <th className="left-column">Author</th>
                        <th className="left-column">Edition</th>
                        <th className="center-column">Quantity</th>
                        <th className="center-column">Transaction</th>
                        <th className="center-column">Status</th>
                        <th className="center-column">Rented</th>
                        <th>Condition</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentRecords.flatMap((record) =>
                        record.items.map((item) => {
                          const state = condition(record, item, now);
                          return (
                            <tr key={item.id}>
                              <td><strong className="book-title">{item.book.title}</strong></td>
                              <td>{item.book.author}</td>
                              <td>{item.book.edition?.trim() || "Not specified"}</td>
                              <td className="center-column">{item.quantity}</td>
                              <td className="center-column"><span className="transaction-id">{record.payment.transactionId || "Pending"}</span></td>
                              <td className="center-column">
                                <span className={`payment-state payment-state--${record.payment.status === "PAID" ? "paid" : "pending"}`}>
                                  {record.payment.status === "PAID" ? "Paid" : "Pending payment"}
                                </span>
                              </td>
                              <td className="center-column">{formatDate(record.rentedAt)}</td>
                              <td><span className={`rental-state rental-state--${state}`}>{labelFor(state)}</span></td>
                              <td>
                                {state === "active" || state === "overdue" ? (
                                  <div className="rental-action">
                                    <span>{state === "overdue" ? "Term ended" : "Terminates"}: {formatDate(record.dueAt)}</span>
                                    <span className="completion-label">Not completed</span>
                                    <button className="state-toggle state-toggle--complete" type="button" onClick={() => { setProtectedAction({ targetId: item.id, action: "return" }); setPassword(""); }} disabled={updating === item.id} aria-label={`Mark ${item.book.title} as completed and returned`} title="Mark as completed and returned">
                                      <Check size={18} />
                                    </button>
                                  </div>
                                ) : state === "pending_payment" ? (
                                  <div className="pending-actions">
                                    <span>Pending</span>
                                    <button className="state-toggle state-toggle--complete" type="button" onClick={() => { setProtectedAction({ targetId: record.id, action: "mark_paid" }); setPassword(""); }} disabled={updating === record.id} aria-label="Confirm payment" title="Confirm payment"><Check size={18} /></button>
                                    <button className="state-toggle state-toggle--undo" type="button" onClick={() => { setProtectedAction({ targetId: record.id, action: "delete_pending" }); setPassword(""); }} disabled={updating === record.id} aria-label="Delete pending payment" title="Delete pending payment"><X size={18} /></button>
                                  </div>
                                ) : state === "returned" ? (
                                  <div className="rental-action">
                                    <span className="completion-label completion-label--done">Completed</span>
                                    <button className="state-toggle state-toggle--undo" type="button" onClick={() => { setProtectedAction({ targetId: item.id, action: "reopen" }); setPassword(""); }} disabled={updating === item.id} aria-label={`Change ${item.book.title} to incomplete and active`} title="Change to incomplete and active">
                                      <X size={18} />
                                    </button>
                                  </div>
                                 ) : <span aria-label="Not available">&mdash;</span>}
                              </td>
                            </tr>
                          );
                        }),
                      )}
                    </tbody>
                  </table>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {protectedAction && (
        <div className="password-dialog" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setProtectedAction(null); }}>
          <form className="password-dialog__card" onSubmit={(event) => void submitPassword(event)}>
            <h2>Password required</h2>
            <p>Enter the staff password to {protectedAction.action === "return" ? "complete this return" : protectedAction.action === "reopen" ? "change this rental back to incomplete" : protectedAction.action === "mark_paid" ? "confirm this payment as paid" : "delete this pending payment"}.</p>
            <label>
              Password
              <input autoFocus type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
            </label>
            <div className="password-dialog__actions">
              <button type="button" onClick={() => { setProtectedAction(null); setPassword(""); }}>Cancel</button>
              <button type="submit" disabled={updating !== null}>{updating ? <LoaderCircle className="spin" size={16} /> : null} Confirm</button>
            </div>
          </form>
        </div>
      )}

      <style jsx>{`
        .activation-box { align-items:end; background:#fff; border:1px solid #cfe0f5; border-radius:16px; display:grid; gap:12px; grid-template-columns:1fr minmax(190px,260px) auto; margin-bottom:14px; padding:18px; }
        .activation-box h2 { margin:0 0 4px; } .activation-box p { margin:0; } .activation-box input { border:1px solid #cad6e6; border-radius:10px; font:inherit; padding:11px 12px; } .activation-success { background:#e8f8ee; border-radius:10px; color:#087b37; margin:0 0 14px; padding:12px 14px; }
        .staff-records__tools { display:flex; gap:12px; margin-bottom:20px; }
        .staff-records__search { align-items:center; background:#fff; border:1px solid #d9e2ef; border-radius:12px; display:flex; flex:1; gap:9px; padding:0 14px; }
        .staff-records__search input { border:0; font:inherit; outline:0; padding:13px 0; width:100%; }
        select { background:#fff; border:1px solid #d9e2ef; border-radius:12px; color:#09275a; padding:0 14px; }
        .staff-records__error { background:#fff0f0; border-radius:12px; color:#c40000; padding:13px 16px; }
        .staff-records__empty { align-items:center; display:flex; gap:8px; justify-content:center; padding:48px; }
        .staff-records__groups { display:grid; gap:20px; }
        .student-rental-table { background:#fff; border:1px solid #dbe3ee; border-radius:18px; box-shadow:0 1px 2px #09275a18; overflow:hidden; }
        .student-rental-table__header { align-items:center; background:#f8faff; display:flex; gap:13px; padding:18px 20px; }
        .student-rental-table__avatar { align-items:center; background:#efe9ff; border-radius:50%; color:#7928ff; display:flex; flex:0 0 44px; height:44px; justify-content:center; }
        h2 { color:#07265a; font-size:17px; margin:0 0 4px; }
        p { color:#45628c; font-size:13px; margin:2px 0; }
        .student-rental-table__scroll { overflow-x:auto; }
        table { border-collapse:collapse; min-width:940px; width:100%; }
        th { background:#f1f5fb; color:#183965; font-size:12px; letter-spacing:.02em; padding:11px 14px; text-align:center; }
        td { border-top:1px solid #e6ebf3; color:#183965; font-size:13px; padding:12px 14px; vertical-align:middle; }
        .center-column { text-align:center; }
        .left-column { text-align:left; }
        .book-title { display:block; min-width:180px; }
        .transaction-id { font-size:11px; overflow-wrap:anywhere; }
        .payment-state { border-radius:999px; display:inline-block; font-size:11px; font-weight:700; padding:5px 9px; white-space:nowrap; }
        .payment-state--paid { background:#e8f8ee; color:#087b37; }
        .payment-state--pending { background:#fff2c9; color:#a35b00; }
        .rental-state { border-radius:999px; display:inline-block; font-size:11px; font-weight:700; padding:5px 9px; white-space:nowrap; }
        .rental-state--active { background:#e8f8ee; color:#087b37; }
        .rental-state--overdue { background:#ffe9e9; color:#bd1010; }
        .rental-state--returned { background:#e8f1ff; color:#1258b8; }
        .rental-state--pending_payment, .rental-state--awaiting_activation { background:#fff2c9; color:#a35b00; }
        .rental-action { align-items:flex-start; display:flex; flex-direction:column; gap:7px; min-width:115px; }
        .rental-action > span { color:#536b8e; font-size:11px; font-weight:600; white-space:nowrap; }
        .rental-action .completion-label { color:#a35b00; font-size:12px; }
        .rental-action .completion-label--done { color:#087b37; }
        .pending-actions { align-items:center; display:flex; gap:7px; justify-content:center; }
        .pending-actions > span { color:#a35b00; font-size:11px; font-weight:700; }
        .state-toggle { border-radius:50%; height:32px; justify-content:center; padding:0; width:32px; }
        .state-toggle--complete { background:#e8f8ee; color:#087b37; }
        .state-toggle--undo { background:#ffe9e9; color:#bd1010; }
        button { align-items:center; background:#eaf2ff; border:0; border-radius:9px; color:#0756c9; cursor:pointer; display:flex; font:inherit; font-weight:700; gap:6px; padding:8px 11px; }
        button:disabled { cursor:wait; opacity:.65; }
        .spin { animation:spin .8s linear infinite; }
        @keyframes spin { to { transform:rotate(360deg); } }
        .password-dialog { align-items:center; background:#071a3b99; display:flex; inset:0; justify-content:center; padding:20px; position:fixed; z-index:100; }
        .password-dialog__card { background:#fff; border-radius:18px; box-shadow:0 24px 70px #06163455; max-width:420px; padding:24px; width:100%; }
        .password-dialog__card h2 { font-size:21px; }
        .password-dialog__card p { line-height:1.55; margin:8px 0 18px; }
        .password-dialog__card label { color:#17315e; display:grid; font-size:13px; font-weight:700; gap:7px; }
        .password-dialog__card input { border:1px solid #cad6e6; border-radius:10px; font:inherit; outline:0; padding:11px 12px; }
        .password-dialog__card input:focus { border-color:#1769e8; box-shadow:0 0 0 3px #1769e822; }
        .password-dialog__actions { display:flex; gap:10px; justify-content:flex-end; margin-top:20px; }
        @media (max-width:700px) { .activation-box { align-items:stretch; grid-template-columns:1fr; } .staff-records__tools { flex-direction:column; } select { padding:12px 14px; } .student-rental-table__header { align-items:flex-start; } }
      `}</style>
    </section>
  );
}
