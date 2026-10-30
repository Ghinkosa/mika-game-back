import 'express-session';

export type UserRole = 'ADMIN' | 'SUPER_AGENT' | 'AGENT' | 'PLAYER';
export type AccountStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
export type CashRequestType = 'DEPOSIT' | 'WITHDRAWAL';
export type CashRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    role?: UserRole;
    csrfToken?: string;
  }
}

export interface UserRecord {
  id: string;
  username: string;
  display_name: string;
  role: UserRole;
  status: AccountStatus;
  parent_id: string | null;
  phone_number: string | null;
  cbe_account: string | null;
  commission_rate: string | number;
  created_at: string;
  updated_at: string;
}

export interface WalletRecord {
  user_id: string;
  currency: string;
  balance_minor: string | number;
  updated_at: string;
}
