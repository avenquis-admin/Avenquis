/**
 * Avenquis Control Panel - Executive Platform Admin Sign-In Screen
 * Redesigned to match the premium editorial Fames & R / AVENQUIS design language.
 * Strictly restricted to PLATFORM_SUPER_ADMIN.
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
import { authService } from '../../services/authService';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { EASE_OUT } from '../../utils/motion';
import {
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  Building2,
  Users,
  CreditCard,
  Cpu,
  Sparkles,
} from 'lucide-react';

export const SignInPage: React.FC = () => {
  const { signIn } = useAuth();
  const { navigate } = useRouter();

  const [email, setEmail] = useState(() => authService.getRememberedEmail() || '');
  const [password, setPassword] = useState('â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleConfirmResetPassword = async () => {
    if (!email.trim()) {
      setResetError('Please enter your administrator email address above before requesting credential recovery.');
      return;
    }
    setIsResettingPassword(true);
    setResetError(null);
    try {
      const res = await authService.requestPasswordReset(email.trim());
      if (res.success) {
        setResetSent(true);
      } else {
        setResetError(res.errorMessage || 'Failed to dispatch password recovery instructions.');
      }
    } catch {
      setResetError('Unable to connect to authentication server for credential recovery.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const result = await signIn({
        email: email.trim(),
        password,
        rememberMe,
      });

      if (result.success) {
        const params = new URLSearchParams(window.location.search);
        let returnTo = params.get('returnTo');
        
        // Prevent open redirects (must be relative path, no protocol-relative or backslash paths)
        if (returnTo && (!returnTo.startsWith('/') || returnTo.startsWith('//') || returnTo.includes('\\'))) {
          returnTo = '/overview';
        }
        
        navigate(returnTo || '/overview');
      } else {
        navigate('/overview');
      }
    } catch {
      navigate('/overview');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#191F1D] flex flex-col justify-between selection:bg-[#143D2D] selection:text-[#FAF7F0] relative overflow-hidden">
      {/* Decorative soft pastel ambient blobs matching screenshot */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#EAF3ED]/60 blur-3xl pointer-events-none" />
      <div className="absolute top-1/4 -right-32 w-[28rem] h-[28rem] rounded-full bg-[#FCEEEA]/50 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/3 w-80 h-80 rounded-full bg-[#FEF6E4]/40 blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="h-20 px-6 sm:px-12 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#143D2D] flex items-center justify-center text-[#FAF7F0] font-serif font-bold text-base shadow-xs">
            A
          </div>
          <div className="flex flex-col">
            <span className="font-serif tracking-wide font-bold text-lg text-[#11241C] leading-none">
              AVENQUIS
            </span>
            <span className="text-[9px] font-sans font-semibold tracking-[0.24em] text-[#C59A4E] uppercase mt-1">
              CONTROL PANEL
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6 text-sm text-[#4A5568]">
          <span className="hidden md:inline-block text-xs uppercase tracking-wider text-[#6B7280] font-medium">
            Platform Administration
          </span>
          <div className="w-2 h-2 rounded-full bg-[#1D734E]" title="Platform Status: Operational" />
        </div>
      </header>

      {/* Main Content: Split Editorial Hero + Sign In Card */}
      <main className="flex-1 flex items-center justify-center px-6 sm:px-12 py-8 relative z-10">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Hero Column */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, ease: EASE_OUT }}
            className="lg:col-span-7 space-y-8"
          >
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2">
              <span className="text-xs uppercase tracking-[0.2em] font-semibold text-[#143D2D]">
                Platform Administration
              </span>
              <span className="text-[#C59A4E] text-xs">âœ¦</span>
              <div className="h-px w-12 bg-[#D1D5DB]" />
            </div>

            {/* Executive Display Headline */}
            <div className="space-y-1">
              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-fraunces font-semibold text-[#11241C] tracking-tight leading-[1.06]">
                Govern with Clarity.
              </h1>
              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-fraunces font-semibold text-[#11241C] tracking-tight leading-[1.06]">
                Operate with Control.
              </h1>
              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-fraunces font-semibold text-[#A27C3B] tracking-tight leading-[1.06]">
                Scale with Confidence.
              </h1>
            </div>

            {/* Subtitle */}
            <p className="text-base sm:text-lg font-manrope font-medium text-[#526058] leading-relaxed max-w-xl">
              Manage every critical platform operation from one secure administrative workspace.
            </p>

            {/* Soft Pastel Feature Tiles matching screenshot */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.08, delayChildren: 0.12 },
                },
              }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2"
            >
              {/* Tile 1: Soft Mint */}
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE_OUT } },
                }}
                whileHover={{ y: -2, transition: { duration: 0.18, ease: EASE_OUT } }}
                className="p-3.5 rounded-2xl bg-[#E9F3EE] border border-[#D5E8DD] space-y-2 cursor-default"
              >
                <div className="w-8 h-8 rounded-xl bg-white/90 flex items-center justify-center text-[#143D2D] shadow-xs">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#143D2D] leading-tight">Firm</p>
                  <p className="text-xs font-semibold text-[#143D2D] leading-tight">Management</p>
                </div>
              </motion.div>

              {/* Tile 2: Soft Butter */}
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE_OUT } },
                }}
                whileHover={{ y: -2, transition: { duration: 0.18, ease: EASE_OUT } }}
                className="p-3.5 rounded-2xl bg-[#FEF6E4] border border-[#F6E6BF] space-y-2 cursor-default"
              >
                <div className="w-8 h-8 rounded-xl bg-white/90 flex items-center justify-center text-[#9E741B] shadow-xs">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#825C10] leading-tight">User</p>
                  <p className="text-xs font-semibold text-[#825C10] leading-tight">Governance</p>
                </div>
              </motion.div>

              {/* Tile 3: Soft Peach */}
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE_OUT } },
                }}
                whileHover={{ y: -2, transition: { duration: 0.18, ease: EASE_OUT } }}
                className="p-3.5 rounded-2xl bg-[#FCEEEA] border border-[#F6D3C8] space-y-2 cursor-default"
              >
                <div className="w-8 h-8 rounded-xl bg-white/90 flex items-center justify-center text-[#B94732] shadow-xs">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#9C3826] leading-tight">Accounts &</p>
                  <p className="text-xs font-semibold text-[#9C3826] leading-tight">Finance</p>
                </div>
              </motion.div>

              {/* Tile 4: Soft Sky Blue */}
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE_OUT } },
                }}
                whileHover={{ y: -2, transition: { duration: 0.18, ease: EASE_OUT } }}
                className="p-3.5 rounded-2xl bg-[#EBF3F8] border border-[#D0E2EE] space-y-2 cursor-default"
              >
                <div className="w-8 h-8 rounded-xl bg-white/90 flex items-center justify-center text-[#215E87] shadow-xs">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#1B4F72] leading-tight">AI Control</p>
                  <p className="text-xs font-semibold text-[#1B4F72] leading-tight">Center</p>
                </div>
              </motion.div>
            </motion.div>

            {/* Decorative Dot Matrix in corner matching screenshot */}
            <div className="hidden sm:flex items-center gap-3 pt-4 opacity-50">
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: 15 }).map((_, i) => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#B8A892]" />
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right Column: Admin Sign In Card */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, delay: 0.1, ease: EASE_OUT }}
            className="lg:col-span-5 w-full max-w-md mx-auto"
          >
            <div className="bg-white border border-[#EFE9DF] rounded-[28px] p-8 sm:p-10 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.05)] relative">
              
              <div className="space-y-1.5 mb-8">
                <h2 className="text-3xl sm:text-[2rem] font-serif font-normal text-[#11241C] tracking-tight">
                  Welcome Back
                </h2>
                <p className="text-sm text-[#71717A]">
                  Sign in to continue to your workspace.
                </p>
              </div>

              {errorMessage && (
                <div className="mb-6 p-3.5 rounded-xl bg-[#FDF2F2] border border-[#F8D7DA] text-[#9A2222] text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#DC2626]" />
                  <div className="leading-relaxed">{errorMessage}</div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email Address */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="email"
                    className="block text-xs font-semibold text-[#374151]"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9CA3AF]">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@avenquis.internal"
                      className="w-full pl-10 pr-3.5 py-3 text-sm bg-white border border-[#E4DFD5] rounded-xl text-[#11241C] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#143D2D] focus:ring-2 focus:ring-[#143D2D]/10 transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold text-[#374151]"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9CA3AF]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                      className="w-full pl-10 pr-10 py-3 text-sm bg-white border border-[#E4DFD5] rounded-xl text-[#11241C] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#143D2D] focus:ring-2 focus:ring-[#143D2D]/10 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-[#9CA3AF] hover:text-[#143D2D] transition-colors duration-150 cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between pt-0.5 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-[#4B5563] hover:text-[#11241C] transition-colors duration-150">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-[#D1D5DB] text-[#143D2D] focus:ring-[#143D2D] accent-[#143D2D] cursor-pointer"
                    />
                    <span>Remember me</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setForgotPasswordOpen(true)}
                    className="text-[#143D2D] hover:text-[#0E2C1E] hover:underline font-medium transition-colors duration-150 cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Sign In Button with subtle hover lift and press state */}
                <motion.button
                  whileHover={{ y: -1.5, transition: { duration: 0.15, ease: EASE_OUT } }}
                  whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-6 rounded-xl bg-[#143D2D] hover:bg-[#0E2C1E] text-white font-medium text-sm flex items-center justify-center gap-2 shadow-xs hover:shadow-md transition-all disabled:opacity-60 cursor-pointer mt-2"
                >
                  {isSubmitting ? (
                    <span>Entering Platform...</span>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>
              </form>

              {/* Administrative Isolation Notice */}
              <div className="mt-8 pt-6 border-t border-[#F0EBE1] text-center">
                <p className="text-xs text-[#71717A] leading-relaxed">
                  Authorized Platform Super Administrators only. Single Sign-On and enterprise access are managed by platform governance.
                </p>
              </div>
            </div>
          </motion.div>

        </div>
      </main>

      {/* Footer matching screenshot style */}
      <footer className="h-16 px-6 sm:px-12 flex flex-col sm:flex-row items-center justify-between border-t border-[#EFE9DF] bg-[#FAF8F3]/80 text-xs text-[#71717A] relative z-10">
        <span>&copy; {new Date().getFullYear()} Avenquis. All rights reserved.</span>
        <div className="flex items-center gap-4 mt-2 sm:mt-0">
          <span className="hover:text-[#11241C] cursor-pointer">Privacy Policy</span>
          <span>|</span>
          <span className="hover:text-[#11241C] cursor-pointer">Terms of Service</span>
          <span>|</span>
          <span className="hover:text-[#11241C] cursor-pointer">Support</span>
        </div>
      </footer>

      {/* Forgot Password Modal */}
      <ConfirmationModal
        isOpen={forgotPasswordOpen}
        onClose={() => {
          if (!isResettingPassword) {
            setForgotPasswordOpen(false);
            setResetSent(false);
            setResetError(null);
          }
        }}
        onConfirm={resetSent ? () => { setForgotPasswordOpen(false); setResetSent(false); } : handleConfirmResetPassword}
        isLoading={isResettingPassword}
        title="Admin Credential Recovery"
        description={
          resetError
            ? resetError
            : resetSent
            ? 'Password recovery instructions have been dispatched by the authentication server. Please check your inbox.'
            : email.trim()
            ? `Send authoritative password reset instructions to ${email}? For platform security, administrator identity verification is required.`
            : 'Please enter your administrator email address in the sign-in form before requesting password recovery.'
        }
        confirmLabel={resetSent ? 'Close' : isResettingPassword ? 'Sending...' : 'Send Instructions'}
        variant={resetError ? 'danger' : 'warning'}
      />
    </div>
  );
};



