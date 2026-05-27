export type UserRole = 'admin' | 'engineer' | 'approver' | 'reviewer' | 'leadership';

export interface User {
  id: string;
  email: string;
  password: string;
  role: UserRole;
  name: string;
  avatar: string;
}
