import React, { useEffect, useState, useRef } from 'react';
import { leaderboardAPI } from '../utils/api';
import { FiTrendingUp, FiUsers, FiAward, FiZap, FiStar } from 'react-icons/fi';

const PODIUM = [
  { idx: 1, label: '2ND', emoji: '🥈', bg: 'from-slate-400/15 to-slate-600/5', text: 'text-slate-300', border: 'border-slate-400/25', ring: 'ring-slate-400/40', height: 'h-[120px]', avatar: 'w-[56px] h-[56px] text-[18px]', score: 'text-[22px]', order: 'order-1', mt: 'mt-[32px]' },
  { idx: 0, label: '1ST', emoji: '🥇', bg: 'from-yellow-400/20 to-amber-500/10', text: 'text-yellow-400', border: 'border-yellow-400/30', ring: 'ring-yellow-400/50', height: 'h-[160px]', avatar: 'w-[72px] h-[72px] text-[24px]', score: 'text-[28px]', order: 'order-2', mt: '', glow: 'shadow-[0_0_60px_rgba(250,204,21,0.12)]' },
  { idx: 2, label: '3RD', emoji: '🥉', bg: 'from-amber-600/12 to-amber-800/5', text: 'text-amber-500', border: 'border-amber-600/25', ring: 'ring-amber-600/40', height: 'h-[100px]', avatar: 'w-[48px] h-[48px] text-[16px]', score: 'text-[20px]', order: 'order-3', mt: 'mt-[48px]' },
];

const getInitials = (name) => name.split(/[\s-]+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);

const FunLeaderboard = ({ isFullScreen = false, filterRound = null }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const prevDataRef = useRef({});

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const response = await leaderboardAPI.getFun();
        let newData = response.data.leaderboard;

        if (filterRound !== null) {
          newData = [...newData].sort((a, b) => {
            const pA = a[`f${filterRound}`] || 0;
            const pB = b[`f${filterRound}`] || 0;
            return pB - pA;
          });
        }

        const changes = {};
        newData.forEach(t => {
          const prev = prevDataRef.current[t.teamId];
          if (prev && t.funPoints > prev) {
            changes[t.teamId] = true;
          }
          prevDataRef.current[t.teamId] = t.funPoints;
        });

        setLeaderboard(newData.map(t => ({ ...t, _justScored: !!changes[t.teamId] })));
        if (Object.keys(changes).length > 0) {
          setTimeout(() => {
            setLeaderboard(prev => prev.map(t => ({ ...t, _justScored: false })));
          }, 1500);
        }
        setLoading(false);
      } catch (err) {
        setError('Failed to load leaderboard');
        setLoading(false);
      }
    };

    loadLeaderboard();
    const interval = setInterval(loadLeaderboard, 15000);
    return () => clearInterval(interval);
  }, [filterRound]);

  const activeRounds = [];
  for (let i = 1; i <= 6; i++) {
    if (leaderboard.some(t => t[`f${i}`] > 0)) {
      activeRounds.push(i);
    }
  }

  if (loading) return (
    <div className="py-[80px] flex flex-col items-center justify-center">
      <FiZap className="text-yellow-500 animate-pulse mb-[20px]" size={44} />
      <p className="text-[#6B7280] font-bold uppercase tracking-[0.3em] text-[11px]">Loading Rankings...</p>
    </div>
  );

  if (leaderboard.length === 0) return (
    <div className="flex flex-col items-center justify-center py-[80px] rounded-[16px] border border-[#1F2937] bg-[#0B0F14]">
      <div className="w-[64px] h-[64px] rounded-[16px] bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mb-[20px]">
        <FiStar size={32} className="text-yellow-500 animate-pulse" />
      </div>
      <p className="text-[16px] font-bold text-[#F9FAFB] mb-[6px]">No Scores Yet</p>
      <p className="text-[12px] text-[#6B7280]">Scores will appear as participants submit answers</p>
    </div>
  );

  const medalColors = ['#facc15', '#94a3b8', '#d97706'];

  return (
    <div className={`w-full ${isFullScreen ? 'h-full flex flex-col' : ''}`}>
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-[20px] py-[12px] rounded-[12px] mb-[20px] text-[13px] font-medium">
          {error}
        </div>
      )}

      {!isFullScreen && (
        <div className="flex items-center justify-between mb-[16px]">
          <div className="flex items-center gap-[10px]">
            <FiStar className="text-yellow-500" size={18} />
            <h3 className={`font-bold text-white uppercase tracking-wider ${isFullScreen ? 'text-[24px]' : 'text-[16px]'}`}>
              {filterRound !== null ? `Fun Round ${filterRound}` : 'Fun Leaderboard'}
            </h3>
          </div>
          <div className="flex items-center gap-[8px] px-[12px] py-[5px] rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-[6px] h-[6px] bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Live</span>
          </div>
        </div>
      )}

      {isFullScreen && (
        <div className="flex items-center justify-between mb-[32px]">
          <div className="flex items-center gap-[16px]">
            <FiStar className="text-yellow-500" size={32} />
            <h2 className="text-[36px] font-black text-white uppercase tracking-tight">
              {filterRound !== null ? `Fun Round ${filterRound}` : 'Fun Leaderboard'}
            </h2>
          </div>
          <div className="flex items-center gap-[10px] px-[16px] py-[8px] rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-[8px] h-[8px] bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[13px] font-bold text-emerald-400 uppercase tracking-wider">Live</span>
          </div>
        </div>
      )}

      {/* Podium — Top 3 */}
      {leaderboard.length >= 2 && (
        <div className={`flex items-end justify-center gap-[16px] mb-[28px] ${isFullScreen ? 'px-[60px]' : 'px-[20px]'}`}>
          {PODIUM.map(({ idx, label, emoji, bg, text, border, ring, height, avatar, score, order, mt, glow }) => {
            const team = leaderboard[idx];
            if (!team) return null;
            const fsH = isFullScreen ? 'h-[200px]' : height;
            const fsA = isFullScreen ? 'w-[90px] h-[90px] text-[30px]' : avatar;
            const fsS = isFullScreen ? 'text-[36px]' : score;
            return (
              <div key={idx} className={`flex-1 max-w-[280px] ${order} ${mt}`}>
                <div className="flex flex-col items-center mb-[12px]">
                  <div className={`${fsA} rounded-full bg-gradient-to-br ${bg} ${ring} ring-2 flex items-center justify-center font-bold ${text}`}>
                    {getInitials(team.teamName)}
                  </div>
                  <div className="flex items-center gap-[4px] mt-[6px]">
                    <span className={`${isFullScreen ? 'text-[20px]' : 'text-[14px]'}`}>{emoji}</span>
                    <span className={`text-[9px] font-bold uppercase tracking-[0.2em] ${text}`}>{label}</span>
                  </div>
                </div>
                <div className={`bg-[#0B0F14] ${border} border rounded-t-[14px] p-[20px] text-center ${glow || ''} relative overflow-hidden ${fsH} flex flex-col justify-center`}>
                  <div className={`absolute inset-0 bg-gradient-to-b ${bg} pointer-events-none`} />
                  <div className="relative z-10">
                    <h4 className={`${isFullScreen ? 'text-[20px]' : 'text-[15px]'} font-bold text-white truncate mb-[6px] px-[4px]`}>{team.teamName}</h4>
                    <div className={`${fsS} font-black font-mono ${text} tracking-tight`}>
                      {team.funPoints || 0}
                      <span className="text-[11px] font-medium ml-[3px] opacity-50">pts</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className={`rounded-[16px] overflow-hidden border border-[#1F2937] bg-[#0B0F14] flex flex-col ${isFullScreen ? 'flex-1' : ''}`}>
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-[#0F172A] border-b border-[#1F2937]">
              <tr>
                <th className="px-[20px] py-[16px] w-[70px]">
                  <div className="flex items-center gap-[6px]">
                    <FiAward className="text-yellow-500" size={12} />
                    <span className="text-[#6B7280] font-bold uppercase tracking-widest text-[10px]">Rank</span>
                  </div>
                </th>
                <th className="px-[20px] py-[16px]">
                  <div className="flex items-center gap-[6px]">
                    <FiUsers className="text-yellow-500" size={12} />
                    <span className="text-[#6B7280] font-bold uppercase tracking-widest text-[10px]">Team</span>
                  </div>
                </th>
                {activeRounds.map(f => (
                  <th key={f} className="px-[16px] py-[16px] text-center">
                    <span className="text-[#6B7280] font-bold uppercase tracking-widest text-[10px]">R{f}</span>
                  </th>
                ))}
                <th className="px-[20px] py-[16px] text-right">
                  <div className="flex items-center justify-end gap-[6px]">
                    <FiTrendingUp className="text-yellow-500" size={12} />
                    <span className="text-[#6B7280] font-bold uppercase tracking-widest text-[10px]">Total</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((team, idx) => {
                const isTop3 = idx < 3;
                const justScored = team._justScored;

                return (
                  <tr
                    key={team.teamId}
                    className={`border-b border-[#1F2937]/50 transition-all duration-500 ${
                      justScored ? 'bg-yellow-500/10' : isTop3 ? 'bg-white/[0.02]' : ''
                    } hover:bg-white/[0.03]`}
                  >
                    <td className="px-[20px] py-[16px]">
                      {isTop3 ? (
                        <div
                          className={`w-[32px] h-[32px] rounded-[10px] flex items-center justify-center font-black ${
                            isFullScreen ? 'text-[18px]' : 'text-[14px]'
                          }`}
                          style={{
                            background: `${medalColors[idx]}15`,
                            color: medalColors[idx],
                            border: `1px solid ${medalColors[idx]}30`
                          }}
                        >
                          {idx + 1}
                        </div>
                      ) : (
                        <span className={`font-mono font-bold text-[#4B5563] ${isFullScreen ? 'text-[18px]' : 'text-[14px]'}`}>
                          {(idx + 1).toString().padStart(2, '0')}
                        </span>
                      )}
                    </td>
                    <td className="px-[20px] py-[16px]">
                      <span className={`font-bold text-[#F9FAFB] uppercase tracking-tight ${
                        isFullScreen ? 'text-[22px]' : 'text-[14px]'
                      } ${isTop3 ? 'text-white' : 'text-[#D1D5DB]'}`}>
                        {team.teamName}
                      </span>
                    </td>
                    {activeRounds.map(f => {
                      const points = team[`f${f}`] || 0;
                      return (
                        <td key={f} className="px-[16px] py-[16px] text-center">
                          <span className={`font-mono font-bold ${
                            isFullScreen ? 'text-[18px]' : 'text-[13px]'
                          } ${points > 0 ? 'text-yellow-400' : 'text-[#374151]'}`}>
                            {points > 0 ? points : '--'}
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-[20px] py-[16px] text-right">
                      <span className={`font-black font-mono tracking-tight ${
                        isFullScreen ? 'text-[36px]' : 'text-[18px]'
                      } ${
                        idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-[#94a3b8]' : idx === 2 ? 'text-[#d97706]' : 'text-white'
                      } ${justScored ? 'animate-pulse' : ''}`}>
                        {team.funPoints || 0}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FunLeaderboard;
