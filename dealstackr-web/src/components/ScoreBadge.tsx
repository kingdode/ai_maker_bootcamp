'use client';

import { DealScore, ScoreBand } from '@/lib/types';
import { calculateDealScore, getScoreExplanation, SCORE_BANDS } from '@/lib/offerScoring';

interface ScoreBadgeProps {
  score?: DealScore | null;
  offerValue?: string;
  showTooltip?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * ScoreBadge Component
 * 
 * Displays the DealStackr Score with visual styling based on the score band.
 * Can accept either a pre-computed score or calculate from offer value string.
 */
export default function ScoreBadge({ 
  score, 
  offerValue, 
  showTooltip = true,
  size = 'md' 
}: ScoreBadgeProps) {
  // Calculate score if not provided but offer value is
  const dealScore = score ?? (offerValue ? calculateDealScore(offerValue) : null);
  
  if (!dealScore) {
    return <span className="text-gray-500">—</span>;
  }

  const { finalScore, band, bandInfo } = dealScore;

  // Size-based classes
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-sm gap-1.5',
    lg: 'px-3 py-1.5 text-base gap-2'
  };

  // Band-based color classes
  const bandColors: Record<ScoreBand, { bg: string; text: string; border: string }> = {
    elite: { 
      bg: 'bg-amber-500/20', 
      text: 'text-amber-400',
      border: 'border-amber-500/30'
    },
    strong: { 
      bg: 'bg-emerald-500/20', 
      text: 'text-emerald-400',
      border: 'border-emerald-500/30'
    },
    decent: { 
      bg: 'bg-blue-500/20', 
      text: 'text-blue-400',
      border: 'border-blue-500/30'
    },
    low: { 
      bg: 'bg-gray-500/20', 
      text: 'text-gray-400',
      border: 'border-gray-500/30'
    }
  };

  const colors = bandColors[band];

  return (
    <div 
      className={`inline-flex items-center rounded-full font-semibold border ${sizeClasses[size]} ${colors.bg} ${colors.text} ${colors.border}`}
      title={showTooltip ? bandInfo.description : undefined}
    >
      <span className="font-bold">{finalScore}</span>
      <span>{bandInfo.emoji}</span>
      <span className="hidden sm:inline">{bandInfo.label}</span>
    </div>
  );
}

/**
 * ScoreInfoTooltip Component
 * 
 * Shows information about how the score is calculated.
 */
export function ScoreInfoTooltip() {
  return (
    <div className="group relative inline-block">
      <button className="text-gray-400 hover:text-white transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-800 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 text-xs text-gray-300 border border-gray-700">
        <p className="font-semibold text-white mb-2">📊 How DealStackr Score Works</p>
        <p>{getScoreExplanation()}</p>
        <div className="mt-2 pt-2 border-t border-gray-700">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-amber-400">🔥</span> Elite Deal: 80-100
          </div>
          <div className="flex items-center gap-1 mb-1">
            <span className="text-emerald-400">💪</span> Strong Value: 60-79
          </div>
          <div className="flex items-center gap-1 mb-1">
            <span className="text-blue-400">👍</span> Decent: 40-59
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-400">📉</span> Low Impact: 0-39
          </div>
        </div>
      </div>
    </div>
  );
}
