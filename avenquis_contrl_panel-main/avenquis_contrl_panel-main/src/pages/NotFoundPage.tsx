import React from 'react';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import { useRouter } from '../context/RouterContext';

export const NotFoundPage: React.FC = () => {
  const { navigate } = useRouter();

  return (
    <div className="min-h-screen bg-[#F8F6F0] flex items-center justify-center p-6 text-center select-none">
      <div className="max-w-md w-full bg-[#FAF8F3] border border-[#E1E6E3] rounded-2xl p-8 shadow-xl space-y-6 relative overflow-hidden">
        {/* Subtle Background Accents */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A869]/10 rounded-full -mr-16 -mt-16 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#143D2D]/5 rounded-full -ml-12 -mb-12 blur-2xl" />

        <div className="relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-[#EAF3ED] text-[#143D2D] mx-auto flex items-center justify-center shadow-sm border border-[#D1E1D7]/50 mb-6">
            <FileQuestion className="w-7 h-7" />
          </div>
          
          <h2 className="text-xl font-serif font-semibold text-[#182620] tracking-tight">
            Page Not Found
          </h2>
          
          <p className="text-[13px] text-[#52635B] leading-relaxed max-w-[280px] mx-auto">
            The requested resource could not be located or has been moved within the Avenquis ecosystem.
          </p>

          <div className="mt-8">
            <button
              onClick={() => navigate('/overview')}
              className="w-full py-3 px-4 rounded-xl bg-[#143D2D] text-white text-xs font-medium hover:bg-[#0E2C20] transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to Dashboard
            </button>
          </div>
          
          <div className="mt-6 pt-6 border-t border-[#E1E6E3]/60">
            <p className="text-[11px] text-[#6F7F77] font-mono tracking-wider">
              ERROR CODE: 404_NOT_FOUND
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
