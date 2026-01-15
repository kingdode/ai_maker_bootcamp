import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

// Only allow these email addresses to access admin
// Add your email here
const ALLOWED_ADMIN_EMAILS = [
  process.env.ADMIN_EMAIL || 'your-email@gmail.com',
];

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Only allow sign in if email is in the allowed list
      if (user.email && ALLOWED_ADMIN_EMAILS.includes(user.email)) {
        return true;
      }
      // Reject sign in
      return false;
    },
    async session({ session, token }) {
      // Add user info to session
      if (session.user && token.sub) {
        (session.user as any).id = token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export function isAllowedEmail(email: string): boolean {
  return ALLOWED_ADMIN_EMAILS.includes(email);
}
