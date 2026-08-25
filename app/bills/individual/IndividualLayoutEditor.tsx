"use client";

import { Input } from "@/components/ui/input";

export interface IndividualBillLayoutSettings {
  fontSizes: {
    motto: number;
    university: number;
    title: number;
    teacherInfo: number;
    figureTable: number;
    remunerationHeader: number;
    remunerationBody: number;
    signatures: number;
    accounts: number;
    note: number;
  };
  sectionGaps: {
    headingToTeacherInfo: number;
    teacherInfoToFigure: number;
    figureToRemuneration: number;
    remunerationToApproval: number;
    approvalToSignatures: number;
    signaturesToAccounts: number;
    accountsToOfficers: number;
    officersToNote: number;
  };
}

export const defaultIndividualBillLayout: IndividualBillLayoutSettings = {
  fontSizes: {
    motto: 9,
    university: 15,
    title: 14,
    teacherInfo: 9,
    figureTable: 10,
    remunerationHeader: 9,
    remunerationBody: 9,
    signatures: 9,
    accounts: 9,
    note: 6.5,
  },
  sectionGaps: {
    headingToTeacherInfo: 10,
    teacherInfoToFigure: 6,
    figureToRemuneration: 8.5,
    remunerationToApproval: 8,
    approvalToSignatures: 82,
    signaturesToAccounts: 10,
    accountsToOfficers: 50,
    officersToNote: 20,
  },
};

const fontLabels: Record<keyof IndividualBillLayoutSettings["fontSizes"], string> = {
  motto: "Motto",
  university: "University name",
  title: "Bill title",
  teacherInfo: "Teacher information",
  figureTable: "Figure table",
  remunerationHeader: "Remuneration header",
  remunerationBody: "Remuneration rows",
  signatures: "Signatures",
  accounts: "Accounts section",
  note: "Bottom note",
};

const gapLabels: Record<keyof IndividualBillLayoutSettings["sectionGaps"], string> = {
  headingToTeacherInfo: "Heading → teacher info",
  teacherInfoToFigure: "Teacher info → figure table",
  figureToRemuneration: "Figure → remuneration table",
  remunerationToApproval: "Table → approval label",
  approvalToSignatures: "Approval label → signatures",
  signaturesToAccounts: "Signatures → accounts box",
  accountsToOfficers: "Accounts box → officers",
  officersToNote: "Officers → bottom note",
};

interface Props {
  settings: IndividualBillLayoutSettings;
  setSettings: (settings: IndividualBillLayoutSettings) => void;
}

export default function IndividualLayoutEditor({ settings, setSettings }: Props) {
  const updateFont = (key: keyof IndividualBillLayoutSettings["fontSizes"], raw: string) => {
    setSettings({ ...settings, fontSizes: { ...settings.fontSizes, [key]: Number(raw) || 0 } });
  };
  const updateGap = (key: keyof IndividualBillLayoutSettings["sectionGaps"], raw: string) => {
    setSettings({ ...settings, sectionGaps: { ...settings.sectionGaps, [key]: Number(raw) || 0 } });
  };

  return (
    <div className="space-y-4 rounded-lg border bg-slate-50 p-4">
      <div>
        <p className="mb-3 text-sm font-medium text-gray-700">Font sizes (pt)</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {(Object.keys(settings.fontSizes) as Array<keyof typeof settings.fontSizes>).map((key) => (
            <label key={key} className="text-xs text-gray-500">
              {fontLabels[key]}
              <Input type="number" min={5} max={24} step={0.5} value={settings.fontSizes[key]} onChange={(event) => updateFont(key, event.target.value)} className="mt-1 h-8" />
            </label>
          ))}
        </div>
      </div>
      <div className="border-t pt-4">
        <p className="mb-3 text-sm font-medium text-gray-700">Section gaps (pt)</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {(Object.keys(settings.sectionGaps) as Array<keyof typeof settings.sectionGaps>).map((key) => (
            <label key={key} className="text-xs text-gray-500">
              {gapLabels[key]}
              <Input type="number" min={0} max={150} step={0.5} value={settings.sectionGaps[key]} onChange={(event) => updateGap(key, event.target.value)} className="mt-1 h-8" />
            </label>
          ))}
        </div>
      </div>
      <p className="text-xs text-amber-700">Large fonts or gaps may exceed the single Legal page.</p>
    </div>
  );
}
