import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { Loader2, AlertCircle } from 'lucide-react';

export const AuthCallback: React.FC = () => {
  const { navigateTo } = useApp();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function handleAuthCallback() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          if (isMounted) setError(sessionError.message);
          return;
        }

        if (session?.user) {
          // Check if profile exists
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('user_id', session.user.id)
            .maybeSingle();

          if (isMounted) {
            if (profile) {
              navigateTo('/discover');
            } else {
              navigateTo('/onboarding');
            }
          }
        } else {
          // Listen for session completion
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
            if (event === 'SIGNED_IN' && currentSession?.user) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('user_id')
                .eq('user_id', currentSession.user.id)
                .maybeSingle();

              if (isMounted) {
                if (profile) {
                  navigateTo('/discover');
                } else {
                  navigateTo('/onboarding');
                }
              }
            }
          });
          return () => subscription.unsubscribe();
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Authentication failed.');
      }
    }

    handleAuthCallback();

    return () => {
      isMounted = false;
    };
  }, [navigateTo]);

  if (error) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/40 text-[#DC2626] flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-[#15182B] dark:text-white">Authentication Failed</h2>
        <p className="text-xs text-[#667085] dark:text-slate-400 mt-2">{error}</p>
        <button
          onClick={() => navigateTo('/login')}
          className="mt-6 px-5 py-2.5 btn-primary-rose text-xs font-semibold"
        >
          Return to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center">
      <Loader2 className="w-8 h-8 animate-spin text-[#F20D4E] mx-auto mb-4" />
      <h2 className="text-base font-bold text-[#15182B] dark:text-white">Verifying sign-in...</h2>
      <p className="text-xs text-[#667085] dark:text-slate-400 mt-1">Please wait while we secure your session.</p>
    </div>
  );
};
