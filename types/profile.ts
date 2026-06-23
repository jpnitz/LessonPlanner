export type Profile = {
  id: string;
  full_name: string;
  created_at: string;
  updated_at: string;
};

export type StudentSafe = {
  id: string;
  auth_user_id: string;
  managed_by_user_id: string;
  is_primary: boolean;
  login_id: string | null;
  login_email: string | null;
  display_name: string;
  birthday: string | null;
  zip_code: string | null;
  created_at: string;
  updated_at: string;
  is_profile_complete: boolean;
  has_llm_api_key: boolean;
  llm_api_key_masked: string | null;
};

export type StudentFormValues = {
  display_name: string;
  birthday: string;
  zip_code: string;
  login_id?: string;
  login_email?: string;
  password?: string;
  llm_api_key?: string;
  clear_llm_api_key?: boolean;
};
