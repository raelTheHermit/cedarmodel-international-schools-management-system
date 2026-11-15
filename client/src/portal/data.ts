/** Small display helpers shared by the portal screens. All school data now comes from the API. */

export function initialsOf(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function ordinal(n: number) {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

export function greetingForNow(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Compatibility shim: portal/auth.tsx still calls this after parent login to build router state.
 * The parent pages no longer read that state (they load /api/parent/report), so it returns nothing real.
 */
export function resolveParentStudent(admissionNumber?: string) {
  return {
    student: { name: '', admissionNumber: admissionNumber ?? '', className: '', session: '', term: '' },
    nameKnown: false,
  };
}
