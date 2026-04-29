import React, { useEffect, useState } from 'react';
import { leaderboardAPI } from '../utils/api';
import { FiTrendingUp, FiActivity, FiUsers, FiAward, FiZap, FiStar, FiClock, FiTarget } from 'react-icons/fi';
import Card from './Card';

const FunLeaderboard = ({ isFullScreen = false, filterRound = null }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const response = await leaderboardAPI.getFun();
        let newData = response.data.leaderboard;

        if (filterRound !== null) {
          newData = [...newData].sort((a, b) => {
            const pA = a[`f${filterRound}`] || 0;
            const pB = b[`f${filterRound}`] || 0;
            if (pB !== pA) return pB - pA;
            return 0;
          });
        }

        setLeaderboard(newData);
        setLoading(false);
      } catch (err) {
        setError('Operational Telemetry Interrupted');
        setLoading(false);
      }
    };

    loadLeaderboard();
    const interval = setInterval(loadLeaderboard, 5000);
    return () => clearInterval(interval);
  }, [filterRound]);

  if (loading) return (
    <div className="py-64 flex flex-col items-center justify-center">
      <FiZap className="text-yellow-500 animate-pulse mb-24" size={48} />
      <p className="text-brand-text-muted font-medium uppercase tracking-[0.3em] text-12">Streaming Experimental Rankings...</p>
    </div>
  );

  // Determine active fun rounds
  const activeRounds = [];
  for (let i = 1; i <= 10; i++) {
    if (leaderboard.some(t => t[`f${i}`] > 0)) {
      activeRounds.push(i);
    }
  }

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`w-full animate-in fade-in duration-700 ${isFullScreen ? 'h-full flex flex-col' : ''}`}>
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-24 py-16 rounded-xl mb-32 font-medium flex items-center space-x-12">
          <FiActivity size={20} />
          <span>{error}</span>
        </div>
      )}

      {!isFullScreen && (
        <div className="flex items-center gap-12 mb-16 px-4">
           <FiStar className="text-yellow-500" size={20} />
           <h3 className="text-18 font-bold text-white uppercase tracking-wider">
             {filterRound !== null ? `Fun Round ${filterRound} Ranking` : 'Global Experimental Ranking'}
           </h3>
        </div>
      )}

      <Card className={`p-0 overflow-hidden border border-yellow-500/20 bg-[#0B0F14] shadow-premium flex flex-col ${isFullScreen ? 'flex-1' : ''}`}>
        <div className="overflow-x-auto overflow-y-auto flex-1 hidden-scrollbar relative">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-[#0F172A] shadow-md border-b border-[#1F2937]">
              <tr>
                <th className="px-[24px] py-[20px]">
                  <div className="flex items-center space-x-4">
                    <FiAward className="text-yellow-500" size={14} />
                    <span className="text-brand-text-muted font-semibold uppercase tracking-widest text-10 whitespace-nowrap">Rank</span>
                  </div>
                </th>
                <th className="px-[24px] py-[20px]">
                  <div className="flex items-center space-x-4">
                    <FiUsers className="text-yellow-500" size={14} />
                    <span className="text-brand-text-muted font-semibold uppercase tracking-widest text-10 whitespace-nowrap">Unit Identity</span>
                  </div>
                </th>
                
                {filterRound === null ? (
                  <>
                    <th className="px-[24px] py-[20px]">
                      <div className="flex items-center space-x-4">
                        <FiTrendingUp className="text-emerald-500" size={14} />
                        <span className="text-brand-text-muted font-semibold uppercase tracking-widest text-10 whitespace-nowrap">Total Valuation</span>
                      </div>
                    </th>
                    <th className="px-[24px] py-[20px]">
                      <div className="flex items-center space-x-4">
                        <FiTarget className="text-[#7C3AED]" size={14} />
                        <span className="text-brand-text-muted font-semibold uppercase tracking-widest text-10 whitespace-nowrap">Efficiency</span>
                      </div>
                    </th>
                    <th className="px-[24px] py-[20px]">
                      <div className="flex items-center space-x-4">
                        <FiClock className="text-sky-500" size={14} />
                        <span className="text-brand-text-muted font-semibold uppercase tracking-widest text-10 whitespace-nowrap">Time</span>
                      </div>
                    </th>
                    {activeRounds.map(f => (
                      <th key={f} className="px-[24px] py-[20px] text-center bg-white/[0.02]">
                         <span className="text-brand-text-muted font-semibold uppercase tracking-widest text-10 whitespace-nowrap">Fun Round {f}</span>
                      </th>
                    ))}
                    <th className="px-[24px] py-[20px] text-right bg-yellow-500/5">
                      <div className="flex items-center justify-end space-x-4">
                        <FiStar className="text-yellow-500" size={14} />
                        <span className="text-brand-text-muted font-semibold uppercase tracking-widest text-10 whitespace-nowrap">Fun Score</span>
                      </div>
                    </th>
                  </>
                ) : (
                  <th className="px-[24px] py-[20px] text-right bg-yellow-500/5">
                    <div className="flex items-center justify-end space-x-4">
                      <FiStar className="text-yellow-500" size={14} />
                      <span className="text-brand-text-muted font-semibold uppercase tracking-widest text-10 whitespace-nowrap">Round Points</span>
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {leaderboard.map((team, idx) => (
                <tr key={team.teamId} className={`group transition-all hover:bg-white/[0.04] ${isFullScreen ? 'h-[90px]' : ''}`}>
                  <td className="px-[24px] py-[24px]">
                     <div className="flex items-center space-x-12">
                       <span className={`font-bold font-mono ${
                         isFullScreen ? 'text-32' : 'text-16'
                       } ${
                         idx === 0 ? 'text-yellow-500' : 
                         idx === 1 ? 'text-gray-400' : 
                         idx === 2 ? 'text-amber-600' : 
                         'text-brand-text-muted opacity-50'
                       }`}>
                          {(idx + 1).toString().padStart(2, '0')}
                       </span>
                     </div>
                  </td>
                  <td className="px-[24px] py-[24px] whitespace-nowrap">
                     <div className="flex flex-col">
                        <span className={`font-black text-brand-text-primary group-hover:text-yellow-500 transition-colors uppercase tracking-tight ${
                          isFullScreen ? 'text-28' : 'text-14'
                        }`}>{team.teamName}</span>
                        <span className="text-[10px] font-mono text-brand-text-muted opacity-50 uppercase">{team.teamId}</span>
                     </div>
                  </td>

                  {filterRound === null ? (
                    <>
                      <td className="px-[24px] py-[24px]">
                         <span className={`font-mono font-bold text-emerald-400 ${isFullScreen ? 'text-24' : 'text-14'}`}>
                            {formatCurrency(team.totalProfit || 0)}
                         </span>
                      </td>
                      <td className="px-[24px] py-[24px]">
                         <div className="flex items-center gap-8">
                            <div className="flex-1 h-4 bg-white/5 rounded-full overflow-hidden max-w-[80px]">
                                <div className="h-full bg-[#7C3AED]" style={{ width: `${team.avgEfficiency || 0}%` }} />
                            </div>
                            <span className={`font-mono font-bold text-[#A78BFA] ${isFullScreen ? 'text-20' : 'text-13'}`}>
                                {Math.round(team.avgEfficiency || 0)}%
                            </span>
                         </div>
                      </td>
                      <td className="px-[24px] py-[24px]">
                         <span className={`font-mono font-bold text-sky-400 ${isFullScreen ? 'text-20' : 'text-13'}`}>
                            {formatTime(team.totalTime || 0)}
                         </span>
                      </td>
                      {activeRounds.map(f => {
                        const points = team[`f${f}`];
                        return (
                          <td key={f} className="px-[24px] py-[24px] text-center bg-white/[0.01]">
                            <span className={`font-mono font-black ${isFullScreen ? 'text-22' : 'text-14'} ${points > 0 ? 'text-yellow-400' : 'text-white/10'}`}>
                                {points > 0 ? points : '--'}
                            </span>
                          </td>
                        );
                      })}
                      <td className="px-[24px] py-[24px] text-right bg-yellow-500/5">
                        <span className={`font-black font-mono tracking-tighter ${isFullScreen ? 'text-48' : 'text-20'} ${idx === 0 ? 'text-yellow-500 shadow-glow-sm' : 'text-white'}`}>
                          {team.funPoints || 0}
                        </span>
                      </td>
                    </>
                  ) : (
                    <td className="px-[24px] py-[24px] text-right bg-yellow-500/5">
                      <span className={`font-black font-mono tracking-tighter ${isFullScreen ? 'text-48' : 'text-20'} ${idx === 0 ? 'text-yellow-500 shadow-glow-sm' : 'text-white'}`}>
                        {team[`f${filterRound}`] || 0}
                      </span>
                    </td>
                  )}
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
