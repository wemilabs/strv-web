import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, lastLoginMethod, organization } from "better-auth/plugins";
import { eq, inArray, type SQLWrapper } from "drizzle-orm";
import { Resend } from "resend";
import { OrganizationInvitationEmail } from "@/components/emails/org-invitation";
import { ForgotPasswordEmail } from "@/components/emails/reset-password";
import { VerifyEmail } from "@/components/emails/verify-email";
import { db } from "@/db/drizzle";
import {
  inventoryHistory,
  member,
  order,
  orderItem,
  orderUsageTracking,
  organization as organizationTable,
  product,
  productLike,
  productTag,
  schema,
} from "@/db/schema";
import {
  ac,
  admin as customAdminRole,
  member as customMemberRole,
  owner as customOwnerRole,
} from "./permissions";

const resend = new Resend(process.env.RESEND_API_KEY as string);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      try {
        await resend.emails.send({
          from: `${process.env.EMAIL_SENDER_NAME} <${process.env.PASSWORD_RESET_EMAIL_SENDER_ADDRESS}>`,
          to: [user.email],
          subject: "Reset your password",
          react: ForgotPasswordEmail({
            username: user.name,
            resetUrl: url,
            userEmail: user.email,
          }),
        });
      } catch (error) {
        const e = error as Error;
        console.error(e.message);
      }
    },
    onPasswordReset: async ({ user }) => {
      console.log(`Password for user ${user.email} has been reset.`);
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      try {
        await resend.emails.send({
          from: `${process.env.EMAIL_SENDER_NAME} <${process.env.VERIFY_EMAIL_SENDER_ADDRESS}>`,
          to: [user.email],
          subject: "Verify your email address",
          react: VerifyEmail({
            username: user.name,
            verifyUrl: url,
          }),
        });
      } catch (error) {
        const e = error as Error;
        console.error(e.message);
      }
    },
    sendOnSignUp: true,
    // expiresIn: 3600,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  plugins: [
    admin({
      defaultRole: "regular",
    }),
    lastLoginMethod({ storeInDatabase: true }),
    nextCookies(),
    organization({
      ac,
      sendInvitationEmail: async data => {
        const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/api/accept-invitation/${data.id}`;

        await resend.emails.send({
          from: `${process.env.EMAIL_SENDER_NAME} <${process.env.ORG_INVITATION_EMAIL_SENDER_ADDRESS}>`,
          to: data.email,
          subject: "You've been invited to join our organization",
          react: OrganizationInvitationEmail({
            email: data.email,
            invitedByUsername: data.inviter.user.name,
            invitedByEmail: data.inviter.user.email,
            teamName: data.organization.name,
            inviteLink,
          }),
        });
      },
      roles: {
        owner: customOwnerRole,
        admin: customAdminRole,
        member: customMemberRole,
      },
    }),
    expo(),
  ],
  trustedOrigins: [
    "strvmobile://",
    "exp://192.168.1.62:8081",
    "exp://192.168.1.63:8081",
    "exp://192.168.1.64:8081",
    "exp://192.168.1.65:8081",
    "exp://192.168.1.66:8081",
  ],
  user: {
    additionalFields: {
      followersCount: {
        type: "number",
        required: false,
        defaultValue: 0,
        input: false,
      },
      followingCount: {
        type: "number",
        required: false,
        defaultValue: 0,
        input: false,
      },
    },
    deleteUser: {
      enabled: true,
      beforeDelete: async (user: { id: string | SQLWrapper }) => {
        const userOrgs = await db.query.member.findMany({
          where: eq(member.userId, user.id),
          with: {
            organization: true,
          },
        });

        // Delete all organizations and their data
        for (const userOrg of userOrgs) {
          const orgId = userOrg.organization.id;

          // Get all order and product IDs for bulk deletion
          const orders = await db.query.order.findMany({
            where: eq(order.organizationId, orgId),
            columns: { id: true },
          });
          const orderIds = orders.map(o => o.id);

          const products = await db.query.product.findMany({
            where: eq(product.organizationId, orgId),
            columns: { id: true },
          });
          const productIds = products.map(p => p.id);

          // Delete order items
          if (orderIds.length > 0) {
            await db
              .delete(orderItem)
              .where(inArray(orderItem.orderId, orderIds));
          }

          // Delete orders
          await db.delete(order).where(eq(order.organizationId, orgId));

          // Delete product-related data
          if (productIds.length > 0) {
            await db
              .delete(productTag)
              .where(inArray(productTag.productId, productIds));
            await db
              .delete(productLike)
              .where(inArray(productLike.productId, productIds));
          }

          // Delete inventory history
          await db
            .delete(inventoryHistory)
            .where(eq(inventoryHistory.organizationId, orgId));

          // Delete products
          await db.delete(product).where(eq(product.organizationId, orgId));

          // Delete order usage tracking
          await db
            .delete(orderUsageTracking)
            .where(eq(orderUsageTracking.organizationId, orgId));

          // Delete organization
          await db
            .delete(organizationTable)
            .where(eq(organizationTable.id, orgId));
        }

        console.log(
          `Deleted ${userOrgs.length} organization${
            userOrgs.length <= 1 ? "" : "s"
          } for user ${user.id}`,
        );
      },
      afterDelete: async (user: { name: string }) => {
        console.log(`User "${user.name}" successfully deleted!`);
      },
    },
  },
});
