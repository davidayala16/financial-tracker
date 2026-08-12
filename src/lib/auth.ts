import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const allowedEmail = process.env.ALLOWED_EMAIL;

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  pages: {
    error: "/access-denied",
  },
  callbacks: {
    async signIn({ user }) {
      if (!allowedEmail) {
        throw new Error("ALLOWED_EMAIL env var is not set");
      }
      return user.email?.toLowerCase() === allowedEmail.toLowerCase();
    },
  },
});
