'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get('error');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState('');

  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError('');
    setMessage('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setAuthError(error.message);
      setLoading(false);
    } else {
      router.push('/admin');
      router.refresh();
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError('');
    setMessage('');

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/admin`,
      },
    });

    if (error) {
      setAuthError(error.message);
    } else {
      setMessage('Check your email to confirm your account!');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">💰</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            DealStackr Admin
          </h1>
          <p className="text-gray-400">Sign in to manage your deals</p>
        </div>

        {/* Login Card */}
        <div className="bg-[#12121a] rounded-2xl border border-[#2a2a3a] p-8">
          <h2 className="text-xl font-bold text-white text-center mb-6">
            {isSignUp ? 'Create Account' : 'Sign In'}
          </h2>

          {/* Error Messages */}
          {(error || authError) && (
            <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center">
              {error === 'AccessDenied' 
                ? '❌ Access denied. Your email is not authorized for admin access.'
                : authError || 'An error occurred during sign in.'}
            </div>
          )}

          {/* Success Message */}
          {message && (
            <div className="mb-6 px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm text-center">
              ✅ {message}
            </div>
          )}

          {/* Email/Password Form */}
          <form onSubmit={isSignUp ? handleSignUp : handleLogin}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 bg-[#0a0a0f] border border-[#2a2a3a] rounded-xl text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-[#0a0a0f] border border-[#2a2a3a] rounded-xl text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Loading...' : isSignUp ? '📝 Create Account' : '🔐 Sign In'}
              </button>
            </div>
          </form>

          {/* Toggle Sign Up / Sign In */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setAuthError('');
                setMessage('');
              }}
              className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center mt-6">
            Only authorized administrators can access this dashboard.
          </p>
        </div>

        {/* Back Link */}
        <div className="text-center mt-6">
          <Link 
            href="/" 
            className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors"
          >
            ← Back to DealStackr
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="animate-pulse text-white">Loading...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
