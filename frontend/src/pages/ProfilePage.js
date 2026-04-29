import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../utils/store';
import { adminAPI, authAPI } from '../utils/api';
import { FiUser, FiCheckCircle, FiAlertTriangle, FiBook, FiPlay, FiLock, FiX, FiDownload, FiActivity, FiZap, FiAward, FiClock } from 'react-icons/fi';
import Header from '../components/Header';
import Card from '../components/Card';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { isLoggedIn, teamId, role } = useGameStore();
  const [teamData, setTeamData] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isHandbookOpen, setIsHandbookOpen] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    if (teamId === 'ADMIN-EVENT-2026') {
      navigate('/admin');
      return;
    }

    const fetchData = async () => {
      try {
        const [tResponse, sResponse] = await Promise.all([
          authAPI.getTeam(teamId),
          adminAPI.getSettings()
        ]);
        setTeamData(tResponse.data);
        setSettings(sResponse.data);
      } catch (error) {
        console.error('Data acquisition error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [isLoggedIn, navigate, teamId]);

  if (!isLoggedIn || loading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center font-sans text-brand-primary">
        <div className="flex flex-col items-center">
            <div className="w-48 h-48 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mb-16"></div>
            <p className="animate-pulse font-bold tracking-widest uppercase text-12">Synchronizing with AWS Command...</p>
        </div>
      </div>
    );
  }

  const adminActiveRound = settings?.currentRound || 0;
  const isRoundActive = settings?.isRoundActive;
  const hasCompletedCurrentRound = Object.keys(teamData?.gameState?.[`year${adminActiveRound}`]?.answers?.[role?.toLowerCase()] || {}).length > 0;
  const isCurrentlyPlayable = isRoundActive && !hasCompletedCurrentRound;
  const isEliminated = teamData?.gameState?.[`year${adminActiveRound}`]?.answers?.[role?.toLowerCase()]?.disqualified;

  const roleDescriptions = {
    cto: { name: 'Chief Technology Officer', desc: (<ul className="list-disc pl-20 space-y-2"><li>System design decisions</li><li>Tech stack ownership</li><li>Performance & scalability</li></ul>) },
    cfo: { name: 'Chief Financial Officer', desc: (<ul className="list-disc pl-20 space-y-2"><li>Budget constraints</li><li>Resource allocation</li><li>Financial trade-offs</li></ul>) },
    pm: { name: 'Product Manager', desc: (<ul className="list-disc pl-20 space-y-2"><li>Define product roadmap</li><li>Manage feature prioritization</li><li>Align team goals</li></ul>) }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col font-sans text-brand-text-primary">
      <Header showLeaderboard={false} title={teamData?.teamName ? `${teamData.teamName} Dashboard` : 'Team Dashboard'} />
      
      <main className="max-w-[1200px] mx-auto px-16 py-24 flex-1 w-full space-y-20">
        
        {/* Global Stats Bar — Team Name, ID, Round Status */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 bg-brand-elevated p-8 rounded-xl border border-brand-border">
          <div className="px-16 py-8 bg-brand-surface rounded-lg border border-brand-border/50">
            <p className="text-10 text-brand-text-muted uppercase tracking-widest mb-2 font-bold">Team Identifier</p>
            <p className="text-14 font-mono font-bold text-brand-primary">{teamData?.teamId}</p>
          </div>
          <div className="px-16 py-8 bg-brand-surface rounded-lg border border-brand-border/50">
            <p className="text-10 text-brand-text-muted uppercase tracking-widest mb-2 font-bold">Operational Cluster</p>
            <p className="text-14 font-bold text-brand-text-primary truncate">{teamData?.teamName}</p>
          </div>
          <div className="md:col-span-2 px-16 py-8 bg-brand-surface rounded-lg border border-brand-border/50 flex items-center justify-between">
            <div>
                <p className="text-10 text-brand-text-muted uppercase tracking-widest mb-2 font-bold">Mission Status</p>
                {isEliminated ? (
                  <div className="text-red-400 font-bold text-14 flex items-center"><FiAlertTriangle className="mr-6" /> ELIMINATED — Round {adminActiveRound + 1}</div>
                ) : hasCompletedCurrentRound ? (
                  <div className="text-emerald-400 font-bold text-14 flex items-center"><FiCheckCircle className="mr-6" /> You have completed round {adminActiveRound + 1}</div>
                ) : isRoundActive ? (
                  <div className="text-brand-primary font-bold text-14 flex items-center animate-pulse"><FiActivity className="mr-6" /> Round {adminActiveRound + 1} started</div>
                ) : (
                  <div className="text-brand-text-muted font-semibold text-14 flex items-center"><FiLock className="mr-6" /> waiting for round {adminActiveRound + 1} to be started</div>
                )}
            </div>
            <span className="text-10 font-bold text-emerald-400 uppercase bg-emerald-500/10 px-8 py-2 rounded border border-emerald-500/20">{teamData?.eventStatus}</span>
          </div>
        </div>

        {/* Round Progress Timeline */}
        <Card className="p-20 border-brand-border bg-brand-surface/40">
          <div className="flex items-center gap-10 mb-16">
            <FiActivity className="text-brand-primary" size={16} />
            <h3 className="text-12 font-bold text-brand-text-primary uppercase tracking-widest">Round Progress</h3>
          </div>
          <div className="flex items-center gap-4">
            {[0, 1, 2, 3, 4].map((round, idx) => {
              const roundAnswers = teamData?.gameState?.[`year${round}`]?.answers?.[role?.toLowerCase()];
              const hasAnswered = roundAnswers && Object.keys(roundAnswers).length > 0;
              const wasDisqualified = roundAnswers?.disqualified;
              const isCurrent = round === adminActiveRound;
              const isActive = isCurrent && isRoundActive;
              const isFuture = round > adminActiveRound;

              return (
                <React.Fragment key={round}>
                  <button
                    onClick={() => hasAnswered && !wasDisqualified && navigate(`/report/${round}`)}
                    className={`flex-1 flex flex-col items-center gap-8 py-12 px-8 rounded-xl transition-all ${
                      hasAnswered && !wasDisqualified ? 'cursor-pointer hover:bg-brand-primary/5' : 'cursor-default'
                    }`}
                  >
                    <div className={`w-32 h-32 rounded-full flex items-center justify-center text-12 font-bold transition-all ${
                      wasDisqualified ? 'bg-red-500/20 text-red-400 border-2 border-red-500/40'
                      : hasAnswered ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/40'
                      : isActive ? 'bg-brand-primary/20 text-brand-primary border-2 border-brand-primary/50 animate-pulse'
                      : isCurrent ? 'bg-brand-primary/10 text-brand-primary border-2 border-brand-primary/30'
                      : 'bg-brand-elevated text-brand-text-muted border-2 border-brand-border'
                    }`}>
                      {wasDisqualified ? <FiAlertTriangle size={14} />
                       : hasAnswered ? <FiCheckCircle size={14} />
                       : isActive ? <FiPlay size={12} />
                       : isFuture ? <FiLock size={12} />
                       : round + 1}
                    </div>
                    <span className={`text-10 font-bold uppercase tracking-wider ${
                      isCurrent ? 'text-brand-primary' : hasAnswered ? 'text-emerald-400' : 'text-brand-text-muted'
                    }`}>
                      R{round + 1}
                    </span>
                    {hasAnswered && !wasDisqualified && (
                      <span className="text-[9px] text-brand-text-muted font-medium">View Report</span>
                    )}
                  </button>
                  {idx < 4 && (
                    <div className={`h-[2px] w-12 rounded-full shrink-0 ${
                      hasAnswered ? 'bg-emerald-500/40' : 'bg-brand-border'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </Card>

        {/* Achievement Badges */}
        {(() => {
          const badges = [];
          const gs = teamData?.gameState || {};
          const r = role?.toLowerCase();

          const completedRounds = [0,1,2,3,4].filter(y => {
            const a = gs[`year${y}`]?.answers?.[r];
            return a && Object.keys(a).length > 0 && !a.disqualified;
          });

          if (completedRounds.length >= 1) {
            const firstRound = completedRounds[0];
            const time = gs[`year${firstRound}`]?.answers?.[r]?.timeSpent;
            if (time !== undefined && time < 300) {
              badges.push({ icon: <FiZap />, label: 'Speed Demon', desc: 'Completed a round in under 5 minutes', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' });
            }
          }

          if (completedRounds.length >= 1) {
            badges.push({ icon: <FiAward />, label: 'First Strike', desc: 'Completed your first round', color: 'text-brand-primary', bg: 'bg-brand-primary/10', border: 'border-brand-primary/30' });
          }

          if (completedRounds.length >= 3) {
            badges.push({ icon: <FiCheckCircle />, label: 'Veteran', desc: 'Completed 3+ rounds', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' });
          }

          if (completedRounds.length >= 5) {
            badges.push({ icon: <FiAward />, label: 'Mission Complete', desc: 'Completed all 5 rounds', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' });
          }

          const allTimes = completedRounds.map(y => gs[`year${y}`]?.answers?.[r]?.timeSpent).filter(t => t !== undefined);
          if (allTimes.length > 0 && allTimes.every(t => t < 600)) {
            badges.push({ icon: <FiClock />, label: 'Efficient Operator', desc: 'All rounds under 10 min', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' });
          }

          if (badges.length === 0) return null;

          return (
            <Card className="p-20 border-brand-border bg-brand-surface/40">
              <div className="flex items-center gap-10 mb-16">
                <FiAward className="text-brand-primary" size={16} />
                <h3 className="text-12 font-bold text-brand-text-primary uppercase tracking-widest">Achievements</h3>
              </div>
              <div className="flex flex-wrap gap-8">
                {badges.map((b, idx) => (
                  <div key={idx} className={`flex items-center gap-8 px-12 py-8 rounded-xl ${b.bg} border ${b.border} transition-all hover:scale-105`}>
                    <div className={b.color}>{React.cloneElement(b.icon, { size: 16 })}</div>
                    <div>
                      <p className={`text-12 font-bold ${b.color}`}>{b.label}</p>
                      <p className="text-[9px] text-brand-text-muted font-medium">{b.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })()}

        {/* Role Cards — THE ONLY PLACE for role info now */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
          {['cto', 'cfo', 'pm'].map(r => {
            const member = teamData?.members?.find(m => m.role?.toLowerCase() === r);
            const isMe = r === role?.toLowerCase();
            return (
              <Card key={r} className={`p-20 border-2 transition-all ${isMe ? 'border-brand-primary shadow-glow bg-brand-primary/5' : 'border-brand-border bg-brand-surface/40 opacity-80 hover:opacity-100'}`}>
                <div className="flex justify-between items-start mb-16">
                  <div className={`p-10 rounded-xl ${isMe ? 'bg-brand-primary text-white' : 'bg-brand-elevated text-brand-text-muted border border-brand-border'}`}>
                    <FiUser size={24} />
                  </div>
                  {isMe && <span className="bg-brand-primary/20 text-brand-primary px-8 py-2 rounded text-10 font-bold uppercase tracking-widest border border-brand-primary/30">Active Operator</span>}
                </div>
                <h3 className="text-14 font-bold text-brand-text-primary uppercase tracking-wide">{roleDescriptions[r].name}</h3>
                <div className="mt-8 pt-8 border-t border-brand-border/30">
                  <p className="text-16 font-bold text-brand-text-secondary">{member?.name || 'Vacant'}</p>
                  <p className="text-11 font-mono text-brand-text-muted mt-4 opacity-60">AuthID: {member?.userId || 'N/A'}</p>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Responsibilities Section */}
        <Card className="p-20 border-brand-border bg-brand-surface/40">
          <div className="flex items-center gap-10 mb-12 border-b border-brand-border pb-8">
            <FiActivity className="text-brand-primary" size={18} />
            <h3 className="text-14 font-bold text-brand-text-primary uppercase tracking-wider">{roleDescriptions[role?.toLowerCase()]?.name} Responsibilities</h3>
          </div>
          <div className="text-13 text-brand-text-muted leading-relaxed">
            {roleDescriptions[role?.toLowerCase()]?.desc || 'No responsibilities defined.'}
          </div>
        </Card>

        {/* Fun Round Banner */}
        {isRoundActive && adminActiveRound >= 5 && (
          <Card className="p-0 border-yellow-500/30 bg-gradient-to-r from-yellow-500/5 via-[#111827] to-yellow-500/5 overflow-hidden">
            <div className="flex items-center justify-between p-[20px]">
              <div className="flex items-center gap-[16px]">
                <div className="w-[48px] h-[48px] rounded-[12px] bg-yellow-500 flex items-center justify-center shadow-[0_0_20px_rgba(234,179,8,0.3)]">
                  <FiZap size={24} className="text-black" />
                </div>
                <div>
                  <div className="flex items-center gap-[10px]">
                    <h3 className="text-[18px] font-bold text-[#F9FAFB]">Fun Round is LIVE!</h3>
                    <span className="w-[8px] h-[8px] bg-yellow-500 rounded-full animate-pulse" />
                  </div>
                  <p className="text-[12px] text-[#9CA3AF] mt-[2px]">Speed-based scoring — every millisecond counts</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/fun-round')}
                className="flex items-center gap-[8px] px-[24px] py-[12px] bg-yellow-500 hover:bg-yellow-400 text-black font-black text-[13px] uppercase tracking-wider rounded-[10px] transition-all shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/40 hover:scale-105 active:scale-95"
              >
                <FiPlay size={16} /> Enter Fun Round
              </button>
            </div>
          </Card>
        )}

        {/* Footer Actions — Compact & Pro */}
        <div className="flex flex-wrap justify-between items-center bg-brand-elevated/30 p-12 rounded-xl border border-brand-border">
          <div className="flex gap-8 flex-wrap">
            <button 
                onClick={() => setIsHandbookOpen(!isHandbookOpen)} 
                className={`h-[32px] px-12 rounded bg-brand-surface border text-[11px] font-bold uppercase tracking-wider flex items-center gap-6 transition-all ${isHandbookOpen ? 'bg-brand-primary text-white border-brand-primary shadow-glow-sm' : 'text-brand-text-secondary hover:text-brand-primary border-brand-border hover:bg-white/5'}`}
            >
                <FiBook size={12} />
                Handbook
            </button>

            <a href="/handbook.pdf" download className="h-[32px] px-12 rounded bg-brand-surface border border-brand-border flex items-center gap-6 text-brand-text-secondary hover:text-brand-primary transition-colors text-[11px] font-bold uppercase tracking-wider">
                <FiDownload size={12} />
                PDF
            </a>

            <button 
                onClick={() => navigate('/training')} 
                className="h-[32px] px-12 rounded bg-brand-surface border border-brand-border text-brand-text-secondary hover:text-brand-primary hover:bg-white/5 flex items-center gap-6 transition-all text-[11px] font-bold uppercase tracking-wider"
            >
                <FiActivity size={12} /> Instructions & Planning
            </button>
          </div>

          <div className="flex gap-8 mt-12 sm:mt-0">
            {hasCompletedCurrentRound && !isEliminated ? (
                <div className="flex items-center gap-16">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest leading-none">Registered</span>
                    <span className="text-[10px] font-semibold text-brand-text-muted mt-2 italic">Waiting for Round {adminActiveRound + 2}...</span>
                  </div>
                  <div className="h-[32px] px-12 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-6 text-emerald-400 text-[11px] font-bold shadow-glow-sm uppercase tracking-wider">
                      <FiCheckCircle size={12} /> Round {adminActiveRound + 1} Done
                  </div>
                </div>
            ) : !isEliminated ? (
                <button 
                    onClick={() => isCurrentlyPlayable && navigate(`/instructions/${adminActiveRound}`)}
                    disabled={!isCurrentlyPlayable}
                    className={`h-[32px] px-16 rounded text-[11px] font-bold uppercase tracking-widest flex items-center gap-6 transition-all ${
                        isCurrentlyPlayable 
                        ? 'bg-brand-primary hover:bg-brand-primary/90 text-white shadow-lg shadow-brand-primary/30' 
                        : 'opacity-50 cursor-not-allowed bg-brand-surface border border-brand-border text-brand-text-muted'
                    }`}
                >
                    <FiPlay size={12} /> {isRoundActive ? `Start Round ${adminActiveRound + 1}` : `Waiting for Round ${adminActiveRound + 1} to start`}
                </button>
            ) : null}
          </div>
        </div>

        {/* Handbook Modal */}
        {isHandbookOpen && (
          <div className="fixed inset-0 z-[100] flex justify-end p-12 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <aside className="w-full max-w-[600px] h-full bg-brand-bg border border-brand-border rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-right-8 duration-500">
              <div className="px-20 py-12 border-b border-brand-border bg-brand-surface flex justify-between items-center">
                <div className="flex items-center gap-12">
                    <div className="p-8 bg-brand-primary/10 rounded-lg text-brand-primary">
                        <FiBook size={18} />
                    </div>
                    <span className="font-bold text-12 uppercase tracking-widest text-brand-text-primary">Strategic Handbook</span>
                </div>
                <div className="flex items-center gap-8">
                  <a href="/handbook.pdf" download className="p-8 rounded-lg hover:bg-brand-primary/10 text-brand-text-muted hover:text-brand-primary transition-colors" title="Download Official Copy">
                    <FiDownload size={18} />
                  </a>
                  <button onClick={() => setIsHandbookOpen(false)} className="p-8 rounded-lg hover:bg-red-500/10 text-brand-text-muted hover:text-red-400 transition-colors">
                    <FiX size={20} />
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-white">
                <iframe src="/handbook.pdf#view=FitH&toolbar=0" className="w-full h-full border-none" title="Handbook PDF" />
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
