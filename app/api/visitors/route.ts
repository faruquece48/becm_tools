import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

const todayKey = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date());

type VisitorCounts = {
  live: number;
  today: number;
  total: number;
  available: boolean;
};

async function snapshot(): Promise<VisitorCounts> {
  const prisma = getPrisma();
  if (!prisma) {
    return { live: 0, today: 0, total: 0, available: false };
  }

  const [live, today, total] = await prisma.$transaction([
    prisma.visitorSession.count({ where: { lastSeenAt: { gte: new Date(Date.now() - 35_000) } } }),
    prisma.visitEvent.count({ where: { visitDay: todayKey() } }),
    prisma.visitEvent.count(),
  ]);
  return { live, today, total, available: true };
}

export async function GET() {
  return NextResponse.json(await snapshot(), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { sessionId?: string; visitId?: string; action?: "visit" | "heartbeat" | "leave" } | null;
  const sessionId = body?.sessionId?.slice(0, 100);
  if (!sessionId) return NextResponse.json({ error: "Missing session ID" }, { status: 400 });

  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json(await snapshot(), { headers: { "Cache-Control": "no-store" } });
  }

  if (body?.action === "leave") {
    await prisma.visitorSession.updateMany({
      where: { id: sessionId },
      data: { lastSeenAt: new Date(0) },
    });
    return NextResponse.json(await snapshot(), { headers: { "Cache-Control": "no-store" } });
  }

  const now = new Date();
  const day = todayKey();
  await prisma.visitorSession.upsert({
    where: { id: sessionId },
    create: { id: sessionId, firstSeenAt: now, lastSeenAt: now, lastSeenDay: day },
    update: { lastSeenAt: now, lastSeenDay: day },
  });

  if (body?.action === "visit") {
    const visitId = body.visitId?.slice(0, 100);
    if (!visitId) return NextResponse.json({ error: "Missing visit ID" }, { status: 400 });
    await prisma.visitEvent.upsert({
      where: { id: visitId },
      create: { id: visitId, visitedAt: now, visitDay: day },
      update: {},
    });
  }

  return NextResponse.json(await snapshot(), { headers: { "Cache-Control": "no-store" } });
}
