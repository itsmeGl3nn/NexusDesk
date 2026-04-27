export interface Tenant {
  PK: string;           // TENANT#<tenantId>
  SK: string;           // META
  tenantId: string;
  name: string;
  status: "active" | "suspended";
  createdAt: string;
  updatedAt: string;
}

export interface RegisterTenantInput {
  tenantName: string;
  adminEmail: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
}

export interface RegisterTenantOutput {
  tenant: Tenant;
  adminUserId: string;
  adminEmail: string;
}
