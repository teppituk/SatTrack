import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          throw new Error("No account found with this email");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("Invalid password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: user.isActive,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "CUSTOMER";
        token.isActive = user.isActive ?? true;
      }
      // Always fetch fresh role/isActive from DB on each JWT refresh
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, isActive: true, plan: true, planExpiresAt: true },
        });
        if (dbUser) {
          // ปรับ role ตามอายุแผน (จ่ายแล้ว=CUSTOMER, หมดอายุ=CUSTOMER_FREE) — ทันทีใน request นี้
          const { syncExpiredPlan } = await import("@/lib/subscription");
          const effectiveRole = await syncExpiredPlan({
            id: token.id as string,
            plan: dbUser.plan,
            planExpiresAt: dbUser.planExpiresAt,
            role: dbUser.role,
          });
          token.role = effectiveRole;
          token.isActive = dbUser.isActive;
          const roleRecord = await prisma.role.findUnique({
            where: { name: effectiveRole },
            select: { permissions: true },
          });
          token.permissions = (roleRecord?.permissions as unknown as import("@/types/next-auth").RolePermissions) ?? null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.isActive = token.isActive as boolean;
        session.user.permissions = token.permissions;
      }
      return session;
    },
  },
};
