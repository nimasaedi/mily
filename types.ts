export enum UserRole {
  USER = 'user',
  ADMIN = 'admin'
}

export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal'
}

export enum TransactionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export interface User {
  id: number;
  email: string;
  referralCode?: string;
  role: UserRole;
  isActive: boolean;
  balance: number;
  createdAt: string;
}

export interface Transaction {
  id: number;
  userId: number;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  date: string;
  txHash?: string; // For withdrawals or crypto txs
}

export interface SiteSettings {
  adminWalletAddress: string;
  minDeposit: number;
  minWithdraw: number;
}