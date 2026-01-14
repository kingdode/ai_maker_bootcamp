'use client';

import { DashboardStats } from '@/lib/types';

interface StatsBarProps {
  stats: DashboardStats;
}

export default function StatsBar({ stats }: StatsBarProps) {
  const statItems = [
    { 
      label: 'Total Offers', 
      value: stats.totalOffers, 
      icon: '📊',
      gradient: 'from-indigo-500 to-purple-500'
    },
    { 
      label: 'Chase Offers', 
      value: stats.chaseOffers, 
      icon: '💙',
      gradient: 'from-blue-500 to-cyan-500'
    },
    { 
      label: 'Amex Offers', 
      value: stats.amexOffers, 
      icon: '💎',
      gradient: 'from-cyan-500 to-teal-500'
    },
    { 
      label: 'Stackable', 
      value: stats.stackableOffers, 
      icon: '🔗',
      gradient: 'from-emerald-500 to-green-500'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {statItems.map((stat) => (
        <div 
          key={stat.label}
          className="relative overflow-hidden bg-[var(--card)] rounded-xl border border-[var(--border)] p-4 group hover:border-indigo-500/30 transition-all"
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-5 transition-opacity`} />
          <div className="flex items-center gap-3">
            <span className="text-2xl">{stat.icon}</span>
            <div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-gray-400">{stat.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
