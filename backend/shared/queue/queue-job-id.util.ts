export function toBullSafeJobId(rawJobId: string) {
  return String(rawJobId).replaceAll(':', '__');
}
