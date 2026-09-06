/** Round to two decimal places according to the third decimal digit. */
export function roundResultToTwo(value: number) {
  if (!Number.isFinite(value)) return 0;
  const sign = value < 0 ? -1 : 1;
  const thousandths = Math.floor((Math.abs(value) + 1e-10) * 1000);
  const hundredths = Math.floor(thousandths / 10) + (thousandths % 10 >= 5 ? 1 : 0);
  return sign * hundredths / 100;
}

export function formatResultToTwo(value: number) {
  return roundResultToTwo(value).toFixed(2);
}
