import React, { useEffect, useState, useRef } from 'react';
import { leaderboardAPI } from '../utils/api';
import { FiTrendingUp, FiActivity, FiUsers, FiAward, FiZap, FiRefreshCw, FiClock, FiTarget } from 'react-icons/fi';
import Card from './Card';

const Leaderboard = ({ isFullScreen = false, filterYear = null }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeTeams, setActiveTeams] = useState(0);
  const prevLeaderboardRef = useRef([]);

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const response = await leaderboardAPI.getAll();
        let newData = response.data.leaderboard;

        // If filtering by year, sort specifically for that year
        if (filterYear !== null) {
          newData = [...newData].sort((a, b) => {
            const pA = a[`year${filterYear}Points`] || 0;
            const pB = b[`year${filterYear}Points`] || 0;
            if (pB !== pA) return pB - pA;
            
            const eA = a[`year${filterYear}Efficiency`] || 0;
            const eB = b[`year${filterYear}Efficiency`] || 0;
            if (eB !== eA) return eB - eA;
            
            const tA = a[`year${filterYear}Time`] || 9999;
            const tB = b[`year${filterYear}Time`] || 9999;
            return tA - tB;
          });
        }

        const active = newData.filter(t => {
          const prev = prevLeaderboardRef.current.find(p => p.teamId === t.teamId);
          return prev && (t.scoreSum !== prev.scoreSum);
        }).length;
        setActiveTeams(active);
        prevLeaderboardRef.current = newData;

        setLeaderboard(newData);
        setLastUpdated(new Date());
        setLoading(false);
      } catch (err) {
        setError('Operational Telemetry Interrupted');
        setLoading(false);
      }
    };

    loadLeaderboard();
    const interval = setInterval(loadLeaderboard, 5000);
    return () => clearInterval(interval);
  }, [filterYear]);

  const getTimeSince = () => {
    if (!lastUpdated) return '';
    const seconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.floor(seconds / 60)}m ago`;
  };

  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(c => c + 1), 1000);
    return () => clearInterval(t);
  }, []);

  if (loading) return (
    <div className="py-64 flex flex-col items-center justify-center">
      <FiZap className="text-brand-primary animate-pulse mb-24" size={48} />
      <p className="text-brand-text-muted font-medium uppercase tracking-[0.3em] text-12">Streaming Live Rankings...</p>
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

      {/* Status bar */}
      {!isFullScreen && (
        <div className="flex items-center justify-between mb-16 px-4">
          <div className="flex items-center gap-16">
            <div className="flex items-center gap-12">
               <FiAward className="text-brand-primary" size={20} />
               <h3 className="text-18 font-bold text-white uppercase tracking-wider">
                 {filterYear !== null ? `Round ${filterYear + 1} Ranking` : 'Global Competition Ranking'}
               </h3>
            </div>
            {activeTeams > 0 && (
              <div className="flex items-center gap-8 text-12 text-emerald-400 font-bold ml-16">
                <div className="w-[8px] h-[8px] bg-emerald-500 rounded-full animate-pulse" />
                <span>{activeTeams} team{activeTeams !== 1 ? 's' : ''} scoring</span>
              </div>
            )}
          </div>
          {lastUpdated && (
            <div className="flex items-center gap-8 text-11 text-brand-text-muted font-medium">
              <FiRefreshCw size={12} className="animate-spin" style={{ animationDuration: '3s' }} />
              <span>Updated {getTimeSince()}</span>
            </div>
          )}
        </div>
      )}

      {/* Desktop table */}
      <Card className="p-0 overflow-hidden border border-brand-border bg-brand-surface shadow-premium hidden md:flex flex-col">
        <div className="overflow-x-auto overflow-y-auto flex-1 hidden-scrollbar relative">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-brand-elevated shadow-md">
              <tr className="border-b border-brand-border">
                <th className="px-24 py-[20px] border-b border-brand-border">
                  <div className="flex items-center space-x-4">
                    <FiAward className="text-brand-primary" size={14} />
                    <span className="text-brand-text-muted font-semibold uppercase tracking-widest text-10 whitespace-nowrap">Rank</span>
                  </div>
                </th>
                <th className="px-24 py-[20px] border-b border-brand-border">
                  <div className="flex items-center space-x-4">
                    <FiUsers className="text-brand-primary" size={14} />
                    <span className="text-brand-text-muted font-semibold uppercase tracking-widest text-10 whitespace-nowrap">Unit Identity</span>
                  </div>
                </th>
                
                {filterYear === null ? (
                  <>
                    <th className="px-24 py-[20px] border-b border-brand-border text-center">
                      <span className="text-brand-text-muted font-semibold uppercase tracking-widest text-10 whitespace-nowrap">Efficiency</span>
                    </th>
                    <th className="px-24 py-[20px] border-b border-brand-border text-center">
                      <span className="text-brand-text-muted font-semibold uppercase tracking-widest text-10 whitespace-nowrap">Op Time</span>
                    </th>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(y => (
                      <th key={y} className="px-24 py-[20px] border-b border-brand-border text-center min-w-[100px]">
                         <span className="text-brand-text-muted font-semibold uppercase tracking-widest text-10 whitespace-nowrap">Round {y}</span>
                      </th>
                    ))}
                    <th className="px-24 py-[20px] border-b border-brand-border text-right">
                      <div className="flex items-center justify-end space-x-4">
                        <FiTrendingUp className="text-brand-primary" size={14} />
                        <span className="text-brand-text-muted font-semibold uppercase tracking-widest text-10 whitespace-nowrap">Total</span>
                      </div>
                    </th>
                  </>
                ) : (
                  <>
                    <th className="px-24 py-[20px] border-b border-brand-border text-center">
                      <span className="text-brand-text-muted font-semibold uppercase tracking-widest text-10 whitespace-nowrap">Round Score</span>
                    </th>
                    <th className="px-24 py-[20px] border-b border-brand-border text-center">
                      <span className="text-brand-text-muted font-semibold uppercase tracking-widest text-10 whitespace-nowrap">Efficiency</span>
                    </th>
                    <th className="px-24 py-[20px] border-b border-brand-border text-center">
                      <span className="text-brand-text-muted font-semibold uppercase tracking-widest text-10 whitespace-nowrap">Time Spent</span>
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {leaderboard.map((team, idx) => (
                <tr key={team.teamId} className={`group transition-all hover:bg-white/[0.02] ${isFullScreen ? 'h-[100px]' : ''}`}>
                  <td className="px-24 py-24">
                     <span className={`font-bold font-mono ${
                       isFullScreen ? 'text-28' : 'text-16'
                     } ${
                       idx === 0 ? 'text-yellow-500' :
                       idx === 1 ? 'text-gray-400' :
                       idx === 2 ? 'text-amber-600' :
                       'text-brand-text-muted opacity-50'
                     }`}>
                        {idx + 1}
                     </span>
                  </td>
                  <td className="px-24 py-24 whitespace-nowrap">
                     <span className={`font-bold text-brand-text-primary group-hover:text-brand-primary transition-colors ${
                       isFullScreen ? 'text-22' : 'text-14'
                     }`}>{team.teamName}</span>
                  </td>

                  {filterYear === null ? (
                    <>
                      <td className="px-24 py-24 text-center">
                        <div className="flex flex-col items-center">
                            <span className={`font-mono font-bold text-emerald-400 ${isFullScreen ? 'text-24' : 'text-14'}`}>
                            {team.avgEfficiency !== undefined ? `${team.avgEfficiency}%` : '-'}
                            </span>
                            {isFullScreen && <span className="text-[10px] text-brand-text-muted uppercase font-bold tracking-tighter">Avg Eff</span>}
                        </div>
                      </td>
                      <td className="px-24 py-24 text-center">
                        <div className="flex flex-col items-center">
                            <span className={`font-mono text-brand-text-secondary whitespace-nowrap ${isFullScreen ? 'text-18' : 'text-12'}`}>
                            {team.totalTimeSpent !== undefined ? `${Math.floor(team.totalTimeSpent/60)}m ${team.totalTimeSpent%60}s` : '-'}
                            </span>
                            {isFullScreen && <span className="text-[10px] text-brand-text-muted uppercase font-bold tracking-tighter">Total Time</span>}
                        </div>
                      </td>
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(y => {
                        const points = team[`year${y}Points`];
                        const time = team[`year${y}Time`];
                        const eff = team[`year${y}Efficiency`];
                        
                        return (
                          <td key={y} className="px-16 py-12 text-center group/cell">
                            <div className="flex flex-col gap-2">
                                <span className={`font-mono font-bold ${isFullScreen ? 'text-20' : 'text-14'} ${points > 0 ? 'text-brand-text-primary' : 'text-brand-text-muted opacity-40'}`}>
                                    {points || 0}
                                </span>
                                {(points > 0 || isFullScreen) && (
                                    <div className={`flex flex-col gap-1 transition-opacity ${isFullScreen ? 'opacity-100' : 'opacity-0 group-hover/cell:opacity-100'}`}>
                                        <div className="flex items-center justify-center gap-4 text-[9px] text-emerald-500/80 font-bold">
                                            <FiTarget size={8} /> {eff}%
                                        </div>
                                        <div className="flex items-center justify-center gap-4 text-[9px] text-brand-text-muted font-mono">
                                            <FiClock size={8} /> {time ? `${time}s` : '-'}
                                        </div>
                                    </div>
                                )}
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-24 py-24 text-right">
                        <span className={`font-bold font-mono tracking-tight ${isFullScreen ? 'text-42' : 'text-20'} ${idx === 0 ? 'text-brand-primary' : 'text-brand-text-primary'}`}>
                          {team.scoreSum || 0}
                        </span>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-24 py-24 text-center">
                        <span className={`font-mono font-bold text-brand-text-primary ${isFullScreen ? 'text-28' : 'text-18'}`}>
                          {team[`year${filterYear}Points`] || 0}
                        </span>
                      </td>
                      <td className="px-24 py-24 text-center">
                        <span className={`font-mono font-bold text-emerald-400 ${isFullScreen ? 'text-24' : 'text-16'}`}>
                          {team[`year${filterYear}Efficiency`] || 0}%
                        </span>
                      </td>
                      <td className="px-24 py-24 text-center">
                        <span className={`font-mono text-brand-text-secondary ${isFullScreen ? 'text-20' : 'text-14'}`}>
                          {team[`year${filterYear}Time`] ? `${team[`year${filterYear}Time`]}s` : '--'}
                        </span>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Mobile card layout */}
      <div className="md:hidden space-y-12">
        {leaderboard.map((team, idx) => (
          <Card key={team.teamId} className={`p-16 ${idx < 3 ? 'border-brand-primary/20' : 'border-brand-border'}`}>
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-12">
                <div className={`w-32 h-32 rounded-lg flex items-center justify-center font-bold text-14 font-mono ${
                  idx === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                  idx === 1 ? 'bg-gray-400/20 text-gray-400' :
                  idx === 2 ? 'bg-amber-600/20 text-amber-600' :
                  'bg-brand-elevated text-brand-text-muted'
                }`}>
                  {idx + 1}
                </div>
                <span className="text-16 font-bold text-brand-text-primary">{team.teamName}</span>
              </div>
              <span className={`text-20 font-bold font-mono ${idx === 0 ? 'text-brand-primary' : 'text-brand-text-primary'}`}>
                {filterYear !== null ? (team[`year${filterYear}Points`] || 0) : (team.scoreSum || 0)}
              </span>
            </div>

            {filterYear === null ? (
              <div className="grid grid-cols-5 gap-4">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(y => {
                  const points = team[`year${y}Points`];
                  return (
                    <div key={y} className="text-center py-4 bg-brand-elevated/50 rounded-lg">
                      <div className="text-[9px] text-brand-text-muted font-bold uppercase">R{y + 1}</div>
                      <div className={`text-12 font-mono font-bold ${points ? 'text-brand-text-secondary' : 'text-brand-text-muted/40'}`}>
                        {points || 0}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-between mt-8 text-12">
                <span className="text-brand-text-muted uppercase font-bold text-[10px]">Eff: <span className="text-emerald-400">{team[`year${filterYear}Efficiency`] || 0}%</span></span>
                <span className="text-brand-text-muted uppercase font-bold text-[10px]">Time: <span className="text-brand-text-secondary">{team[`year${filterYear}Time`] || 0}s</span></span>
              </div>
            )}

            <div className="flex items-center justify-between mt-12 pt-12 border-t border-brand-border/30 text-11 text-brand-text-muted">
              <span>Overall Eff: <span className="text-emerald-400 font-bold">{team.avgEfficiency !== undefined ? `${team.avgEfficiency}%` : '-'}</span></span>
              <span>Total Time: <span className="font-mono">{team.totalTimeSpent !== undefined ? `${Math.floor(team.totalTimeSpent/60)}m ${team.totalTimeSpent%60}s` : '-'}</span></span>
            </div>
          </Card>
        ))}
      </div>

      {leaderboard.length === 0 && (
        <div className="flex flex-col items-center justify-center py-64 rounded-2xl border border-brand-border/40 bg-brand-surface/20 shadow-inner overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-t from-brand-primary/5 to-transparent pointer-events-none" />
          <div className="bg-brand-elevated p-24 rounded-full border border-brand-border/40 mb-24 shadow-[0_0_40px_rgba(124,58,237,0.1)]">
            <FiActivity size={48} className="text-brand-primary animate-pulse" />
          </div>
          <p className="text-16 font-bold uppercase tracking-[0.2em] text-brand-text-primary mb-8">Awaiting Unit Registration</p>
          <p className="text-12 font-medium text-brand-text-muted">Global leaderboards will automatically populate upon first team initialization.</p>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
