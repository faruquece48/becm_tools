import { getPrisma } from "@/lib/prisma";

const sandboxBase = "https://sandbox.sslcommerz.com";
const liveBase = "https://securepay.sslcommerz.com";

function config() {
  const storeId = process.env.SSLCOMMERZ_STORE_ID || process.env.STORE_ID;
  const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD || process.env.STORE_PASSWORD;
  const isLive = process.env.SSLCOMMERZ_IS_LIVE === "true";
  return { storeId, storePassword, baseUrl: isLive ? liveBase : sandboxBase, isLive };
}

export function sslcommerzMode() {
  return config().isLive ? "live" : "sandbox";
}

export function sslcommerzIsConfigured() {
  const { storeId, storePassword } = config();
  return Boolean(storeId && storePassword);
}

export async function initiateSslcommerzPayment(args: {
  transactionId: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  origin: string;
}) {
  const { storeId, storePassword, baseUrl } = config();
  if (!storeId || !storePassword) throw new Error("SSLCOMMERZ credentials are not configured");

  const appOrigin = (process.env.APP_URL || args.origin).replace(/\/$/, "");
  const body = new URLSearchParams({
    store_id: storeId,
    store_passwd: storePassword,
    total_amount: args.amount.toFixed(2),
    currency: "BDT",
    tran_id: args.transactionId,
    success_url: `${appOrigin}/api/student-payments/success`,
    fail_url: `${appOrigin}/api/student-payments/fail`,
    cancel_url: `${appOrigin}/api/student-payments/cancel`,
    ipn_url: `${appOrigin}/api/student-payments/ipn`,
    shipping_method: "NO",
    product_name: "BECM Student Bill Payment",
    product_category: "Education",
    product_profile: "general",
    cus_name: args.customerName,
    cus_email: args.customerEmail,
    cus_add1: "RUET, Rajshahi",
    cus_city: "Rajshahi",
    cus_postcode: "6204",
    cus_country: "Bangladesh",
    cus_phone: args.customerPhone,
  });

  const response = await fetch(`${baseUrl}/gwprocess/v4/api.php`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`SSLCOMMERZ returned HTTP ${response.status}`);
  const data = await response.json() as { GatewayPageURL?: string; failedreason?: string; status?: string };
  if (!data.GatewayPageURL) throw new Error(data.failedreason || "SSLCOMMERZ did not return a checkout URL");
  return data.GatewayPageURL;
}

export async function validateSslcommerzPayment(validationId: string, transactionId: string) {
  const { storeId, storePassword, baseUrl } = config();
  if (!storeId || !storePassword) throw new Error("SSLCOMMERZ credentials are not configured");

  const prisma = getPrisma();
  if (!prisma) throw new Error("Database is not configured");
  const payment = await prisma.studentBillPayment.findUnique({ where: { transactionId }, include: { rentalOrder: { include: { items: true } } } });
  if (!payment) throw new Error("Unknown transaction");

  const query = new URLSearchParams({ val_id: validationId, store_id: storeId, store_passwd: storePassword, format: "json" });
  const response = await fetch(`${baseUrl}/validator/api/validationserverAPI.php?${query}`, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`SSLCOMMERZ validation returned HTTP ${response.status}`);
  const validation = await response.json() as { status?: string; tran_id?: string; amount?: string; currency?: string; bank_tran_id?: string };
  const validStatus = validation.status === "VALID" || validation.status === "VALIDATED";
  const validAmount = Number(validation.amount) === payment.amount;
  if (!validStatus || validation.tran_id !== transactionId || validation.currency !== "BDT" || !validAmount) {
    throw new Error("Payment validation failed");
  }

  return prisma.$transaction(async (tx) => {
    const current = await tx.studentBillPayment.findUnique({ where: { transactionId }, include: { rentalOrder: { include: { items: true } } } });
    if (!current) throw new Error("Unknown transaction");
    if (current.status === "PAID") return current;

    if (current.rentalOrder) {
      for (const item of current.rentalOrder.items) {
        const updated = await tx.rentalBook.updateMany({ where: { id: item.bookId, active: true, quantity: { gte: item.quantity } }, data: { quantity: { decrement: item.quantity } } });
        if (updated.count !== 1) throw new Error("A selected rental book is no longer available");
      }
      await tx.rentalOrder.update({ where: { id: current.rentalOrder.id }, data: { status: "AWAITING_ACTIVATION", rentedAt: null, dueAt: null } });
    }

    return tx.studentBillPayment.update({ where: { transactionId }, data: { status: "PAID", validationId, bankTransactionId: validation.bank_tran_id || null, paidAt: current.paidAt || new Date() } });
  });
}
