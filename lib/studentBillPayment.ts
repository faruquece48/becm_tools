import { z } from "zod";

export const labReportPrices = {
  none: 0,
  cover: 65,
  main: 110,
  both: 175,
} as const;

export const studentPaymentSchema = z.object({
  studentName: z.string().trim().min(2).max(100),
  email: z.email().max(150),
  phone: z.string().trim().regex(/^(?:\+?88)?01[3-9]\d{8}$/, "Enter a valid Bangladeshi mobile number"),
  rentalBookCount: z.number().int().min(0).max(50),
  labReportOption: z.enum(["none", "cover", "main", "both"]),
  associationYear: z.number().int().min(0).max(4),
  letterOfAttestation: z.boolean(),
  equivalentCertificate: z.boolean(),
  rentalBooks: z.array(z.object({
    id: z.string().min(1),
    quantity: z.literal(1),
  })).max(5).optional(),
}).superRefine((input, context) => {
  if (!input.rentalBooks) return;
  const seen = new Set<string>();
  for (const selection of input.rentalBooks) {
    if (seen.has(selection.id)) {
      context.addIssue({ code: "custom", path: ["rentalBooks"], message: "Each title can only be selected once" });
      return;
    }
    seen.add(selection.id);
  }
});

export type StudentPaymentInput = z.infer<typeof studentPaymentSchema>;

export function calculateStudentBill(input: Pick<StudentPaymentInput, "rentalBookCount" | "labReportOption" | "associationYear" | "letterOfAttestation" | "equivalentCertificate">) {
  return input.rentalBookCount * 20
    + labReportPrices[input.labReportOption]
    + (input.associationYear === 0 ? 0 : 750)
    + (input.letterOfAttestation ? 200 : 0)
    + (input.equivalentCertificate ? 200 : 0);
}
