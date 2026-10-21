import { BadgeCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface VerifiedBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({ size = 'md', showLabel = true }) => {
  const { t } = useApp();

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-4.5 h-4.5'
  };

  const textSizes = {
    sm: 'text-[10px] px-2 py-0.5 font-semibold',
    md: 'text-xs px-2.5 py-1 font-semibold',
    lg: 'text-xs px-3.5 py-1.5 font-bold'
  };

  return (
    <span 
      className={`inline-flex items-center gap-1.5 rounded-full badge-verified-emerald ${textSizes[size]}`}
      title={t.verified_badge}
    >
      <BadgeCheck className={`${iconSizes[size]} text-emerald-600 dark:text-emerald-400 shrink-0`} />
      {showLabel && <span className="tracking-tight">{t.verified_badge}</span>}
    </span>
  );
};
