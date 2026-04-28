import React, { useEffect, useState } from 'react';
import { leaderboardAPI } from '../utils/api';
import { FiTrendingUp, FiActivity, FiUsers, FiAward, FiZap, FiStar } from 'react-icons/fi';
import Card from './Card';

const FunLeaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const response = await leaderboardAPI.getFun();
        setLeaderboard(response.data.leaderboard);
        setLoading(false);
      } catch (err) {
        setError('Operational Telemetry Interrupted');
        setLoading(false);
      }
    };

    loadLeaderboard();
    const interval = setInterval(loadLeaderboard, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div className="py-64 flex flex-col items-center justify-center">
      <FiZap className="text-yellow-500 animate-pulse mb-24" size={48} />
      <p className="text-brand-text-muted font-medium uppercase tracking-[0.3em] text-12">Streaming Experimental Rankings...</p>
    </div>
  );

  return (
    <div className="w-full animate-in fade-in duration-700">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-24 py-16 rounded-xl mb-32 font-medium flex items-center space-x-12">
          <FiActivity size={20} />
          <span>{error}</span>
        </div>
      )}

      <Card className="p-0 overflow-hidden border border-yellow-500/20 bg-brand-surface shadow-premium flex flex-col">
        <div className="overflow-x-auto overflow-y-auto flex-1 hidden-scrollbar relative">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-[#0F172A] shadow-md">
              <tr className="border-b border-brand-border">
                <th className="px-[24px] py-[20px] border-b border-brand-border">
                  <div className="flex items-center space-x-4">
                    <FiAward className="text-yellow-500" size={14} />
                    <span className="text-brand-text-muted font-semibold uppercase tracking-widest text-10 whitespace-nowrap">Rank</span>
                  </div>
                </th>
                <th className="px-[24px] py-[20px] border-b border-brand-border">
                  <div className="flex items-center space-x-4">
                    <FiUsers className="text-yellow-500" size={14} />
                    <span className="text-brand-text-muted font-semibold uppercase tracking-widest text-10 whitespace-nowrap">Unit Identity</span>
                  </div>
                </th>
                {[1, 2, 3, 4, 5].map(f => (
                  <th key={f} className="px-[24px] py-[20px] border-b border-brand-border text-center">
                     <span className="text-brand-text-muted font-semibold uppercase tracking-widest text-10 whitespace-nowrap">Funderon {f}</span>
                  </th>
                ))}
                <th className="px-[24px] py-[20px] border-b border-brand-border text-right">
                  <div className="flex items-center justify-end space-x-4">
                    <FiStar className="text-yellow-500" size={14} />
                    <span className="text-brand-text-muted font-semibold uppercase tracking-widest text-10 whitespace-nowrap">Fun Points</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {leaderboard.map((team, idx) => (
                <tr key={team.teamId} className="group transition-colors hover:bg-white/[0.02]">
                  <td className="px-[24px] py-[24px]">
                     <div className="flex items-center space-x-12">
                       <span className={`text-16 font-bold font-mono ${
                         idx === 0 ? 'text-yellow-500' : 
                         idx === 1 ? 'text-gray-400' : 
                         idx === 2 ? 'text-amber-600' : 
                         'text-brand-text-muted opacity-50'
                       }`}>
                          {idx + 1}
                       </span>
                     </div>
                  </td>
                  <td className="px-[24px] py-[24px] whitespace-nowrap">
                     <span className="text-14 font-semibold text-brand-text-primary group-hover:text-yellow-500 transition-colors">{team.teamName}</span>
                  </td>
                  {[1, 2, 3, 4, 5].map(f => {
                    const points = team[`f${f}`];
                    return (
                      <td key={f} className="px-[24px] py-[24px] text-center">
                        <span className={`font-mono text-14 ${points > 0 ? 'text-yellow-400' : 'text-brand-text-muted opacity-40'}`}>
                            {points > 0 ? `${points} pts` : '0 pts'}
                        </span>
                      </td>
                    );
                  })}
                  <td className="px-[24px] py-[24px] text-right">
                    <span className={`text-18 font-bold font-mono tracking-tight ${idx === 0 ? 'text-yellow-500' : 'text-brand-text-primary'}`}>
                      {team.funPoints || 0} pts
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {leaderboard.length === 0 && (
        <div className="flex flex-col items-center justify-center py-64 rounded-2xl border border-brand-border/40 bg-brand-surface/20 shadow-inner overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/5 to-transparent pointer-events-none" />
          <div className="bg-[#111827] p-24 rounded-full border border-brand-border/40 mb-24 shadow-[0_0_40px_rgba(234,179,8,0.1)]">
            <FiStar size={48} className="text-yellow-500 animate-pulse" />
          </div>
          <p className="text-16 font-bold uppercase tracking-[0.2em] text-[#F9FAFB] mb-8">Awaiting Fun Engagement</p>
          <p className="text-12 font-medium text-brand-text-muted">Experimental leaderboards will automatically populate upon first round completion.</p>
        </div>
      )}
    </div>
  );
};

export default FunLeaderboard;
