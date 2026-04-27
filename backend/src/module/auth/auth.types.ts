export interface LoginInput {
  email: string;
  password: string;
}

export interface SignupInput {
  email: string;
  password: string;
  tenantId: string;
}

export interface ConfirmInput {
  email: string;
  code: string;
}

export interface RefreshInput {
  refreshToken: string;
}
