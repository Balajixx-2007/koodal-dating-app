import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { IntentBadge } from '../components/IntentBadge';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { ReportBlockModal } from '../components/ReportBlockModal';
import { 
  ArrowLeft, Send, ShieldAlert, Sparkles, UserRound, Heart, AlertCircle 
} from 'lucide-react';
import { ChatService } from '../lib/chat-service';

interface ChatProps {
  matchId?: string;
}

export const Chat: React.FC<ChatProps> = ({ matchId }) => {
  const { 
    viewParam, 
    matches, 
    messages, 
    sendMessage, 
    currentUser, 
    currentView,
    navigateTo,
    fetchMessagesForMatch,
    markMatchAsRead
  } = useApp();

  const [inputBody, setInputBody] = useState('');
  const [reporting, setReporting] = useState(false);
  const [likedMessageIds, setLikedMessageIds] = useState<string[]>([]);
  const [showDateIdeas, setShowDateIdeas] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeMatchId = matchId || viewParam || (currentView.startsWith('/chat/') ? currentView.replace('/chat/', '') : undefined) || matches[0]?.id;
  const match = matches.find(m => m.id === activeMatchId);
  const currentMessages = activeMatchId ? (messages[activeMatchId] || []) : [];

  const CHENNAI_DATE_IDEAS = [
    { label: '🌅 Sunset Beach Walk', text: 'Would you like to catch the sunset at Besant Nagar Beach this weekend?' },
    { label: '☕ Mylapore Filter Coffee', text: 'How about catching up over authentic filter coffee at Mylapore sometime?' },
    { label: '📚 Higginbothams Books', text: 'I would love to browse books at Higginbothams and chat over coffee!' },
    { label: '🕯️ Candlelight Dinner', text: 'Are you free for an intimate dinner at Amethyst Cafe this Friday?' },
  ];

  // Fetch real messages & subscribe to realtime changes on mount or when activeMatchId changes
  useEffect(() => {
    if (!activeMatchId) return;

    fetchMessagesForMatch(activeMatchId);
    markMatchAsRead(activeMatchId);

    const channel = ChatService.subscribeToMessages(activeMatchId, (newMsg) => {
      fetchMessagesForMatch(activeMatchId);
      if (currentUser?.id && newMsg.sender_id !== currentUser.id) {
        markMatchAsRead(activeMatchId);
      }
    });

    return () => {
      if (channel && typeof channel.unsubscribe === 'function') {
        channel.unsubscribe();
      }
    };
  }, [activeMatchId, fetchMessagesForMatch, markMatchAsRead, currentUser?.id]);

  const toggleMessageLike = (msgId: string) => {
    setLikedMessageIds(prev =>
      prev.includes(msgId) ? prev.filter(id => id !== msgId) : [...prev, msgId]
    );
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages]);

  if (!match) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <p className="text-sm text-[#667085]">Conversation not found.</p>
        <button
          onClick={() => navigateTo('/matches')}
          className="mt-4 px-4 py-2 btn-primary-rose text-xs"
        >
          Back to Matches
        </button>
      </div>
    );
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputBody.trim();
    if (!trimmed || isSending) return;

    setSendError(null);
    setIsSending(true);
    try {
      const success = await sendMessage(match.id, trimmed);
      if (success === false) {
        setSendError('Unable to send message. Please verify your connection.');
      } else {
        setInputBody('');
      }
    } catch {
      setSendError('An unexpected error occurred while sending your message.');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendIcebreaker = async (promptText: string) => {
    setSendError(null);
    try {
      const success = await sendMessage(match.id, promptText);
      if (success === false) {
        setSendError('Unable to send message. Please verify your connection.');
      }
    } catch {
      setSendError('An unexpected error occurred while sending your message.');
    }
  };

  const handlePickDateIdea = (dateText: string) => {
    setInputBody(dateText);
    setShowDateIdeas(false);
  };

  const partner = match.matchedProfile;

  return (
    <div className="max-w-xl mx-auto px-4 py-4 flex flex-col h-[calc(100vh-120px)] sm:h-[750px]">
      {/* Refined Header */}
      <div className="surface-card p-3.5 flex items-center justify-between gap-3 shrink-0 mb-2">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigateTo('/matches')}
            className="p-1.5 rounded-full hover:bg-[#FFF0F3] text-[#667085] hover:text-[#15182B] dark:hover:bg-slate-800 transition-colors"
            aria-label="Back to matches list"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div 
            onClick={() => navigateTo(`/profile/${partner.id || partner.userId}`)}
            className="relative cursor-pointer shrink-0"
          >
            <img
              src={partner.photos[0]}
              alt={partner.name}
              className="w-11 h-11 rounded-2xl object-cover border border-[#F0E3E6] shadow-xs"
            />
            <div className="absolute -bottom-1 -right-1">
              <VerifiedBadge size="sm" showLabel={false} />
            </div>
          </div>

          <div 
            onClick={() => navigateTo(`/profile/${partner.id || partner.userId}`)}
            className="cursor-pointer min-w-0"
          >
            <div className="flex items-center gap-1.5">
              <h3 className="font-heading font-bold text-sm text-[#15182B] dark:text-white truncate">
                {partner.name}
              </h3>
              <VerifiedBadge size="sm" showLabel={false} />
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <IntentBadge intent={partner.intent} size="sm" />
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigateTo(`/profile/${partner.id || partner.userId}`)}
            className="p-2 rounded-xl text-[#98A2B3] hover:text-[#F20D4E] hover:bg-[#FFF0F3] dark:hover:bg-slate-800 transition-colors"
            title="View Profile"
            aria-label="View Profile"
          >
            <UserRound className="w-4 h-4" />
          </button>
          <button
            onClick={() => setReporting(true)}
            className="p-2 rounded-xl text-[#98A2B3] hover:text-[#DC2626] hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            title="Report or Block"
            aria-label="Report or Block"
          >
            <ShieldAlert className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Safety Notice Banner */}
      <div className="mb-2 p-2.5 rounded-xl bg-[#FFFBEB] dark:bg-amber-950/20 border border-[#FDE68A] dark:border-amber-900/40 flex items-center justify-between text-[11px] text-[#92400E] dark:text-amber-300 shrink-0">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-[#D97706] shrink-0" />
          <span>Keep chats safe: Never share OTPs or send money.</span>
        </div>
        <button
          onClick={() => navigateTo('/safety')}
          className="underline font-semibold text-[#D97706] shrink-0 ml-2"
        >
          Safety Guide
        </button>
      </div>

      {/* Error Banner */}
      {sendError && (
        <div className="mb-2 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex items-center gap-2 text-xs text-red-700 dark:text-red-300 shrink-0">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{sendError}</span>
        </div>
      )}

      {/* Conversation Openers & Date Ideas */}
      <div className="mb-2 space-y-1.5 shrink-0">
        {currentMessages.length <= 2 && partner.prompts && partner.prompts.length > 0 && (
          <div className="p-3 bg-[#FFF9F5] dark:bg-slate-800/80 border border-[#F0E3E6] dark:border-slate-700 rounded-2xl">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#D80B42] dark:text-rose-400 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Conversation Openers:</span>
              </div>
              <button
                type="button"
                onClick={() => setShowDateIdeas(!showDateIdeas)}
                className="text-[11px] font-semibold text-[#F20D4E] hover:underline flex items-center gap-1"
              >
                <Heart className="w-3 h-3 fill-[#F20D4E]" />
                <span>{showDateIdeas ? 'Hide Date Ideas' : 'Chennai Date Ideas'}</span>
              </button>
            </div>
            
            {!showDateIdeas ? (
              <div className="flex flex-wrap gap-1.5">
                {partner.prompts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSendIcebreaker(`I noticed you said "${p.answer}" for "${p.question}". Tell me more!`)}
                    className="text-left text-xs bg-white dark:bg-slate-900 p-2 rounded-xl border border-[#F0E3E6] dark:border-slate-700 text-[#15182B] dark:text-slate-200 hover:border-[#F8B4C4] transition-all"
                  >
                    <span className="font-semibold block text-[10px] text-[#D80B42]">{p.question}</span>
                    <span className="line-clamp-1 italic text-[#667085] dark:text-slate-400">"{p.answer}"</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5 animate-card-entrance">
                {CHENNAI_DATE_IDEAS.map((idea, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePickDateIdea(idea.text)}
                    className="text-left p-2 rounded-xl bg-white dark:bg-slate-900 border border-[#F8B4C4]/60 hover:border-[#F20D4E] text-xs transition-colors"
                  >
                    <span className="font-semibold text-[11px] text-[#D80B42] block">{idea.label}</span>
                    <span className="text-[10px] text-[#667085] line-clamp-1">{idea.text}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Messages Thread Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 surface-card mb-2 shadow-xs">
        {currentMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#98A2B3] space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF0F3] text-[#F20D4E] flex items-center justify-center border border-[#F0E3E6] animate-romantic-heartbeat">
              <Heart className="w-6 h-6 fill-[#F20D4E]" />
            </div>
            <p className="text-xs font-semibold text-[#15182B] dark:text-slate-200">You both matched on {partner.intent.replace('_', ' ')}!</p>
            <p className="text-[11px] text-[#667085]">Break the ice with a thoughtful hello or invite them for coffee.</p>
          </div>
        ) : (
          currentMessages.map((msg) => {
            const isMe = msg.senderId === currentUser?.id || msg.senderId === 'usr_me_01';
            const timeStr = new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const isHearted = likedMessageIds.includes(msg.id);

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-card-entrance group relative`}
              >
                <div className="relative">
                  <div
                    className={`max-w-[80vw] sm:max-w-md rounded-2xl px-3.5 py-2 text-xs sm:text-sm font-normal shadow-xs leading-relaxed ${
                      isMe
                        ? 'bg-gradient-to-r from-[#F20D4E] to-[#D80B42] text-white rounded-br-xs'
                        : 'bg-white dark:bg-slate-800 text-[#15182B] dark:text-white border border-[#F0E3E6] dark:border-slate-700 rounded-bl-xs'
                    }`}
                  >
                    <p>{msg.body}</p>
                  </div>

                  {/* Heart Reaction Badge */}
                  {isHearted && (
                    <div className="absolute -bottom-2 -right-1 bg-white dark:bg-slate-900 border border-[#F8B4C4] rounded-full p-0.5 shadow-xs animate-love-pop z-10">
                      <Heart className="w-3.5 h-3.5 fill-[#F20D4E] text-[#F20D4E]" />
                    </div>
                  )}

                  {/* Quick Heart Reaction Button */}
                  <button
                    type="button"
                    onClick={() => toggleMessageLike(msg.id)}
                    aria-label={isHearted ? "Remove love reaction" : "React with love"}
                    className={`absolute ${isMe ? '-left-6' : '-right-6'} top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-[#98A2B3] hover:text-[#F20D4E] focus:opacity-100`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isHearted ? 'fill-[#F20D4E] text-[#F20D4E]' : ''}`} />
                  </button>
                </div>

                <span className="text-[10px] text-[#98A2B3] mt-1 px-1 font-medium">
                  {timeStr}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Bar */}
      <form onSubmit={handleSend} className="flex items-center gap-2 shrink-0">
        <input
          type="text"
          value={inputBody}
          onChange={(e) => setInputBody(e.target.value)}
          placeholder="Type a thoughtful message or date idea..."
          maxLength={2000}
          disabled={isSending}
          className="flex-1 text-xs sm:text-sm p-3 rounded-xl border border-[#F0E3E6] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#15182B] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F20D4E] shadow-xs disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!inputBody.trim() || isSending}
          className="p-3 rounded-xl btn-primary-rose flex items-center justify-center disabled:opacity-50"
          title="Send message"
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {reporting && (
        <ReportBlockModal
          targetProfile={partner}
          onClose={() => setReporting(false)}
        />
      )}
    </div>
  );
};
