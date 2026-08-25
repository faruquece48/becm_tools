export async function printNotice() {
  await document.fonts.ready;
  window.print();
}
