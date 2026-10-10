import {
  lastLoginMethodClient,
  organizationClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { APP_URL } from "@/lib/constants";
import { ac, admin, member, owner } from "./permissions";

const authClient = createAuthClient({
  baseURL: APP_URL,
  plugins: [
    lastLoginMethodClient(),
    organizationClient({ ac, roles: { owner, admin, member } }),
  ],
});

export const {
  signIn,
  signOut,
  requestPasswordReset,
  resetPassword,
  getSession,
  useSession,
  getLastUsedLoginMethod,
  useActiveOrganization,
  useListOrganizations,
  organization,
  deleteUser,
} = authClient;
