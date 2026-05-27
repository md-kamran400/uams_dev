import { User } from '../types';

export const DUMMY_USERS: User[] = [
  { id: '1', email: 'admin@adani.com', password: 'admin123', role: 'admin', name: 'Raj Patel', avatar: 'RP' },
  { id: '2', email: 'engineer@adani.com', password: 'eng123', role: 'engineer', name: 'Arjun Sharma', avatar: 'AS' },
  { id: '3', email: 'approver@adani.com', password: 'app123', role: 'approver', name: 'Priya Mehta', avatar: 'PM' },
  { id: '4', email: 'reviewer@adani.com', password: 'rev123', role: 'reviewer', name: 'Kavita Singh', avatar: 'KS' },
  { id: '5', email: 'leadership@adani.com', password: 'lead123', role: 'leadership', name: 'Vikram Nair', avatar: 'VN' },
];
