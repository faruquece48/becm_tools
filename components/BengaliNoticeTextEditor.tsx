import { Fragment } from "react";
import { bijoyToUnicode, unicodeToBijoy } from "@abdalgolabs/ansi-unicode-converter";

type BengaliNoticeTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  defaultValue: string;
};

export default function BengaliNoticeTextEditor({ value, onChange, defaultValue }: BengaliNoticeTextEditorProps) {
  return (
    <details className="rounded-lg border bg-slate-50">
      <summary className="cursor-pointer px-3 py-3 text-sm font-semibold text-slate-700">
        Notice main text
      </summary>
      <div className="border-t p-3">
        <p className="mb-2 text-xs text-slate-500">Type Bengali with Avro or any Unicode Bengali keyboard. Leave empty to use the default notice text.</p>
        <textarea
          lang="bn"
          rows={7}
          value={value || defaultValue}
          onChange={(event) => onChange(event.target.value)}
          placeholder="বাংলায় নোটিশের মূল লেখা লিখুন…"
          style={{ fontFamily: '"Nirmala UI", Arial, sans-serif' }}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
      </div>
    </details>
  );
}

export function bijoyNoticeToUnicode(text: string) {
  const coursePattern = /(BECM\s*-?\s*\d{4}\s*\([^)]*\))/gi;
  return text.split(coursePattern).map((part) =>
    /^BECM\s*-?\s*\d{4}\s*\([^)]*\)$/i.test(part) ? part : bijoyToUnicode(part),
  ).join("");
}

export function toSutonnyNumber(value: string | number) {
  const bengaliDigits = withBengaliDigits(String(value));
  return unicodeToBijoy(bengaliDigits);
}

function withBengaliDigits(value: string) {
  return value.replace(/\d/g, (digit) => "০১২৩৪৫৬৭৮৯"[Number(digit)]);
}

export function SutonnyNoticeText({ text }: { text: string }) {
  const coursePattern = /(BECM\s*-?\s*\d{4}\s*\([^)]*\))/gi;
  return text.split(coursePattern).map((part, index) =>
    /^BECM\s*-?\s*\d{4}\s*\([^)]*\)$/i.test(part) ? (
      <span key={index} className="notice-times">{part}</span>
    ) : (
      <Fragment key={index}>{unicodeToBijoy(withBengaliDigits(part))}</Fragment>
    ),
  );
}
