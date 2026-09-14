import type { AppDatabase } from '@/types';

export const STORAGE_KEY = 'zubkas_workspace_db_v2';

export const emptyDb: AppDatabase = {
  clients: [],
  quotations: [],
  invoices: [],
  payments: [],
  accounting: [],
  projects: [],
  subscriptions: [],
};
