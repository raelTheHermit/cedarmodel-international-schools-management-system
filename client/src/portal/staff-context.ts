import { createContext, useContext } from 'react';
import type { StaffUser } from '../api';

export const StaffContext = createContext<StaffUser | null>(null);

/** The signed-in staff member as reported by the server, or null outside <RequireStaff>. */
export function useStaffOptional(): StaffUser | null {
  return useContext(StaffContext);
}
