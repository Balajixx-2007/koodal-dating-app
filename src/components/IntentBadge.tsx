import React from 'react';
import { RelationshipIntent } from '../types';
import { Flame, HeartHandshake, Crown, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface IntentBadgeProps {
  intent: RelationshipIntent;
  size?: 'sm' | 'md' | 'lg';
  showDesc?: boolean;
}

export const IntentBadge: React.FC<IntentBadgeProps> = ({ intent, size = 'md', showDesc = false }) => {
  const { t } = useApp();

  const config = {
    casual: {
      label: t.intent_casual,
      desc: t.intent_casual_desc,
      icon: Flame,
      badgeClass: 'intent-casual'
    },
    long_term: {
      label: t.intent_long_term,
      desc: t.intent_long_term_desc,
      icon: HeartHandshake,
      badgeClass: 'intent-long-term'
    },
    marriage: {
      label: t.intent_marriage,
      desc: t.intent_marriage_desc,
      icon: Crown,
      badgeClass: 'intent-marriage'
    },
    friendship: {
      label: t.intent_friendship,
      desc: t.intent_friendship_desc,
      icon: Users,
      badgeClass: 'intent-friendship'
    }
  }[intent];

  const Icon = config.icon;
  const sizeClasses = {
    sm: 'text-[11px] px-2.5 py-1 gap-1.5 font-medium',
    md: 'text-xs px-3 py-1.5 gap-1.5 font-semibold tracking-tight',
    lg: 'text-sm px-4 py-2 gap-2 font-bold tracking-tight'
  }[size];

  return (
    <div className="inline-flex flex-col">
      <span className={`inline-flex items-center rounded-full ${config.badgeClass} ${sizeClasses} select-none transition-transform hover:scale-[1.01]`}>
        <Icon className={size === 'sm' ? 'w-3.5 h-3.5 shrink-0' : size === 'lg' ? 'w-4.5 h-4.5 shrink-0' : 'w-4 h-4 shrink-0'} strokeWidth={2} />
        <span>{config.label}</span>
      </span>
      {showDesc && (
        <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm leading-relaxed">
          {config.desc}
        </span>
      )}
    </div>
  );
};
