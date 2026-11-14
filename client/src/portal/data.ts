/** Display-only helper; this module contains no student or school records. */
export function initialsOf(name: string): string {
  return name.split(' ').filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase();
}
