type SeriesInputProps = {
  value: string;
  onChange: (value: string) => void;
  inputClassName: string;
  placeholder?: string;
};

export default function SeriesInput({ value, onChange, inputClassName, placeholder }: SeriesInputProps) {
  const numericValue = Number(value);
  const canAdjust = value.trim() !== "" && Number.isFinite(numericValue);
  const adjust = (amount: number) => {
    if (canAdjust) onChange(String(numericValue + amount));
  };

  return (
    <div className="mt-1.5 flex items-stretch gap-2">
      <button
        type="button"
        onClick={() => adjust(-1)}
        disabled={!canAdjust}
        className="w-10 shrink-0 rounded-lg border border-slate-300 bg-white text-xl font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Decrease series by one"
        title="Decrease series by one"
      >
        −
      </button>
      <input
        inputMode="numeric"
        className={`${inputClassName} !mt-0 min-w-0 flex-1`}
        style={{ fontFamily: '"Times New Roman", Times, serif' }}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={() => adjust(1)}
        disabled={!canAdjust}
        className="w-10 shrink-0 rounded-lg border border-slate-300 bg-white text-xl font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Increase series by one"
        title="Increase series by one"
      >
        +
      </button>
    </div>
  );
}
