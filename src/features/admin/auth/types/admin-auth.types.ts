export type PublicAdmin = {
  id: string;
  email: string;
  displayName: string;
};

export type CreatedAdminSession = {
  admin: PublicAdmin;
  token: string;
  expiresAt: string;
};

export type ValidatedAdminSession = {
  sessionId: string;
  admin: PublicAdmin;
  expiresAt: string;
};
