import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Heart, Mail, ArrowRight } from 'lucide-react';

interface AuthProps {
  isSignUp?: boolean;
}

export const Auth: React.FC<AuthProps> = ({ isSignUp = true }) => {
  const { t, navigateTo } = useApp();
  const [email, setEmail] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }
    if (!ageConfirmed) {
      setError('You must confirm you are 18 years of age or older to enter.');
      return;
    }

    setError('');
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      if (isSignUp) {
        navigateTo('/onboarding');
      } else {
        navigateTo('/discover');
      }
    }, 400);
  };

  const handleGoogleSignIn = () => {
    if (!ageConfirmed) {
      setError('Please check the 18+ confirmation checkbox before continuing with Google.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigateTo(isSignUp ? '/onboarding' : '/discover');
    }, 400);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="surface-card p-8 relative overflow-hidden">
        {/* Brand Heart Icon */}
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#F20D4E] to-[#D80B42] text-white flex items-center justify-center mx-auto mb-4 shadow-sm">
          <Heart className="w-6 h-6 fill-white" />
        </div>

        <div className="text-center mb-6">
          <h2 className="font-heading text-2xl font-bold text-[#15182B] dark:text-white">
            {isSignUp ? 'Create your Account' : 'Welcome back'}
          </h2>
          <p className="text-xs text-[#667085] dark:text-slate-400 mt-1">
            {isSignUp 
              ? 'Join verified members in Chennai & campus communities'
              : 'Sign in to access your matches and conversations'
            }
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-[#FFF0F3] dark:bg-rose-950/40 border border-[#F8B4C4] text-xs font-semibold text-[#DC2626]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#15182B] dark:text-slate-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#98A2B3] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@university.edu or email@example.com"
                required
                className="w-full text-xs pl-10 pr-4 py-3 rounded-xl border border-[#F0E3E6] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#15182B] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F20D4E]"
              />
            </div>
            <p className="text-[11px] text-[#98A2B3] mt-1">
              We send a passwordless magic link to sign in. No SMS fees or passwords.
            </p>
          </div>

          {/* Mandatory 18+ Age Gate Checkbox */}
          <div className="p-3.5 rounded-2xl bg-[#FFFBEB] dark:bg-amber-950/30 border border-[#FDE68A] dark:border-amber-900/60">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={ageConfirmed}
                onChange={(e) => {
                  setAgeConfirmed(e.target.checked);
                  if (error && e.target.checked) setError('');
                }}
                className="mt-0.5 rounded text-[#F20D4E] focus:ring-[#F20D4E] w-4 h-4"
              />
              <div className="text-xs">
                <span className="font-bold text-[#15182B] dark:text-white block">
                  {t.age_gate_confirm}
                </span>
                <span className="text-[#667085] dark:text-slate-400 text-[11px] block mt-0.5 leading-snug">
                  Strict 18+ policy: Every account suspected of being underage is permanently removed and reported.
                </span>
              </div>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 btn-primary-rose text-xs flex items-center justify-center gap-2"
          >
            <span>{loading ? 'Sending link...' : isSignUp ? 'Continue with Email' : 'Sign in with Email'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#F0E3E6] dark:border-slate-800"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-slate-900 px-3 text-[#98A2B3] text-[10px] font-bold tracking-wider">
              Or continue with
            </span>
          </div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-3 btn-secondary-surface text-xs flex items-center justify-center gap-2.5 shadow-xs"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="mt-6 text-center text-xs text-[#667085]">
          {isSignUp ? (
            <p>
              Already have an account?{' '}
              <button 
                onClick={() => navigateTo('/login')} 
                className="font-bold text-[#F20D4E] hover:underline"
              >
                Sign in
              </button>
            </p>
          ) : (
            <p>
              New to Koodal?{' '}
              <button 
                onClick={() => navigateTo('/signup')} 
                className="font-bold text-[#F20D4E] hover:underline"
              >
                Create account
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
