export function normalizeBookImageUrl(value: string) {
  const url = value.trim();
  if (!url.includes("blogger.googleusercontent.com")) return url;
  return url.replace(/\/w\d+-h\d+-c\//i, "/s0/");
}
