// Mirrors backend UserResponse at
// swisdesk/backend/packages/common/src/schemas/auth.py:108-141 plus the
// new refresh_token field on TokenResponse (lines 100-117). Keep this
// in sync when the backend schema changes — there is no codegen yet.

export type Role = 'user' | 'admin' | 'super_admin';
export type KycStatus = 'pending' | 'submitted' | 'under_review' | 'approved' | 'rejected';
export type AccountStatus = 'active' | 'banned' | 'blocked' | 'pending_verification';

export interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  country: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  date_of_birth: string | null;
  role: Role;
  status: AccountStatus;
  kyc_status: KycStatus;
  is_demo: boolean;
  main_wallet_balance: number;
  two_factor_enabled: boolean;
  language: string;
  theme: string;
  /** Derived server-side: true when first/last name, phone, country, DOB are all set. */
  profile_complete: boolean;
  wallet_address: string | null;
  has_password: boolean;
  has_google: boolean;
  created_at: string;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: 'bearer';
  user_id: string;
  role: Role;
  expires_at: string;
  /** Populated only when backend JWT_INCLUDE_REFRESH_IN_JSON=true (mobile flag). */
  refresh_token: string | null;
}

export interface PlatformStatus {
  maintenance_mode: boolean;
  allow_new_registrations: boolean;
  allow_deposits: boolean;
  allow_withdrawals: boolean;
}
