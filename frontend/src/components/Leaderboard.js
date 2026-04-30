import React, { useEffect, useState, useRef } from 'react';
import { leaderboardAPI } from '../utils/api';
import { FiTrendingUp, FiActivity, FiUsers, FiAward, FiZap, FiRefreshCw, FiChevronUp, FiChevronDown } from 'react-icons/fi';

const PODIUM = [
  { idx: 1, label: '2ND', bg: 'from-slate-400/15 to-slate-600/5', text: 'text-slate-300', border: 'border-slate-400/25', ring: 'ring-slate-400/40', height: 'h-[120px]', avatar: 'w-[56px] h-[56px] text-[18px]', score: 'text-[22px]', order: 'order-1', mt: 'mt-[32px]' },
  { idx: 0, label: '1ST', bg: 'from-yellow-400/20 to-amber-600/5', text: 'text-yellow-400', border: 'border-yellow-400/30', ring: 'ring-yellow-400/50', height: 'h-[160px]', avatar: 'w-[72px] h-[72px] text-[24px]', score: 'text-[28px]', order: 'order-2', mt: '', glow: 'shadow-[0_0_50px_rgba(250,204,21,0.1)]' },
  { idx: 2, label: '3RD', bg: 'from-amber-600/12 to-amber-800/5', text: 'text-amber-500', border: 'border-amber-600/25', ring: 'ring-amber-600/40', height: 'h-[100px]', avatar: 'w-[48px] h-[48px] text-[16px]', score: 'text-[20px]', order: 'order-3', mt: 'mt-[48px]' },
];

const getInitials = (name) => name.split(/[\s-]+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);

const Leaderboard = ({ isFullScreen = false, filterYear = null }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeRounds, setActiveRounds] = useState([]);
  const prevRanks = useRef({});
  const [rankChanges, setRankChanges] = useState({});

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const response = await leaderboardAPI.getAll();
        let newData = response.data.leaderboard;

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

        const changes = {};
        newData.forEach((team, idx) => {
          const prev = prevRanks.current[team.teamId];
          if (prev !== undefined) {
            if (idx < prev) changes[team.teamId] = 'up';
            else if (idx > prev) changes[team.teamId] = 'down';
          }
          prevRanks.current[team.teamId] = idx;
        });
        setRankChanges(changes);
        setTimeout(() => setRankChanges({}), 3000);

        const rounds = [];
        for (let i = 0; i <= 4; i++) {
          if (newData.some(t => (t[`year${i}Points`] || 0) > 0)) rounds.push(i);
        }
        setActiveRounds(rounds);

        setLeaderboard(newData);
        setLastUpdated(new Date());
        setError('');
        setLoading(false);
      } catch (err) {
        setError('Failed to load rankings');
        setLoading(false);
      }
    };

    loadLeaderboard();
    const interval = setInterval(loadLeaderboard, 5000);
    return () => clearInterval(interval);
  }, [filterYear]);

  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(c => c + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const getTimeSince = () => {
    if (!lastUpdated) return '';
    const seconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.floor(seconds / 60)}m ago`;
  };

  const formatTime = (seconds) => {
    if (seconds === undefined) return '--';
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  if (loading) return (
    <div className="py-[64px] flex flex-col items-center justify-center">
      <FiZap className="text-[#7C3AED] animate-pulse mb-[20px]" size={48} />
      <p className="text-[#6B7280] font-semibold uppercase tracking-[0.3em] text-[12px]">Loading Rankings...</p>
    </div>
  );

  const top3 = leaderboard.slice(0, 3);
  const fs = isFullScreen;

  return (
    <div className="w-full animate-in fade-in duration-500">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-[20px] py-[14px] rounded-[12px] mb-[24px] flex items-center gap-[10px] text-[13px] font-medium">
          <FiActivity size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Header bar */}
      <div className="flex items-center justify-between mb-[20px] px-[4px]">
        <div className="flex items-center gap-[12px]">
          <FiAward className="text-[#7C3AED]" size={fs ? 24 : 18} />
          <h3 className={`font-bold text-white tracking-tight ${fs ? 'text-[28px]' : 'text-[16px]'}`}>
            {filterYear !== null ? `Round ${filterYear + 1} Rankings` : 'Global Rankings'}
          </h3>
          <div className="flex items-center gap-[6px] ml-[8px] px-[10px] py-[4px] bg-[#111827] rounded-[8px] border border-[#1F2937]">
            <div className="w-[6px] h-[6px] bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-semibold text-[#6B7280]">{leaderboard.length} teams</span>
          </div>
        </div>
        {lastUpdated && (
          <div className="flex items-center gap-[6px] text-[10px] text-[#6B7280]">
            <FiRefreshCw size={10} className="animate-spin" style={{ animationDuration: '3s' }} />
            <span>{getTimeSince()}</span>
          </div>
        )}
      </div>

      {/* Podium — Top 3 */}
      {top3.length >= 2 && filterYear === null && (
        <div className={`flex items-end justify-center gap-[16px] mb-[28px] ${fs ? 'px-[60px]' : 'px-[20px]'}`}>
          {PODIUM.map(({ idx, label, bg, text, border, ring, height, avatar, score, order, mt, glow }) => {
            const team = top3[idx];
            if (!team) return null;
            const fsHeight = fs ? 'h-[200px]' : height;
            const fsAvatar = fs ? 'w-[90px] h-[90px] text-[30px]' : avatar;
            const fsScore = fs ? 'text-[36px]' : score;
            return (
              <div key={idx} className={`flex-1 max-w-[280px] ${order} ${mt}`}>
                <div className="flex flex-col items-center mb-[12px]">
                  <div className={`${fsAvatar} rounded-full bg-gradient-to-br ${bg} ${ring} ring-2 flex items-center justify-center font-bold ${text}`}>
                    {getInitials(team.teamName)}
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-[0.2em] ${text} mt-[6px]`}>{label}</span>
                </div>
                <div className={`bg-[#0B0F14] ${border} border rounded-t-[14px] p-[20px] text-center ${glow || ''} relative overflow-hidden ${fsHeight} flex flex-col justify-center`}>
                  <div className={`absolute inset-0 bg-gradient-to-b ${bg} pointer-events-none`} />
                  <div className="relative z-10">
                    <h4 className={`${fs ? 'text-[20px]' : 'text-[15px]'} font-bold text-white truncate mb-[6px] px-[4px]`}>{team.teamName}</h4>
                    <div className={`${fsScore} font-bold font-mono ${text} tracking-tight`}>
                      {team.scoreSum || 0}
                      <span className="text-[11px] font-medium ml-[3px] opacity-50">pts</span>
                    </div>
                    <div className="mt-[8px] flex items-center justify-center gap-[5px]">
                      <div className={`${fs ? 'w-[50px]' : 'w-[40px]'} h-[3px] bg-white/10 rounded-full overflow-hidden`}>
                        <div className="h-full bg-emerald-500/60 rounded-full" style={{ width: `${team.avgEfficiency || 0}%` }} />
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400/70">{team.avgEfficiency || 0}%</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats Row */}
      {leaderboard.length > 0 && !fs && (
        <div className="grid grid-cols-4 gap-[10px] mb-[20px]">
          {[
            { label: 'Teams', value: leaderboard.length, icon: FiUsers, color: 'text-[#7C3AED]' },
            { label: 'Rounds', value: activeRounds.length, icon: FiActivity, color: 'text-emerald-400' },
            { label: 'Top Score', value: leaderboard[0]?.scoreSum || 0, icon: FiTrendingUp, color: 'text-yellow-400' },
            { label: 'Avg Score', value: leaderboard.length ? Math.round(leaderboard.reduce((s, t) => s + (t.scoreSum || 0), 0) / leaderboard.length) : 0, icon: FiAward, color: 'text-sky-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-[#0B0F14] border border-[#1F2937] rounded-[10px] p-[12px] flex items-center gap-[10px]">
              <div className={`w-[30px] h-[30px] rounded-[8px] bg-white/[0.04] flex items-center justify-center ${color}`}>
                <Icon size={14} />
              </div>
              <div>
                <div className="text-[15px] font-bold font-mono text-white leading-none">{value}</div>
                <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#6B7280]">{label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {leaderboard.length > 0 && (
        <div className="bg-[#0B0F14] border border-[#1F2937] rounded-[14px] overflow-hidden shadow-xl">
          <div className="overflow-x-auto overflow-y-auto hidden-scrollbar">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#111827] border-b border-[#1F2937]">
                  <th className="px-[18px] py-[14px] text-left w-[60px]">
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#6B7280]">#</span>
                  </th>
                  <th className="px-[18px] py-[14px] text-left">
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#6B7280]">Team</span>
                  </th>

                  {filterYear === null ? (
                    <>
                      <th className="px-[14px] py-[14px] text-center">
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#6B7280]">Efficiency</span>
                      </th>
                      <th className="px-[14px] py-[14px] text-center">
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#6B7280]">Time</span>
                      </th>
                      {activeRounds.map(r => (
                        <th key={r} className="px-[12px] py-[14px] text-center">
                          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#6B7280]">R{r + 1}</span>
                        </th>
                      ))}
                      <th className="px-[18px] py-[14px] text-right">
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#6B7280]">Total</span>
                      </th>
                    </>
                  ) : (
                    <>
                      <th className="px-[14px] py-[14px] text-center">
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#6B7280]">Score</span>
                      </th>
                      <th className="px-[14px] py-[14px] text-center">
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#6B7280]">Efficiency</span>
                      </th>
                      <th className="px-[14px] py-[14px] text-center">
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#6B7280]">Time</span>
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((team, idx) => {
                  const change = rankChanges[team.teamId];
                  return (
                    <tr
                      key={team.teamId}
                      className={`border-b border-[#1F2937]/40 transition-all group hover:bg-white/[0.02] ${
                        fs ? 'h-[80px]' : ''
                      } ${idx < 3 ? 'bg-[#7C3AED]/[0.02]' : ''} ${change === 'up' ? 'animate-pulse' : ''}`}
                    >
                      <td className="px-[18px] py-[14px]">
                        <div className="flex items-center gap-[6px]">
                          <span className={`font-bold font-mono ${fs ? 'text-[22px]' : 'text-[14px]'} ${
                            idx === 0 ? 'text-yellow-400' :
                            idx === 1 ? 'text-slate-300' :
                            idx === 2 ? 'text-amber-500' :
                            'text-[#4B5563]'
                          }`}>
                            {idx + 1}
                          </span>
                          {change === 'up' && <FiChevronUp size={12} className="text-emerald-400" />}
                          {change === 'down' && <FiChevronDown size={12} className="text-red-400" />}
                        </div>
                      </td>

                      <td className="px-[18px] py-[14px]">
                        <div className="flex items-center gap-[10px]">
                          <div className={`w-[28px] h-[28px] rounded-[7px] flex items-center justify-center text-[10px] font-bold shrink-0 ${
                            idx === 0 ? 'bg-yellow-400/15 text-yellow-400' :
                            idx === 1 ? 'bg-slate-400/15 text-slate-300' :
                            idx === 2 ? 'bg-amber-500/15 text-amber-500' :
                            'bg-[#1F2937] text-[#6B7280]'
                          }`}>
                            {getInitials(team.teamName)}
                          </div>
                          <span className={`font-semibold group-hover:text-[#7C3AED] transition-colors ${
                            fs ? 'text-[18px]' : 'text-[13px]'
                          } ${idx < 3 ? 'text-white' : 'text-[#D1D5DB]'}`}>
                            {team.teamName}
                          </span>
                        </div>
                      </td>

                      {filterYear === null ? (
                        <>
                          <td className="px-[14px] py-[14px] text-center">
                            <div className="flex items-center justify-center gap-[5px]">
                              <div className="w-[36px] h-[3px] bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500/60 rounded-full" style={{ width: `${team.avgEfficiency || 0}%` }} />
                              </div>
                              <span className={`font-mono font-semibold text-emerald-400/80 ${fs ? 'text-[16px]' : 'text-[12px]'}`}>
                                {team.avgEfficiency !== undefined ? `${team.avgEfficiency}%` : '--'}
                              </span>
                            </div>
                          </td>
                          <td className="px-[14px] py-[14px] text-center">
                            <span className={`font-mono text-[#9CA3AF] ${fs ? 'text-[14px]' : 'text-[11px]'}`}>
                              {formatTime(team.totalTimeSpent)}
                            </span>
                          </td>
                          {activeRounds.map(r => {
                            const pts = team[`year${r}Points`] || 0;
                            const eff = team[`year${r}Efficiency`] || 0;
                            return (
                              <td key={r} className="px-[12px] py-[14px] text-center group/cell">
                                <div className="flex flex-col items-center">
                                  <span className={`font-mono font-bold ${fs ? 'text-[16px]' : 'text-[13px]'} ${pts > 0 ? 'text-[#D1D5DB]' : 'text-[#374151]'}`}>
                                    {pts > 0 ? pts : '--'}
                                  </span>
                                  {pts > 0 && (
                                    <span className="text-[8px] font-mono text-emerald-500/60 opacity-0 group-hover/cell:opacity-100 transition-opacity">
                                      {eff}%
                                    </span>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                          <td className="px-[18px] py-[14px] text-right">
                            <span className={`font-bold font-mono tracking-tight ${fs ? 'text-[32px]' : 'text-[18px]'} ${
                              idx === 0 ? 'text-yellow-400' : idx < 3 ? 'text-white' : 'text-[#D1D5DB]'
                            }`}>
                              {team.scoreSum || 0}
                            </span>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-[14px] py-[14px] text-center">
                            <span className={`font-mono font-bold text-white ${fs ? 'text-[22px]' : 'text-[16px]'}`}>
                              {team[`year${filterYear}Points`] || 0}
                            </span>
                          </td>
                          <td className="px-[14px] py-[14px] text-center">
                            <span className={`font-mono font-bold text-emerald-400 ${fs ? 'text-[18px]' : 'text-[14px]'}`}>
                              {team[`year${filterYear}Efficiency`] || 0}%
                            </span>
                          </td>
                          <td className="px-[14px] py-[14px] text-center">
                            <span className={`font-mono text-[#9CA3AF] ${fs ? 'text-[16px]' : 'text-[13px]'}`}>
                              {team[`year${filterYear}Time`] ? `${team[`year${filterYear}Time`]}s` : '--'}
                            </span>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {leaderboard.length === 0 && (
        <div className="flex flex-col items-center justify-center py-[64px] rounded-[16px] border border-[#1F2937]/40 bg-[#0B0F14]/50 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-t from-[#7C3AED]/5 to-transparent pointer-events-none" />
          <div className="bg-[#111827] p-[24px] rounded-full border border-[#1F2937] mb-[20px]">
            <FiUsers size={40} className="text-[#7C3AED]/40" />
          </div>
          <p className="text-[15px] font-bold text-[#9CA3AF] mb-[6px]">No Teams Yet</p>
          <p className="text-[12px] text-[#6B7280]">Rankings will appear once teams start competing.</p>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
