/**
 * Placeholder data for the portal screens.
 *
 * The server does not expose student, results or audit endpoints yet, so the screens render from
 * this module. Replace the exports here (or the call sites) with API calls when those endpoints exist.
 */

export type PortalStudent = {
  id: number;
  name: string;
  admissionNumber: string;
  className: string;
  active: boolean;
  codeGenerated: boolean;
  lastGenerated: string | null;
};

export const portalStudents: PortalStudent[] = [
  { id: 1, name: 'Amina Okafor', admissionNumber: 'SCH/2025/0142', className: 'JSS 2A', active: true, codeGenerated: true, lastGenerated: '18 Mar 2026' },
  { id: 2, name: 'David Eze', admissionNumber: 'SCH/2025/0158', className: 'JSS 2A', active: true, codeGenerated: true, lastGenerated: '18 Mar 2026' },
  { id: 3, name: 'Nneka Ibe', admissionNumber: 'SCH/2025/0181', className: 'JSS 3B', active: true, codeGenerated: true, lastGenerated: '18 Mar 2026' },
  { id: 4, name: 'Tobi Martins', admissionNumber: 'SCH/2025/0204', className: 'SS 1A', active: true, codeGenerated: false, lastGenerated: null },
  { id: 5, name: 'Zainab Musa', admissionNumber: 'SCH/2025/0227', className: 'JSS 1C', active: true, codeGenerated: false, lastGenerated: null },
  { id: 6, name: 'Chidera Nwosu', admissionNumber: 'SCH/2024/0119', className: 'SS 2C', active: false, codeGenerated: false, lastGenerated: null },
  { id: 7, name: 'Fiyinfoluwa Adeyemi', admissionNumber: 'SCH/2025/0241', className: 'JSS 1C', active: true, codeGenerated: false, lastGenerated: null },
  { id: 8, name: 'Samuel Effiong', admissionNumber: 'SCH/2024/0096', className: 'SS 2C', active: true, codeGenerated: false, lastGenerated: null },
];

export const classOptions = ['JSS 1A', 'JSS 1C', 'JSS 2A', 'JSS 3B', 'SS 1A', 'SS 2C'];

export function initialsOf(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/* ---------- Parent portal ---------- */

export type ParentStudent = {
  name: string;
  admissionNumber: string;
  className: string;
  session: string;
  term: string;
};

export const defaultParentStudent: ParentStudent = {
  name: 'Amina Okafor',
  admissionNumber: 'SCH/2025/0142',
  className: 'JSS 2A',
  session: '2025/2026',
  term: 'Second term',
};

export type SubjectResult = { subject: string; ca1: number; ca2: number; exam: number };

export const defaultSubjectResults: SubjectResult[] = [
  { subject: 'English Language', ca1: 17, ca2: 16, exam: 54 },
  { subject: 'General Mathematics', ca1: 18, ca2: 19, exam: 56 },
  { subject: 'Biology', ca1: 16, ca2: 17, exam: 52 },
  { subject: 'Chemistry', ca1: 17, ca2: 16, exam: 50 },
  { subject: 'Physics', ca1: 15, ca2: 17, exam: 49 },
  { subject: 'Further Mathematics', ca1: 14, ca2: 15, exam: 45 },
  { subject: 'Economics', ca1: 16, ca2: 15, exam: 48 },
  { subject: 'Civic Education', ca1: 18, ca2: 17, exam: 51 },
  { subject: 'Computer Studies', ca1: 19, ca2: 18, exam: 55 },
];

export const gradeScale = [
  { grade: 'A', min: 80, max: 100 },
  { grade: 'B', min: 70, max: 79 },
  { grade: 'C', min: 60, max: 69 },
  { grade: 'D', min: 50, max: 59 },
  { grade: 'E', min: 40, max: 49 },
  { grade: 'F', min: 0, max: 39 },
];

export function gradeFor(total: number) {
  return (gradeScale.find((band) => total >= band.min) ?? gradeScale[gradeScale.length - 1]).grade;
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

/** Splits a total into CA 1 / CA 2 / exam (20 / 20 / 60) for records that only carry a total. */
export function splitTotal(subject: string, total: number): SubjectResult {
  const ca1 = Math.min(20, Math.round(total * 0.2));
  const ca2 = Math.min(20, Math.round(total * 0.19));
  return { subject, ca1, ca2, exam: Math.max(0, Math.min(60, total - ca1 - ca2)) };
}

export const reportMeta = {
  department: 'Science',
  classLabel: 'SS 2 Science',
  position: { rank: 3, of: 28 },
  attendance: { schoolDays: 62, present: 59 },
  record: { conduct: 'Excellent', punctuality: 'Very good', house: 'Emerald', club: 'Science & Technology' },
  comment:
    'Amina demonstrates strong analytical ability and consistent commitment across her science subjects. She should sustain her revision routine and participate more in group discussions.',
  teacher: 'Mr T. Balogun',
  nextTermBegins: '28 April 2026',
};

/** Demo accounts created by server/scripts/seed.js; names are placeholders until the API returns them. */
const seededDemoStudents: Record<string, { name: string; totals: Array<[string, number]> }> = {
  'ADM-0001': { name: 'Aisha Adebayo', totals: [['English', 92], ['Mathematics', 88], ['Science', 90], ['Social Studies', 87]] },
  'ADM-0002': { name: 'Femi Bello', totals: [['English', 81], ['Mathematics', 86], ['Science', 79], ['Computer Studies', 90]] },
  'ADM-0003': { name: 'Tosin Adeyemi', totals: [['English', 76], ['Mathematics', 80], ['Biology', 82], ['Civic Education', 78]] },
};

export type ResolvedParentStudent = {
  student: ParentStudent;
  results: SubjectResult[];
  /** True when the student is the design's sample record rather than someone looked up by admission number. */
  isSample: boolean;
  /** False when the API has not told us the child's name yet. */
  nameKnown: boolean;
};

/**
 * The parent login API only returns an admission number, so the child's name and results are looked up
 * locally for now. Without an admission number (direct visits to a screen) the design's sample student is used.
 */
export function resolveParentStudent(admissionNumber?: string): ResolvedParentStudent {
  if (!admissionNumber) {
    return { student: defaultParentStudent, results: defaultSubjectResults, isSample: true, nameKnown: true };
  }

  if (admissionNumber === defaultParentStudent.admissionNumber) {
    return { student: defaultParentStudent, results: defaultSubjectResults, isSample: true, nameKnown: true };
  }

  const listed = portalStudents.find((student) => student.admissionNumber === admissionNumber);
  const demo = seededDemoStudents[admissionNumber];
  const name = listed?.name ?? demo?.name ?? 'Your child';

  return {
    student: {
      ...defaultParentStudent,
      name,
      admissionNumber,
      className: listed?.className ?? defaultParentStudent.className,
    },
    results: demo ? demo.totals.map(([subject, total]) => splitTotal(subject, total)) : defaultSubjectResults,
    isSample: false,
    nameKnown: Boolean(listed || demo),
  };
}

export function greetingForNow(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/* ---------- Admin: results upload, review and audit ---------- */

export const resultUploads = [
  { id: 1, title: 'JSS 2A Mathematics', owner: 'Mrs. Adeyemi', detail: '42 records', status: 'Validated' },
  { id: 2, title: 'JSS 2A English', owner: 'Mr. Bello', detail: '42 records', status: 'Validated' },
  { id: 3, title: 'JSS 3B Basic Science', owner: 'Mrs. Ibe', detail: '41 records', status: 'Processing' },
  { id: 4, title: 'SS 1A Economics', owner: 'Mr. Ekanem', detail: '34 records', status: 'Draft' },
];

export const resultReviews = [
  { id: 1, title: 'JSS 3B', owner: 'Second term', detail: '41 students', status: 'Awaiting approval' },
  { id: 2, title: 'SS 1A', owner: 'Second term', detail: '34 students', status: 'Awaiting approval' },
  { id: 3, title: 'SS 2C', owner: 'Second term', detail: '29 students', status: 'Awaiting approval' },
  { id: 4, title: 'JSS 2A', owner: 'Second term', detail: '42 students', status: 'Published' },
];

export const auditEntries = [
  { id: 1, title: 'Results published', owner: 'JSS 2A · Second term', detail: 'Admin User', status: 'Today, 09:42' },
  { id: 2, title: 'Access codes generated', owner: 'JSS 3B · 41 codes', detail: 'Admin User', status: 'Today, 08:16' },
  { id: 3, title: 'Results approved', owner: 'SS 1A · Mathematics', detail: 'Admin User', status: 'Yesterday' },
  { id: 4, title: 'Student record updated', owner: 'Tobi Martins', detail: 'Admin User', status: '18 Mar 2026' },
];
