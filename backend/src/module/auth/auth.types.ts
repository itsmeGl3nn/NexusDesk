export interface LoginInput {
  email: string;
  password: string;
}

export type SignupInput = import("../tenant/tenant.types").RegisterTenantInput;

export interface ConfirmInput {
  email: string;
  code: string;
}

export interface RefreshInput {
  refreshToken: string;
}
