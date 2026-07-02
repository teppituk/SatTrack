import "next-auth";

export interface RolePermissions {
  dashboard: boolean;
  upload: boolean;
  chart: boolean;
  exchanges: boolean;
  share: boolean;
  subscription: boolean;
  settings: boolean;
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
      isActive: boolean;
      permissions: RolePermissions | null;
    };
  }

  interface User {
    id: string;
    role?: string;
    isActive?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    isActive: boolean;
    permissions: RolePermissions | null;
  }
}
