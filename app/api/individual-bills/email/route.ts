import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { gmailConfigured, sendEmailWithAttachments } from "@/lib/gmail";

const SECTION = "bill-teacher-information";
const teacherKey = (name: string) => name.normalize("NFKC").trim().replace(/\s+/gu, " ").toLocaleLowerCase();

interface TeacherInformation {
  englishName?: string;
  email?: string;
}

async function authenticatedTeacher() {
  const accountId = (await cookies()).get("becm-portal-account")?.value;
  const prisma = getPrisma();
  if (!accountId || !prisma) return null;
  const account = await prisma.portalAccount.findFirst({
    where: { id: accountId, role: "teacher", active: true },
    select: { id: true },
  });
  return account ? prisma : null;
}

export async function POST(request: Request) {
  const prisma = await authenticatedTeacher();
  if (!prisma) return NextResponse.json({ error: "Teacher login required" }, { status: 401 });
  if (!gmailConfigured()) return NextResponse.json({ error: "Gmail is not configured. Add GMAIL_USER and GMAIL_APP_PASSWORD." }, { status: 503 });

  const form = await request.formData();
  const teacher = String(form.get("teacher") ?? "").trim();
  const requestedEmail = String(form.get("email") ?? "").trim().toLowerCase();
  const attachment = form.get("file");
  const summaryAttachment = form.get("summaryFile");
  if (!teacher || !requestedEmail || !(attachment instanceof File) || attachment.type !== "application/pdf") {
    return NextResponse.json({ error: "Teacher, saved email, and PDF attachment are required" }, { status: 400 });
  }
  if (attachment.size > 15_000_000) return NextResponse.json({ error: "The individual bill PDF is too large" }, { status: 413 });
  if (summaryAttachment instanceof File && (summaryAttachment.type !== "application/pdf" || summaryAttachment.size > 25_000_000)) {
    return NextResponse.json({ error: "The Summary book must be a PDF smaller than 25 MB" }, { status: 413 });
  }

  const rows = await prisma.$queryRaw<Array<{ data: Prisma.JsonValue }>>(Prisma.sql`
    SELECT "data" FROM "ResultSectionStore" WHERE "section" = ${SECTION} LIMIT 1
  `);
  const directory = (rows[0]?.data ?? {}) as Record<string, TeacherInformation>;
  const saved = directory[teacherKey(teacher)];
  const savedEmail = saved?.email?.trim().toLowerCase();
  if (!savedEmail) return NextResponse.json({ error: `No email address is saved for ${teacher}` }, { status: 400 });
  if (savedEmail !== requestedEmail) return NextResponse.json({ error: "The recipient does not match the saved teacher email" }, { status: 403 });

  const attachmentNotice = summaryAttachment instanceof File
    ? "Your individual examination remuneration bill and the complete Summary book are attached as PDF files."
    : "Your individual examination remuneration bill is attached as a PDF.";
  const signatureText = "Faruque Abdullah\nAssistant Professor, Department of Building Engineering & Construction Management\nRajshahi University of Engineering and Technology\nRajshahi-6204, Bangladesh\nMobile: +8801867300023";
  const html = `<p>Dear Teacher,</p><p>${attachmentNotice}</p><div style="margin-top:20px;font-family:Arial,sans-serif;font-size:13px;line-height:1.55;color:#111"><div style="color:#24156f;font-style:italic;font-weight:700">Faruque Abdullah</div><div>Assistant Professor, Department of Building Engineering &amp; Construction Management</div><div>Rajshahi University of Engineering and Technology</div><div>Rajshahi-6204, Bangladesh</div><div>Mobile: <a href="tel:+8801867300023" style="color:#1769aa">+8801867300023</a></div></div>`;
  const filename = attachment.name.replace(/[^a-zA-Z0-9._ -]/g, "-") || "Individual-Bill.pdf";
  await sendEmailWithAttachments(
    savedEmail,
    "RUET Individual Remuneration Bill",
    `Dear ${saved.englishName?.trim() || teacher},\n\n${attachmentNotice}\n\n${signatureText}`,
    [
      { filename, content: Buffer.from(await attachment.arrayBuffer()), contentType: "application/pdf" },
      ...(summaryAttachment instanceof File ? [{ filename: "Complete_Summary_Book.pdf", content: Buffer.from(await summaryAttachment.arrayBuffer()), contentType: "application/pdf" }] : []),
    ],
    html,
  );
  return NextResponse.json({ sent: true, teacher, email: savedEmail });
}
