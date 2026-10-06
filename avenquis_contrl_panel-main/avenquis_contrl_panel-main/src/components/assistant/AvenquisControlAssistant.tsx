/**
 * Avenquis Control Platform - Floating AI Chatbot
 * "Avenquis Control Assistant"
 * 
 * Features:
 * - Floating trigger button visible across the Control Platform
 * - Deep institutional styling (#143D2D, #C5A869, #FAF8F3)
 * - Deterministic factual queries (zero hallucination for numbers/counts)
 * - Groq AI for summarization, explanation, anomaly detection, prioritization,
 *   support reply drafts, marketing drafts, growth insights
 * - Bengali language support (e.g., "আজকে কয়টা নতুন access request এসেছে?")
 * - Sensitive Action Confirmation: AI Suggests -> Admin Confirms -> Backend Executes
 * - Unified notification integration (reads live notifications and can mark all as read)
 * - Quick-action chips and copilot mode selector
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from '../../context/RouterContext';
import { useNotifications } from '../../context/NotificationContext';
import { assistantService } from '../../services/pageServices';
import { AssistantChatMessage, AssistantActionProposal } from '../../types';
import { cn } from '../../utils/cn';
import {
  Sparkles,
  Bot,
  X,
  Send,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  TrendingUp,
  Activity,
  Layers,
  Check,
  ChevronDown,
  FileText,
  Clock,
  Zap,
} from 'lucide-react';

const QUICK_PROMPTS = [
  { label: '📊 Today’s Summary', query: 'Give me an executive summary of platform telemetry today' },
  { label: '📋 Pending Requests', query: 'Show all pending access requests that require audit review' },
  { label: '🎫 Open Support SLA', query: 'What are the critical open support tickets?' },
  { label: '⚠️ Failed Automations', query: 'Which automation run failed and what is the root cause?' },
  { label: '🇧🇩 বাংলায় সারসংক্ষেপ', query: 'আজকে কয়টা নতুন access request এসেছে?' },
  { label: '📈 Growth & Revenue', query: 'Provide a brief commercial and MRR growth insight' },
];

const COPILOT_MODES = [
  { id: 'all', label: 'All Operations' },
  { id: 'support', label: 'Support Copilot' },
  { id: 'marketing', label: 'Marketing Copilot' },
  { id: 'growth', label: 'Growth Copilot' },
];

export const AvenquisControlAssistant: React.FC = () => {
  const { navigate } = useRouter();
  const { unreadCount, refreshNotifications } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [activeMode, setActiveMode] = useState('all');
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<AssistantChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content:
        '**Avenquis Control Assistant initialized.**\n\nI monitor real-time platform telemetry across **firms, access requests, subscriptions, support queues, and automated agents**.\n\nYou can query operations in **English or বাংলা**, request support reply drafts, marketing nurtures, or summarize operational health.\n\n*Security Protocol: Sensitive actions (approvals, suspensions) always require your explicit confirmation before backend execution.*',
      timestamp: new Date().toISOString(),
      sources: [{ label: 'Live Telemetry' }],
      isAiGenerated: false,
    },
  ]);
  const [actionProcessing, setActionProcessing] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    const userMessage: AssistantChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);

    try {
      const response = await assistantService.sendMessage({
        message: text,
        history: messages.slice(-6),
        contextScope: activeMode,
      });

      const assistantMsg: AssistantChatMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toISOString(),
        suggestedAction: response.suggestedAction,
        sources: response.sources,
        isAiGenerated: response.isAiGenerated,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ **Unable to complete inquiry:** ${err?.message || 'Server connection error'}. Platform telemetry remains secure.`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAction = async (proposal: AssistantActionProposal, messageId: string) => {
    setActionProcessing(proposal.targetId);
    try {
      const result = await assistantService.executeAction({
        actionType: proposal.type,
        targetId: proposal.targetId,
        targetName: proposal.targetName,
        confirmation: true,
        auditReason: `Executed by Super Admin via Avenquis Control Assistant confirmation`,
        payload: proposal.payload,
      });

      // Update proposal state in messages
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId && msg.suggestedAction) {
            return {
              ...msg,
              suggestedAction: {
                ...msg.suggestedAction,
                status: 'executed',
              },
            };
          }
          return msg;
        })
      );

      setActionSuccessMessage(result.message);
      setTimeout(() => setActionSuccessMessage(null), 4000);

      // Add confirmation reply
      setMessages((prev) => [
        ...prev,
        {
          id: `exec-${Date.now()}`,
          role: 'assistant',
          content: `✅ **Action Executed:** ${result.message}\n\nAudit log stream updated and platform state synchronized.`,
          timestamp: new Date().toISOString(),
          sources: [{ label: 'Audit Log' }],
        },
      ]);

      // Synchronize notifications if action affected notifications
      refreshNotifications();
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `exec-err-${Date.now()}`,
          role: 'assistant',
          content: `❌ **Execution Error:** ${err?.message || 'Failed to execute requested action'}.`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setActionProcessing(null);
    }
  };

  const handleCancelAction = (messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId && msg.suggestedAction) {
          return {
            ...msg,
            suggestedAction: {
              ...msg.suggestedAction,
              status: 'cancelled',
            },
          };
        }
        return msg;
      })
    );
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content:
          '**Chat history reset.** Ask any question regarding system operations, access requests, or automated agents.',
        timestamp: new Date().toISOString(),
        sources: [{ label: 'Live Telemetry' }],
      },
    ]);
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className={cn(
            'group relative flex items-center gap-3 px-4 py-3 rounded-full shadow-2xl transition-all cursor-pointer border',
            isOpen
              ? 'bg-[#143D2D] text-white border-[#C5A869]/50 ring-2 ring-[#C5A869]/30'
              : 'bg-[#143D2D] hover:bg-[#0F3023] text-[#FAF7F0] border-[#C5A869]/40 hover:border-[#C5A869]'
          )}
          aria-label="Toggle Avenquis Control Assistant"
        >
          {/* Glowing Status Indicator */}
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#10B981]" />
          </span>

          <Bot className="w-5 h-5 text-[#C5A869]" />

          <div className="flex flex-col text-left">
            <span className="text-xs font-semibold tracking-wide font-sans text-white leading-tight">
              Control Assistant
            </span>
            <span className="text-[10px] text-[#A3B899] font-mono leading-none">
              AI & Telemetry
            </span>
          </div>

          {unreadCount > 0 && !isOpen && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#DC2626] text-white text-[10px] font-mono font-bold shadow-xs">
              {unreadCount}
            </span>
          )}
        </motion.button>
      </div>

      {/* Slide-out / Floating Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-24 right-4 sm:right-6 w-[94vw] sm:w-[440px] h-[640px] max-h-[calc(100vh-120px)] bg-[#FAF8F3] border border-[#E2DACB] rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 ring-1 ring-black/5"
          >
            {/* Header */}
            <div className="px-5 py-4 bg-[#143D2D] text-white flex items-center justify-between border-b border-[#0B251B] select-none shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#1E523E] border border-[#C5A869]/40 flex items-center justify-center text-[#C5A869]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white tracking-wide font-serif">
                      Avenquis Assistant
                    </h3>
                    <span className="px-1.5 py-0.2 rounded bg-[#1E523E] text-[#C5A869] text-[9px] font-mono tracking-wider uppercase border border-[#C5A869]/30">
                      Telemetry
                    </span>
                  </div>
                  <p className="text-[11px] text-[#A3B899] font-sans">
                    Autonomous Intelligence & Governance
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleClearChat}
                  title="Clear chat history"
                  className="p-1.5 rounded-lg text-[#A3B899] hover:text-white hover:bg-[#1E523E] transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  title="Close Assistant"
                  className="p-1.5 rounded-lg text-[#A3B899] hover:text-white hover:bg-[#1E523E] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Success Banner */}
            {actionSuccessMessage && (
              <div className="px-4 py-2 bg-[#EAF3ED] border-b border-[#D5E8DD] text-xs text-[#143D2D] flex items-center gap-2 shrink-0 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 text-[#1D734E] shrink-0" />
                <span className="truncate">{actionSuccessMessage}</span>
              </div>
            )}

            {/* Copilot Mode Selector Bar */}
            <div className="px-3 py-2 bg-[#F3EFE6] border-b border-[#E7DEC8] flex items-center gap-1 overflow-x-auto shrink-0 scrollbar-none">
              <span className="text-[10px] text-[#7E8B82] uppercase tracking-wider font-mono font-medium pl-1 pr-1 shrink-0">
                Scope:
              </span>
              {COPILOT_MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setActiveMode(m.id)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-[11px] font-medium transition-all whitespace-nowrap cursor-pointer',
                    activeMode === m.id
                      ? 'bg-[#143D2D] text-white shadow-xs'
                      : 'bg-white/80 hover:bg-white text-[#4A5568] border border-[#E2DACB]'
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Quick Prompts Carousel */}
            <div className="px-3 py-2 bg-[#FAF8F3] border-b border-[#EDE6D6] overflow-x-auto flex items-center gap-1.5 shrink-0 scrollbar-none">
              {QUICK_PROMPTS.map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(qp.query)}
                  disabled={loading}
                  className="px-2.5 py-1 rounded-lg bg-white border border-[#E2DACB] hover:border-[#C5A869] text-[11px] text-[#2D3748] hover:text-[#143D2D] whitespace-nowrap transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  {qp.label}
                </button>
              ))}
            </div>

            {/* Chat Messages Log */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs leading-relaxed">
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}
                  >
                    <div
                      className={cn(
                        'max-w-[88%] rounded-2xl p-3.5 shadow-2xs',
                        isUser
                          ? 'bg-[#143D2D] text-white rounded-br-xs'
                          : 'bg-white border border-[#E2DACB] text-[#1A202C] rounded-bl-xs'
                      )}
                    >
                      {/* Message Content */}
                      <div className="whitespace-pre-wrap space-y-1.5">
                        {msg.content.split('\n\n').map((para, i) => (
                          <p key={i}>
                            {para.split(/(\*\*.*?\*\*|\*.*?\*)/g).map((chunk, j) => {
                              if (chunk.startsWith('**') && chunk.endsWith('**')) {
                                return (
                                  <strong key={j} className="font-semibold text-inherit">
                                    {chunk.slice(2, -2)}
                                  </strong>
                                );
                              }
                              if (chunk.startsWith('*') && chunk.endsWith('*')) {
                                return (
                                  <em key={j} className="text-inherit opacity-90">
                                    {chunk.slice(1, -1)}
                                  </em>
                                );
                              }
                              return chunk;
                            })}
                          </p>
                        ))}
                      </div>

                      {/* Sensitive Action Proposal Card */}
                      {msg.suggestedAction && (
                        <div className="mt-3 pt-3 border-t border-[#EAE3D2] bg-[#FAF8F3] -mx-3.5 -mb-3.5 p-3.5 rounded-b-2xl">
                          <div className="flex items-center gap-1.5 text-[#B45309] font-medium text-[11px] mb-1.5">
                            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                            <span>Confirmation Required for Mutation</span>
                          </div>

                          <div className="text-[11px] font-semibold text-[#11241C] mb-1">
                            {msg.suggestedAction.title}
                          </div>
                          <div className="text-[10px] text-[#4A5568] mb-3">
                            {msg.suggestedAction.description}
                          </div>

                          {msg.suggestedAction.status === 'pending_confirmation' ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleConfirmAction(msg.suggestedAction!, msg.id)}
                                disabled={actionProcessing === msg.suggestedAction.targetId}
                                className="flex-1 py-1.5 px-3 rounded-lg bg-[#143D2D] hover:bg-[#0F3023] text-white text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                              >
                                {actionProcessing === msg.suggestedAction.targetId ? (
                                  <span>Executing...</span>
                                ) : (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Confirm Action</span>
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => handleCancelAction(msg.id)}
                                disabled={actionProcessing === msg.suggestedAction.targetId}
                                className="py-1.5 px-3 rounded-lg bg-white border border-[#D5CDBC] text-[#4A5568] hover:text-[#11241C] text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : msg.suggestedAction.status === 'executed' ? (
                            <div className="flex items-center gap-1 text-[11px] text-[#15803D] font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Action Executed & Verified</span>
                            </div>
                          ) : (
                            <div className="text-[11px] text-[#6B7280] italic">
                              Action dismissed by administrator.
                            </div>
                          )}
                        </div>
                      )}

                      {/* Source Citations */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-black/5 flex flex-wrap items-center gap-1.5 text-[10px] text-[#718096]">
                          <span className="font-mono">Sources:</span>
                          {msg.sources.map((src, sIdx) => (
                            <button
                              key={sIdx}
                              onClick={() => {
                                if (src.path) navigate(src.path);
                              }}
                              className={cn(
                                'px-1.5 py-0.5 rounded bg-[#F0ECE1] text-[#2D3748] font-mono text-[9px] border border-[#E2DACB] transition-colors',
                                src.path && 'hover:bg-[#E2DACB] hover:text-[#143D2D] cursor-pointer'
                              )}
                            >
                              {src.label} {src.count !== undefined ? `(${src.count})` : ''}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <span className="text-[9px] text-[#A0AEC0] font-mono mt-1 px-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {loading && (
                <div className="flex items-center gap-2 p-3 bg-white border border-[#E2DACB] rounded-2xl w-24 text-xs text-[#718096]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#143D2D] animate-bounce" />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-[#143D2D] animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-[#143D2D] animate-bounce"
                    style={{ animationDelay: '0.4s' }}
                  />
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <div className="p-3 bg-white border-t border-[#E2DACB] shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <textarea
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  rows={1}
                  placeholder="Ask in English or বাংলা (e.g. 'কয়টা request এসেছে?')..."
                  className="flex-1 max-h-24 resize-none bg-[#FAF8F3] border border-[#DCD3C1] focus:border-[#143D2D] focus:ring-1 focus:ring-[#143D2D] rounded-xl px-3 py-2 text-xs text-[#1A202C] placeholder-[#8C9A91] outline-none transition-all font-sans"
                />

                <button
                  type="submit"
                  disabled={!inputMessage.trim() || loading}
                  className="p-2.5 rounded-xl bg-[#143D2D] hover:bg-[#0F3023] text-white disabled:opacity-40 transition-all cursor-pointer shadow-xs shrink-0"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4 text-[#C5A869]" />
                </button>
              </form>

              <div className="mt-2 flex items-center justify-between text-[10px] text-[#718096] px-1 font-mono">
                <span>Deterministic telemetry • AI powered</span>
                <span>Enter ↵ to send</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
