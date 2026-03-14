export function serializeArray(arr: string[]): string {
  return JSON.stringify(arr);
}

export function deserializeArray(val: string | null | undefined): string[] {
  if (!val) return [];
  try { return JSON.parse(val) as string[]; } catch { return []; }
}
