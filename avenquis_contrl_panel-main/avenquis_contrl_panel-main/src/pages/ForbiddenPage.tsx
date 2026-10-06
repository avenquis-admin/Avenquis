import React from 'react';
import { ShieldAlert, LogOut, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';

export const ForbiddenPage: React.FC = () => {
  const { user, signOut } = useAuth();
  const { navigate } = useRouter();

  return (
    <div className="min-h-screen bg-[#F8F6F0] flex items-center justify-center p-6 text-center select-none">
      <div className="max-w-md w-full bg-[#FAF8F3] border border-[#F0C2C0] rounded-2xl p-8 shadow-xl space-y-6 relative overflow-hidden">
        {/* Subtle Background Accents */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#FCE8E7]/40 rounded-full -mr-16 -mt-16 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#C5A869]/5 rounded-full -ml-12 -mb-12 blur-2xl" />

        <div className="relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-[#FCE8E7] text-[#C5302C] mx-auto flex items-center justify-center shadow-sm border border-[#F0C2C0]/50 mb-6">
            <ShieldAlert className="w-7 h-7" />
          </div>
          
          <h2 className="text-xl font-serif font-semibold text-[#182620] tracking-tight">
            Administrative Access Denied
          </h2>
          
          <div className="mt-4 p-4 bg-[#FDFBF7] border border-[#EAF3ED] rounded-xl text-left">
            <p className="text-[13px] text-[#52635B] leading-relaxed">
              Your identity (<span className="font-mono font-medium text-[#11241C]">{user?.email || 'Unknown'}</span>) 
              is authenticated but does not possess the required <code className="px-1.5 py-0.5 rounded bg-[#FCE8E7] text-[#8A1F1D] font-mono font-semibold text-[11px]">PLATFORM_SUPER_ADMIN</code> authorization.
            </p>
            <p className="mt-3 text-[12px] text-[#6F7F77] leading-relaxed italic">
              Access to the Avenquis Control Platform is strictly restricted to platform-level administrative personnel.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <button
              onClick={() => signOut()}
              className="w-full py-3 px-4 rounded-xl bg-[#143D2D] text-white text-xs font-medium hover:bg-[#0E2C20] transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out & Switch Account
            </button>
            
            <button
              onClick={() => navigate('/sign-in')}
              className="w-full py-3 px-4 rounded-xl bg-white border border-[#E1E6E3] text-[#52635B] text-xs font-medium hover:bg-[#F8F9F8] transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
