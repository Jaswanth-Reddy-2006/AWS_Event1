import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Leaderboard from '../components/Leaderboard';
import FunLeaderboard from '../components/FunLeaderboard';
import Button from '../components/Button';
import Card from '../components/Card';
import { adminAPI } from '../utils/api';
import { useGameStore } from '../utils/store';
import { 
    FiUsers, FiActivity, FiShield, FiPlus, FiTrash2, FiPlay, FiStopCircle, 
    FiX, FiCheckCircle, FiAlertCircle, 
    FiEye, FiLock, FiClock,
    FiTrendingUp, FiUser, FiHome, FiTarget, FiCloud, FiZap, FiCircle, FiAward, FiStar,
    FiChevronDown, FiChevronUp, FiPlusSquare
} from 'react-icons/fi';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { tab } = useParams();
  const activeTab = tab || 'dashboard';
  const { setLogout } = useGameStore();
  const [leaderboardMode, setLeaderboardMode] = useState('standard');

  const [isFunRoundsOpen, setIsFunRoundsOpen] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({});

  const togglePasswordVisibility = (key) => {
    setVisiblePasswords(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const menuItems = [
    { id: 'dashboard', label: 'Monitor', icon: <FiHome /> },
    { id: 'leaderboard', label: 'Ranking', icon: <FiAward /> },
    { id: 'r1', label: 'Round 1', icon: <FiTarget />, year: 0 },
    { id: 'r2', label: 'Round 2', icon: <FiTarget />, year: 1 },
    { id: 'r3', label: 'Round 3', icon: <FiTarget />, year: 2 },
    { id: 'r4', label: 'Round 4', icon: <FiTarget />, year: 3 },
    { id: 'r5', label: 'Round 5', icon: <FiTarget />, year: 4 },
  ];

  const [funRounds, setFunRounds] = useState([
    { id: 'funderon1', label: 'Funderon 1', year: 5 },
    { id: 'funderon2', label: 'Funderon 2', year: 6 },
  ]);

  const addFunRound = () => {
    const nextNum = funRounds.length + 1;
    const nextYear = 4 + nextNum;
    setFunRounds([...funRounds, { id: `funderon${nextNum}`, label: `Funderon ${nextNum}`, year: nextYear }]);
    setIsFunRoundsOpen(true);
  };

  const [settings, setSettings] = useState(null);
  const [teams, setTeams] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [editingQId, setEditingQId] = useState(null);
  const [activeRoleFilter, setActiveRoleFilter] = useState('cto'); 
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [roundTimeLeft, setRoundTimeLeft] = useState(null); // seconds remaining
  const [showInitBanner, setShowInitBanner] = useState(false);
  const timerRef = useRef(null);

  // Admin creation state
  const [newAdmin, setNewAdmin] = useState({
    teamId: '',
    teamName: '',
    password: ''
  });

  // Question Creation Form State
  const [newQ, setNewQ] = useState({
    type: 'mcq',
    question: '',
    options: [
      { optionId: 'A', text: '', value: 'A' },
      { optionId: 'B', text: '', value: 'B' },
      { optionId: 'C', text: '', value: 'C' },
      { optionId: 'D', text: '', value: 'D' }
    ],
    correctAnswer: 'A', // For MCQ and TrueFalse
    correctAnswers: [], // For Multi-Select
    range: { min: 1, max: 10 }, // For Range
    scoringRubric: {
      full: 10,
      partial: 5,
      incorrect: -5
    }
  });

  // Team Registration State (Admin Created)
  const [newTeam, setNewTeam] = useState({
    teamName: '',
    members: [
      { name: '', role: 'cto', password: '' },
      { name: '', role: 'cfo', password: '' },
      { name: '', role: 'pm', password: '' }
    ]
  });
  const [createdTeamId, setCreatedTeamId] = useState(null);

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [sets, tms, qns] = await Promise.all([
          adminAPI.getSettings(),
          adminAPI.getTeams(),
          adminAPI.getQuestions()
        ]);
        setSettings(sets.data);
        setTeams(tms.data.teams || []);
        setQuestions(qns.data || []);
        setLoading(false);
      } catch (err) {
        console.error('Data Load Error:', err);
        setLoading(false);
      }
    };
    loadAll();
    const interval = setInterval(loadAll, 15000);
    return () => clearInterval(interval);
  }, []);

  // Countdown timer effect — recalculates every second from roundStartedAt
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (settings?.isRoundActive && settings?.roundStartedAt) {
      const computeLeft = () => {
        const deadline = new Date(settings.roundStartedAt).getTime() + 30 * 60 * 1000;
        const left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
        setRoundTimeLeft(left);
      };
      computeLeft();
      timerRef.current = setInterval(computeLeft, 1000);
    } else {
      setRoundTimeLeft(null);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [settings?.isRoundActive, settings?.roundStartedAt]);
  
  useEffect(() => {
    if (newQ.type === 'truefalse') {
        setNewQ(prev => ({
            ...prev,
            correctAnswer: 'A',
            options: [
                { optionId: 'A', text: 'True', value: 'A' },
                { optionId: 'B', text: 'False', value: 'B' },
                { optionId: 'C', text: '', value: 'C' },
                { optionId: 'D', text: '', value: 'D' }
            ]
        }));
    }
  }, [newQ.type]);

  const handleStartStopRound = async (start) => {
    const targetYearStr = menuItems.find(m => m.id === activeTab)?.year;
    const targetYear = Number(targetYearStr);

    if (start) {
        // Enforce sequential rounds
        if (targetYear > settings.currentRound + 1) {
             setMsg({ type: 'error', text: `You have not completed Round ${targetYear}. Enforcing sequential progression.` });
             return;
        }
        if (targetYear < settings.currentRound) {
             setMsg({ type: 'error', text: `Cannot restart previous rounds. Use Reset Competition for a fresh start.` });
             return;
        }
        
        const hasProgress = teams.some(t => {
            const yd = t.gameState?.[`year${targetYear}`];
            if (!yd || !yd.answers) return false;
            return Object.keys(yd.answers.cto || {}).length > 0 || 
                   Object.keys(yd.answers.cfo || {}).length > 0 || 
                   Object.keys(yd.answers.pm || {}).length > 0 ||
                   Object.keys(yd.answers.fun || {}).length > 0;
        });

        if (targetYear === settings.currentRound && hasProgress && !settings.isRoundActive) {
             setMsg({ type: 'error', text: `Cannot restart a round that has already been played. Use Reset Competition for a fresh start.` });
             return;
        }
        
        // Enforce that ALL teams completed the previous round
        if (targetYear > 0 && targetYear === settings.currentRound + 1) {
             const previousYear = targetYear - 1;
             
             // Check if previous round even started
             // If currentRound is equal to previousYear but isRoundActive is still true, it hasn't finished yet.
             // Wait, if currentRound < previousYear, that's already blocked.
             
             const uncompletedTeams = teams.filter(t => {
                 // Check if team has answers for all 3 roles (or if disqualified)
                 const yearData = t.gameState?.[`year${previousYear}`];
                 const ctoDone = yearData?.answers?.cto && Object.keys(yearData.answers.cto).length > 0;
                 const cfoDone = yearData?.answers?.cfo && Object.keys(yearData.answers.cfo).length > 0;
                 const pmDone = yearData?.answers?.pm && Object.keys(yearData.answers.pm).length > 0;
                 return !(ctoDone && cfoDone && pmDone);
             });

             if (uncompletedTeams.length > 0) {
                 if (settings.currentRound === previousYear && !settings.isRoundActive && uncompletedTeams.length === teams.length) {
                     setMsg({ type: 'error', text: `Round ${previousYear + 1} has not started yet.` });
                 } else {
                     setMsg({ type: 'error', text: `Round ${previousYear + 1} is still in progress.` });
                 }
                 return;
             }
        }
    }

    try {
      const payload = {
        currentRound: targetYear,
        isRoundActive: start
      };
      
      // If stopping the round, we want to immediately re-initialize it (clear progress for the round)
      if (!start) {
          payload.resetRoundData = targetYear;
      }

      const res = await adminAPI.updateSettings(payload);
      // Immediately clear the ui's copy of progress so it doesn't show as LOCKED
      if (!start) {
          setTeams(prevTeams => prevTeams.map(t => {
              if (t.gameState) {
                  return {
                      ...t,
                      gameState: {
                          ...t.gameState,
                          [`year${targetYear}`]: { 
                            answers: { cto: {}, cfo: {}, pm: {}, fun: {} }, 
                            scores: { cto: 0, cfo: 0, pm: 0, fun: 0, roundAvg: 0 }, 
                            questionScores: { cto: {}, cfo: {}, pm: {}, fun: {} }, 
                            companyState: { monthlyBill: 0, monthlyRevenue: 0, runwayMonths: 0, cumulativeProfit: 0 } 
                          }
                      }
                  };
              }
              return t;
          }));
      }

      setSettings(res.data);
      if (start) setShowInitBanner(true);
      setTimeout(() => setShowInitBanner(false), 8000);
      setMsg({ type: 'success', text: `Mission Phase ${targetYear + 1} is now ${start ? 'LIVE — 30 min timer started' : 'STANDBY'}.` });
    } catch (err) {
      setMsg({ type: 'error', text: 'Operational transition failed.' });
    }
  };

  const handleEditClick = (q) => {
    setEditingQId(q._id);
    setIsAddingQuestion(true);
    setNewQ({
        type: q.type || 'mcq',
        question: q.question,
        options: q.type === 'range' ? [
            { optionId: 'A', text: '', value: 'A' },
            { optionId: 'B', text: '', value: 'B' },
            { optionId: 'C', text: '', value: 'C' },
            { optionId: 'D', text: '', value: 'D' }
        ] : q.options.length < 4 ? [...q.options, ...Array(4 - q.options.length).fill(null).map((_, i) => ({ optionId: String.fromCharCode(65 + q.options.length + i), text: '', value: String.fromCharCode(65 + q.options.length + i) }))] : q.options,
        correctAnswer: (q.type === 'mcq' || q.type === 'truefalse') ? q.correctAnswer : 'A',
        correctAnswers: q.type === 'multi-select' ? (Array.isArray(q.correctAnswer) ? q.correctAnswer : []) : [],
        range: q.type === 'range' ? q.acceptableRange || { min: 1, max: 10 } : { min: 1, max: 10 },
        scoringRubric: q.scoringRubric || { full: 10, partial: 5, incorrect: -5 }
    });
    // Scroll to top of form
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    const year = activeTab === 'r1' ? 0 : activeTab === 'r2' ? 1 : activeTab === 'r3' ? 2 : activeTab === 'r4' ? 3 : 4;
    try {
        let finalCorrectAnswer = newQ.correctAnswer;
        if (newQ.type === 'multi-select') {
            finalCorrectAnswer = newQ.correctAnswers;
        } else if (newQ.type === 'range') {
            finalCorrectAnswer = newQ.range;
        }

        const payload = {
            type: newQ.type,
            role: activeRoleFilter,
            question: newQ.question,
            options: newQ.type === 'range' ? [] : newQ.options.filter(o => o.text.trim() !== ''),
            correctAnswer: finalCorrectAnswer,
            scoringRubric: newQ.scoringRubric,
            year: year,
            scenario: 'AWS Operational Event'
        };

        if (newQ.type === 'range') {
            payload.acceptableRange = newQ.range;
        } else if (newQ.type === 'numerical') {
            payload.acceptableRange = newQ.range; // Using same object for simplicity
            payload.correctAnswer = newQ.range.min;
        }

        if (editingQId) {
            await adminAPI.updateQuestion(editingQId, payload);
            setMsg({ type: 'success', text: 'Tactical scenario updated successfully.' });
        } else {
            await adminAPI.createQuestion(payload);
            setMsg({ type: 'success', text: 'Tactical scenario deployed to database.' });
        }
        
        const qns = await adminAPI.getQuestions();
        setQuestions(qns.data);
        
        setNewQ({
            type: 'mcq',
            question: '',
            options: [
              { optionId: 'A', text: '', value: 'A' },
              { optionId: 'B', text: '', value: 'B' },
              { optionId: 'C', text: '', value: 'C' },
              { optionId: 'D', text: '', value: 'D' }
            ],
            correctAnswer: 'A',
            correctAnswers: [],
            range: { min: 1, max: 10 },
            scoringRubric: { full: 10, partial: 5, incorrect: -5 }
        });
        setIsAddingQuestion(false);
        setEditingQId(null);
    } catch (err) {
        setMsg({ type: 'error', text: `ERROR: ${err.response?.data?.error || 'Validation failure'}` });
    }
  };


  const handleLogout = () => {
    setLogout();
    navigate('/');
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        teamId: newAdmin.teamId,
        memberName: newAdmin.teamName,
        password: newAdmin.password
      };
      await adminAPI.createAdmin(payload);
      setMsg({ type: 'success', text: `Administrator ${newAdmin.teamName} initialized in database.` });
      setNewAdmin({ teamId: '', teamName: '', password: '' });
    } catch (err) {
      setMsg({ type: 'error', text: 'Admin creation failed. Check parameters.' });
    }
  };

  const handleReset = async (type = 'partial') => {
    if (!window.confirm(`WARNING: This will ${type === 'total' ? 'DELETE ALL TEAMS' : 'RESET ALL ROUND PROGRESS'}. Are you sure?`)) return;
    try {
      await adminAPI.resetGame(type);
      setMsg({ type: 'success', text: `Tactical reset complete. System re-initialized to Phase 01.` });
      navigate('/admin/dashboard');
      
      // Refresh data instead of reloading the page to prevent logout
      const [sets, tms, qns] = await Promise.all([
        adminAPI.getSettings(),
        adminAPI.getTeams(),
        adminAPI.getQuestions()
      ]);
      setSettings(sets.data);
      setTeams(tms.data.teams || []);
      setQuestions(qns.data || []);
      
      if (type === 'total') {
        setMsg({ type: 'success', text: 'Total reset successful. All units eliminated.' });
      } else {
        setMsg({ type: 'success', text: 'Partial reset successful. Round progress cleared.' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Reset failed. Operational error.' });
    }
  };



  if (loading) return (
    <div className="min-h-screen bg-[#0B0F14] flex items-center justify-center">
        <div className="text-center">
            <FiZap size={64} className="text-[#7C3AED] mx-auto mb-[24px] animate-pulse" />
            <p className="text-[12px] font-medium text-[#9CA3AF] tracking-widest uppercase">Synchronizing Command Hub...</p>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B0F14] flex font-sans selection:bg-[#7C3AED]/30">
      {/* PERSISTENT SIDEBAR */}
      <aside className="w-[280px] bg-[#111827] flex flex-col fixed inset-y-0 z-50 border-r border-[#1F2937] shadow-xl">
        <div className="p-[32px] mb-[16px]">
            <div className="flex items-center gap-[12px]">
                <div className="bg-[#7C3AED]/10 p-[8px] rounded-[8px]">
                  <FiCloud className="text-[#7C3AED]" size={24} />
                </div>
                <h1 className="text-[20px] font-semibold tracking-tight text-[#F9FAFB]">AWS <span className="text-[#7C3AED]">Control</span></h1>
            </div>
        </div>

        <nav className="flex-1 px-[16px] flex flex-col gap-[8px] overflow-y-auto hidden-scrollbar">
            {menuItems.map(item => (
                <button
                    key={item.id}
                    onClick={() => navigate(`/admin/${item.id}`)}
                    className={`w-full flex items-center gap-[12px] px-[16px] py-[12px] rounded-[8px] transition-all duration-200 text-[14px] font-medium ${
                        activeTab === item.id 
                        ? 'bg-[#7C3AED]/10 text-[#7C3AED] shadow-glow border border-[#7C3AED]/20' 
                        : 'text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-white/5'
                    }`}
                >
                    <span className="text-[18px]">{item.icon}</span>
                    <span>{item.label}</span>
                </button>
            ))}

            {/* FUN ROUNDS COLLAPSIBLE */}
            <div className="mt-[8px]">
                <button
                    onClick={() => setIsFunRoundsOpen(!isFunRoundsOpen)}
                    className="w-full flex items-center justify-between px-[16px] py-[12px] rounded-[8px] text-[14px] font-medium text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-white/5 transition-all"
                >
                    <div className="flex items-center gap-[12px]">
                        <FiStar className="text-yellow-500" size={18} />
                        <span>Fun Rounds</span>
                    </div>
                    {isFunRoundsOpen ? <FiChevronUp /> : <FiChevronDown />}
                </button>

                {isFunRoundsOpen && (
                    <div className="flex flex-col gap-[4px] mt-[4px] ml-[16px] border-l border-[#1F2937] pl-[8px] animate-in slide-in-from-top-2 duration-200">
                        {funRounds.map(round => {
                            const qCount = questions.filter(q => q.year === round.year).length;
                            return (
                                <button
                                    key={round.id}
                                    onClick={() => navigate(`/admin/${round.id}`)}
                                    className={`w-full flex items-center justify-between px-[16px] py-[10px] rounded-[8px] transition-all text-[13px] ${
                                        activeTab === round.id 
                                        ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' 
                                        : 'text-[#6B7280] hover:text-[#F9FAFB] hover:bg-white/5'
                                    }`}
                                >
                                    <div className="flex flex-col items-start">
                                        <span className="font-semibold">{round.label}</span>
                                        <span className="text-[10px] opacity-60 uppercase tracking-tighter">{qCount} Questions</span>
                                    </div>
                                    {activeTab === round.id && <FiZap size={10} className="animate-pulse" />}
                                </button>
                            );
                        })}
                        <button
                            onClick={addFunRound}
                            className="w-full flex items-center gap-[8px] px-[16px] py-[10px] rounded-[8px] text-[12px] font-bold text-[#7C3AED] hover:bg-[#7C3AED]/10 transition-all uppercase tracking-widest mt-[4px]"
                        >
                            <FiPlusSquare size={16} />
                            <span>Create Round</span>
                        </button>
                    </div>
                )}
            </div>

            <button
                onClick={() => navigate('/admin/register')}
                className={`w-full flex items-center gap-[12px] px-[16px] py-[12px] rounded-[8px] transition-all duration-200 text-[14px] font-medium mt-auto ${
                    activeTab === 'register' 
                    ? 'bg-[#10B981]/10 text-[#10B981] shadow-glow-sm border border-[#10B981]/20' 
                    : 'text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-white/5'
                }`}
            >
                <FiPlus size={18} />
                <span>Provision Units</span>
            </button>
        </nav>

        <div className="p-[16px] mt-auto border-t border-[#1F2937]">
            <button 
                onClick={() => navigate('/admin/profile')}
                className={`w-full flex items-center gap-[12px] px-[16px] py-[12px] rounded-[8px] transition-all duration-200 text-[14px] font-medium ${
                    activeTab === 'profile' 
                    ? 'bg-[#7C3AED]/10 text-[#7C3AED] border border-[#7C3AED]/20' 
                    : 'text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-white/5'
                }`}
            >
                <FiShield size={18} />
                <span>Profile</span>
            </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 ml-[280px] p-[48px] min-h-screen relative">
        {/* Round Init Banner */}
        {showInitBanner && settings?.isRoundActive && (
            <div className="mb-[24px] p-[20px] rounded-[12px] border-2 border-[#7C3AED]/50 bg-[#7C3AED]/10 animate-in slide-in-from-top-4 duration-500 flex items-center justify-between">
                <div className="flex items-center gap-[16px]">
                    <FiZap className="text-[#7C3AED] animate-pulse" size={28} />
                    <div>
                        <div className="text-[16px] font-bold text-[#F9FAFB] uppercase tracking-widest">🚀 Round {(settings?.currentRound || 0) + 1} is LIVE</div>
                        <div className="text-[12px] text-[#9CA3AF] mt-[2px]">30-minute countdown started. All teams can now submit.</div>
                    </div>
                </div>
                <button onClick={() => setShowInitBanner(false)} className="text-[#9CA3AF] hover:text-white transition"><FiX size={18} /></button>
            </div>
        )}

        {/* Active Round Timer Bar */}
        {settings?.isRoundActive && roundTimeLeft !== null && (
            <div className={`mb-[24px] p-[14px] rounded-[10px] border flex items-center gap-[16px] ${
                roundTimeLeft < 300 ? 'border-red-500/40 bg-red-500/10' : 'border-yellow-500/30 bg-yellow-500/5'
            }`}>
                <FiClock className={roundTimeLeft < 300 ? 'text-red-400' : 'text-yellow-400'} size={20} />
                <span className={`text-[14px] font-bold uppercase tracking-wider ${
                    roundTimeLeft < 300 ? 'text-red-400' : 'text-yellow-400'
                }`}>
                    Round {(settings?.currentRound || 0) + 1} — Time Remaining: {Math.floor(roundTimeLeft / 60)}:{String(roundTimeLeft % 60).padStart(2, '0')}
                </span>
                {roundTimeLeft < 300 && <span className="text-[12px] font-bold text-red-300 animate-pulse ml-auto">⚠ ROUND CLOSING SOON</span>}
            </div>
        )}

        {/* Status Message */}
        {msg.text && (
            <div className={`mb-[32px] p-[16px] rounded-[8px] flex items-center justify-between text-[14px] font-medium border animate-in slide-in-from-top-4 duration-300 ${
                msg.type === 'success' 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}>
                 <div className="flex items-center gap-[12px]">
                    {msg.type === 'success' ? <FiCheckCircle size={20} /> : <FiAlertCircle size={20} />}
                    <span>{msg.text}</span>
                 </div>
                 <button onClick={() => setMsg({type:'', text:''})} className="opacity-50 hover:opacity-100 transition">
                    <FiX size={18} />
                 </button>
            </div>
        )}

        {/* Dynamic Content Based on Tab */}
        <div className="max-w-[1200px] mx-auto relative">
            {activeTab === 'dashboard' && (
                <div className="flex flex-col gap-[32px] animate-in fade-in duration-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-[32px] font-semibold text-[#F9FAFB] tracking-tight">Mission Intelligence</h2>
                            <p className="text-[14px] text-[#9CA3AF] mt-[4px]">Real-time operational telemetry across all units.</p>
                        </div>
                        <div className="flex items-center gap-[12px]">
                            <button 
                                onClick={() => handleReset('partial')}
                                className="px-16 py-8 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 text-12 font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-900/10"
                            >
                                Restart Competition
                            </button>
                            <div className="flex items-center gap-[12px] bg-[#111827] border border-[#1F2937] px-[16px] py-[8px] rounded-[8px]">
                                <div className="w-[8px] h-[8px] bg-[#7C3AED] rounded-full animate-pulse shadow-[0_0_8px_rgba(124,58,237,0.5)]"></div>
                                <span className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-widest">Live Uplink</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-[24px]">
                        <Card className="flex flex-col justify-between relative overflow-hidden group border border-[#1F2937] hover:border-[#7C3AED]/30 transition-all">
                            <div className="relative z-10">
                                <span className="text-[12px] font-medium text-[#7C3AED] uppercase tracking-widest block mb-[12px]">Cumulative points</span>
                                <span className="text-[48px] font-semibold text-[#F9FAFB] tracking-tight">
                                    {teams.reduce((acc, team) => {
                                        let sum = 0;
                                        for (let i = 0; i <= 4; i++) {
                                            const yd = team.gameState?.[`year${i}`];
                                            if (yd?.scores) {
                                                sum += (yd.scores.cto || 0) + (yd.scores.cfo || 0) + (yd.scores.pm || 0);
                                            }
                                        }
                                        return acc + sum;
                                    }, 0).toLocaleString()} <span className="text-[20px] text-[#9CA3AF]">pts</span>
                                </span>
                            </div>
                            <FiTrendingUp className="absolute -right-[16px] -bottom-[16px] text-[#7C3AED]/5 group-hover:scale-110 transition-transform duration-700" size={160} />
                        </Card>
                        
                        <Card className="flex flex-col justify-between relative overflow-hidden group border border-[#1F2937] hover:border-[#3b82f6]/30 transition-all">
                            <div className="relative z-10">
                                <span className="text-[12px] font-medium text-[#3b82f6] uppercase tracking-widest block mb-[12px]">Total Teams</span>
                                <div className="text-[48px] font-semibold text-[#F9FAFB] tracking-tight">
                                    {teams.length}
                                </div>
                            </div>
                            <FiUsers className="absolute -right-[16px] -bottom-[16px] text-[#3b82f6]/5 group-hover:scale-110 transition-transform duration-700" size={160} />
                        </Card>
                    </div>

                    <Card className="p-0 overflow-hidden flex flex-col h-[500px]">
                        <div className="overflow-x-auto overflow-y-auto flex-1 hidden-scrollbar">
                            <table className="w-full text-left relative">
                                <thead className="border-b border-[#1F2937] bg-[#0F172A] sticky top-0 z-10">
                                    <tr>
                                        <th className="px-[16px] py-[16px] text-[12px] font-medium text-[#9CA3AF] uppercase tracking-widest">#</th>
                                        <th className="px-[16px] py-[16px] text-[12px] font-medium text-[#9CA3AF] uppercase tracking-widest max-w-[150px] truncate">Team Name</th>
                                        <th className="px-[16px] py-[16px] text-[12px] font-medium text-[#9CA3AF] uppercase tracking-widest text-center">CTO</th>
                                        <th className="px-[16px] py-[16px] text-[12px] font-medium text-[#9CA3AF] uppercase tracking-widest text-center">CFO</th>
                                        <th className="px-[16px] py-[16px] text-[12px] font-medium text-[#9CA3AF] uppercase tracking-widest text-center">PM</th>
                                        <th className="px-[16px] py-[16px] text-[12px] font-medium text-[#9CA3AF] uppercase tracking-widest text-center">Status</th>
                                        <th className="px-[16px] py-[16px] text-[12px] font-medium text-[#9CA3AF] uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1F2937]">
                                    {teams.map((team, idx) => {
                                        const cto = team.members?.find(m => m.role?.toLowerCase() === 'cto');
                                        const cfo = team.members?.find(m => m.role?.toLowerCase() === 'cfo');
                                        const pm = team.members?.find(m => m.role?.toLowerCase() === 'pm');
                                        const violationsCount = team.gameState?.violations?.length || 0;
                                        
                                        const currentYearKey = `year${settings?.currentRound || 0}`;
                                        const currentRoundData = team.gameState?.[currentYearKey];
                                        
                                        const renderRoleCell = (memberObj, roleStr) => {
                                            if (!memberObj) return <span className="text-[13px] text-[#4B5563]">—</span>;
                                            const roleAns = currentRoundData?.answers?.[roleStr];
                                            const completed = roleAns && Object.keys(roleAns).length > 0;
                                            
                                            if (completed) {
                                                const roundDisplay = (settings?.currentRound || 0) + 1;
                                                return (
                                                    <div className="flex flex-col items-center justify-center gap-[4px]">
                                                        <span className="text-[13px] font-medium text-[#D1D5DB]">{memberObj.name}</span>
                                                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-[4px] px-[8px] py-[2px] rounded-full bg-emerald-400/10 border border-emerald-400/20">
                                                            <FiCheckCircle size={10} /> R{roundDisplay} Done
                                                        </span>
                                                    </div>
                                                );
                                            }
                                            return <span className="text-[13px] font-medium text-[#9CA3AF]">{memberObj.name}</span>;
                                        };

                                        const progressPct = currentRoundData?.answers ? (
                                            (Object.keys(currentRoundData.answers.cto || {}).length > 0 ? 1 : 0) +
                                            (Object.keys(currentRoundData.answers.cfo || {}).length > 0 ? 1 : 0) +
                                            (Object.keys(currentRoundData.answers.pm || {}).length > 0 ? 1 : 0)
                                        ) / 3 * 100 : 0;

                                        return (
                                            <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="px-[16px] py-[20px]">
                                                    <span className="text-[14px] font-medium text-[#9CA3AF] group-hover:text-[#7C3AED] transition-colors">{idx + 1}</span>
                                                </td>
                                                <td className="px-[16px] py-[20px] max-w-[150px] truncate" title={`${team.teamName} (${team.teamId})`}>
                                                    <span className="text-[16px] font-semibold text-[#F9FAFB] group-hover:text-[#7C3AED] transition-colors block truncate">{team.teamName}</span>
                                                    <span className="text-[10px] text-[#9CA3AF] font-mono hidden md:block">{team.teamId}</span>
                                                </td>
                                                <td className="px-[16px] py-[20px] text-center">
                                                    {renderRoleCell(cto, 'cto')}
                                                </td>
                                                <td className="px-[16px] py-[20px] text-center">
                                                    {renderRoleCell(cfo, 'cfo')}
                                                </td>
                                                <td className="px-[16px] py-[20px] text-center">
                                                    {renderRoleCell(pm, 'pm')}
                                                </td>
                                                <td className="px-[16px] py-[20px] max-w-[120px]">
                                                    <div className="flex flex-col gap-4">
                                                        <span className={`px-[10px] py-[4px] rounded-full text-[10px] font-bold uppercase tracking-wider text-center truncate ${violationsCount > 0 ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                                                            {violationsCount > 0 ? `RISK (${violationsCount})` : 'SECURE'}
                                                        </span>
                                                        <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                                            <div className="bg-[#7C3AED] h-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-[16px] py-[20px] text-right">
                                                    <button 
                                                        onClick={() => setSelectedTeam(team)}
                                                        className="p-[8px] bg-[#1F2937] hover:bg-[#7C3AED] hover:text-white rounded-[8px] text-[#9CA3AF] transition-colors border border-[#1F2937]"
                                                    >
                                                        <FiEye size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {teams.length === 0 && (
                                <div className="py-[64px] text-center">
                                    <FiActivity className="text-[#1F2937] mx-auto mb-[16px]" size={48} />
                                    <p className="text-[14px] text-[#9CA3AF] uppercase tracking-widest">Awaiting Unit Registration...</p>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Team Details Modal */}
                    {selectedTeam && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-[24px] bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                            <Card className="w-full max-w-[800px] max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border-[#374151]">
                                <div className="p-[24px] border-b border-[#1F2937] px-[32px] flex justify-between items-center bg-[#111827]">
                                    <div>
                                        <h3 className="text-[24px] font-semibold text-[#F9FAFB] tracking-tight">{selectedTeam.teamName}</h3>
                                        <p className="text-[14px] text-[#7C3AED] font-mono mt-[4px]">ID: {selectedTeam.teamId}</p>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedTeam(null)}
                                        className="p-[8px] text-[#9CA3AF] hover:text-white hover:bg-white/10 rounded-[8px] transition-colors"
                                    >
                                        <FiX size={28} />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto px-[32px] py-[24px] flex flex-col gap-[32px] bg-[#0B0F14]">
                                    {/* Score Overview */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-[16px]">
                                        <div className="bg-[#111827] border border-[#1F2937] rounded-[12px] p-[20px] shadow-inner">
                                            <span className="text-[10px] text-[#9CA3AF] uppercase tracking-widest">Status</span>
                                            <div className="text-[16px] font-bold text-emerald-400 mt-[4px] uppercase">{selectedTeam.status}</div>
                                        </div>
                                        <div className="bg-[#111827] border border-[#1F2937] rounded-[12px] p-[20px] shadow-inner">
                                            <span className="text-[10px] text-[#9CA3AF] uppercase tracking-widest">Live Valuation</span>
                                            <div className="text-[16px] font-bold text-[#F9FAFB] mt-[4px] font-mono">
                                                {(() => {
                                                    let sum = 0;
                                                    for (let i = 0; i <= 4; i++) {
                                                        const yd = selectedTeam.gameState?.[`year${i}`];
                                                        if (yd?.scores) {
                                                            sum += (yd.scores.cto || 0) + (yd.scores.cfo || 0) + (yd.scores.pm || 0);
                                                        }
                                                    }
                                                    return sum;
                                                })()} pts
                                            </div>
                                        </div>
                                        <div className="bg-[#111827] border border-[#1F2937] rounded-[12px] p-[20px] shadow-inner relative overflow-hidden">
                                            <span className="text-[10px] text-[#9CA3AF] uppercase tracking-widest">Integrity Violations</span>
                                            <div className="text-[16px] font-bold text-red-500 mt-[4px]">
                                                {selectedTeam.gameState?.violations ? selectedTeam.gameState.violations.length : 0}
                                            </div>
                                            <div className="absolute top-0 right-0 bottom-0 w-1 bg-red-500/20" />
                                        </div>
                                    </div>

                                    {/* Rounds Breakdown */}
                                    <div>
                                        <h4 className="text-[16px] font-bold text-[#F9FAFB] border-b border-[#1F2937] pb-[12px] mb-[16px] uppercase tracking-wider">Round Submissions</h4>
                                        {[0,1,2,3,4].map(y => {
                                            const yearKey = `year${y}`;
                                            const yData = selectedTeam.gameState?.[yearKey] || { 
                                                answers: { cto: {}, cfo: {}, pm: {} }, 
                                                scores: { cto: 0, cfo: 0, pm: 0 },
                                                timeSpent: { cto: 0, cfo: 0, pm: 0 },
                                                companyState: { cumulativeProfit: 0 }
                                            };
                                            
                                            // Format time as MM:SS
                                            const formatTime = (totalSeconds) => {
                                                const mins = Math.floor(totalSeconds / 60);
                                                const secs = Math.round(totalSeconds % 60);
                                                return `${mins}:${secs.toString().padStart(2, '0')}`;
                                            };
                                            
                                            return (
                                                <div key={y} className="mb-[24px] bg-[#111827] border border-[#1F2937] rounded-[12px] overflow-hidden">
                                                    <div className="px-[20px] py-[12px] bg-[#1F2937]/50 border-b border-[#1F2937] flex items-center justify-between">
                                                        <div className="flex items-center gap-[12px]">
                                                            <span className="font-semibold text-[#F9FAFB]">Round {y + 1}</span>
                                                            <span className="text-[12px] text-[#9CA3AF] px-[8px] py-[2px] bg-[#0B0F14] border border-[#1F2937] rounded">
                                                                {yData.submissionTime ? new Date(yData.submissionTime).toLocaleTimeString() : 'Not Yet Completed'}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-[12px]">
                                                            <span className={`text-[12px] font-bold px-[8px] py-[2px] rounded ${yData.companyState?.cumulativeProfit >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                                                {yData.companyState?.cumulativeProfit >= 0 ? 'PROFIT' : 'LOSS'}
                                                            </span>
                                                            <span className="text-[12px] font-mono text-[#F9FAFB]">₹{yData.companyState?.cumulativeProfit?.toLocaleString() || 0}</span>
                                                        </div>
                                                    </div>
                                                    <div className="p-[20px] flex flex-col gap-[16px]">
                                                        {['cto', 'cfo', 'pm'].map(role => {
                                                            const roleAnswers = yData.answers[role];
                                                            const roleScore = yData.scores?.[role] || 0;
                                                            const roleTime = yData.timeSpent?.[role] || 0;
                                                            const qScores = yData.questionScores?.[role] || {};
                                                            const hasAnswers = roleAnswers && Object.keys(roleAnswers).length > 0;
                                                            
                                                            return (
                                                                <div key={role} className="py-[12px] border-b border-[#1F2937]/50 last:border-0">
                                                                    <div className="flex flex-col md:flex-row items-start md:items-center gap-[16px] text-[14px] mb-[8px]">
                                                                        <div className="w-24 flex-shrink-0">
                                                                            <span className="text-[12px] font-bold text-[#7C3AED] uppercase border border-[#7C3AED]/20 bg-[#7C3AED]/10 px-[10px] py-[4px] rounded-[6px]">{role}</span>
                                                                        </div>
                                                                        <div className="flex-1">
                                                                            {hasAnswers ? (
                                                                                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest px-[8px] py-[4px] border border-emerald-400/20 bg-emerald-400/10 rounded">
                                                                                    Submitted
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-[10px] font-bold text-[#4B5563] uppercase tracking-widest px-[8px] py-[4px] border border-[#1F2937] bg-[#0B0F14] rounded">
                                                                                    Not Submitted
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center gap-[24px]">
                                                                            <div className="text-right">
                                                                                <div className="text-[10px] text-[#9CA3AF] uppercase">Points</div>
                                                                                <div className={`font-bold text-[16px] ${ roleScore < 0 ? 'text-red-400' : roleScore === 0 ? 'text-[#4B5563]' : 'text-emerald-400' }`}>{roleScore > 0 ? '+' : ''}{roleScore} pts</div>
                                                                            </div>
                                                                            <div className="text-right min-w-[70px]">
                                                                                <div className="text-[10px] text-[#9CA3AF] uppercase">Time Spent</div>
                                                                                <div className="font-medium text-[#F9FAFB]">{formatTime(roleTime)}</div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    {/* Per-question score breakdown */}
                                                                    {hasAnswers && Object.keys(qScores).length > 0 && (
                                                                        <div className="ml-[32px] mt-[8px] flex flex-wrap gap-[8px]">
                                                                            {Object.entries(qScores).map(([qId, pts], qi) => {
                                                                                const isPos = pts > 0;
                                                                                const isNeg = pts < 0;
                                                                                const isZero = pts === 0;
                                                                                return (
                                                                                    <span key={qId} title={`Q${qi+1}: ${qId}`} className={`text-[11px] font-mono px-[8px] py-[3px] rounded border ${
                                                                                        isPos ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' :
                                                                                        isNeg ? 'bg-red-500/10 border-red-500/30 text-red-300' :
                                                                                        'bg-white/5 border-[#1F2937] text-[#4B5563]'
                                                                                    }`}>
                                                                                        {isPos ? '✓' : isNeg ? '✗' : '—'} Q{qi+1}: {pts > 0 ? '+' : ''}{pts}pts
                                                                                    </span>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {(!selectedTeam.gameState?.year1 && !selectedTeam.gameState?.year2 && Object.keys(selectedTeam.gameState || {}).filter(k=>k.startsWith('year')).length === 0) && (
                                            <div className="text-center py-[48px] bg-[#111827] rounded-[12px] border border-dashed border-[#1F2937]">
                                                <p className="text-[14px] font-medium text-[#9CA3AF] tracking-[0.1em] uppercase">No mission logs transmitted yet.</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Detailed Violations */}
                                    {selectedTeam.gameState?.violations?.length > 0 && (
                                        <div>
                                            <h4 className="text-[16px] font-bold text-red-500 border-b border-red-500/20 pb-[12px] mb-[16px] uppercase tracking-wider">Integrity Breaches</h4>
                                            <div className="flex flex-col gap-[12px]">
                                                {selectedTeam.gameState.violations.map((v, i) => (
                                                    <div key={i} className="p-[16px] bg-red-500/5 border border-red-500/20 rounded-[8px] flex justify-between items-center">
                                                        <div>
                                                            <span className="text-[12px] font-bold text-red-400 uppercase block">{v.type}</span>
                                                            <p className="text-[14px] text-[#F9FAFB] mt-[2px]">{v.description}</p>
                                                        </div>
                                                        <span className="text-[12px] font-mono text-[#9CA3AF]">
                                                            {new Date(v.timestamp).toLocaleTimeString()}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'leaderboard' && (
                <div className="animate-in fade-in duration-500">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-24 mb-[48px]">
                        <div>
                            <h2 className="text-[32px] font-semibold text-[#F9FAFB] tracking-tight">Global Rankings</h2>
                            <p className="text-[14px] text-[#9CA3AF] mt-[4px]">Live valuation progression map and multi-year analytics.</p>
                        </div>
                        <div className="flex bg-[#111827] rounded-[8px] p-[4px] border border-[#1F2937]">
                             <button
                                 onClick={() => setLeaderboardMode('standard')}
                                 className={`px-[20px] py-[8px] rounded-[6px] text-[12px] font-bold uppercase transition-all ${leaderboardMode === 'standard' ? 'bg-[#7C3AED] text-white' : 'text-[#9CA3AF] hover:text-[#F9FAFB]'}`}
                             >
                                 Standard
                             </button>
                             <button
                                 onClick={() => setLeaderboardMode('fun')}
                                 className={`px-[20px] py-[8px] rounded-[6px] text-[12px] font-bold uppercase transition-all ${leaderboardMode === 'fun' ? 'bg-yellow-600 text-white shadow-glow-sm' : 'text-[#9CA3AF] hover:text-[#F9FAFB]'}`}
                             >
                                 Experimental
                             </button>
                        </div>
                    </div>
                    {leaderboardMode === 'standard' ? <Leaderboard /> : <FunLeaderboard />}
                </div>
            )}

            {['r1', 'r2', 'r3', 'r4', 'r5', ...funRounds.map(f => f.id)].includes(activeTab) && (() => {
                const isFunTab = activeTab.startsWith('funderon');
                const tabItem = [...menuItems, ...funRounds].find(m => m.id === activeTab);
                const tabYear = tabItem?.year;
                const isThisRoundLive = settings?.currentRound === tabYear && settings?.isRoundActive;
                
                // For Fun Rounds, we use a simpler progress check
                const hasProg = teams.some(t => {
                    const yd = t.gameState?.[`year${tabYear}`];
                    if (!yd || !yd.answers) return false;
                    return Object.keys(yd.answers.cto || {}).length > 0 || 
                           Object.keys(yd.answers.cfo || {}).length > 0 || 
                           Object.keys(yd.answers.pm || {}).length > 0 ||
                           (yd.answers.fun && Object.keys(yd.answers.fun).length > 0);
                });
                
                const isLocked = tabYear < settings?.currentRound || (tabYear === settings?.currentRound && !settings?.isRoundActive && hasProg);

                let btnIcon, btnLabel, btnStyle;
                if (isThisRoundLive) {
                    btnIcon = <FiStopCircle size={20} />;
                    btnLabel = 'STOP ROUND';
                    btnStyle = 'bg-red-600 hover:bg-red-500 text-white';
                } else if (isLocked) {
                    btnIcon = <FiLock size={20} />;
                    btnLabel = 'ROUND LOCKED';
                    btnStyle = 'opacity-50 cursor-not-allowed';
                } else {
                    btnIcon = <FiPlay size={20} />;
                    btnLabel = 'INITIALIZE ROUND';
                    btnStyle = '';
                }

                return (
                <div className="flex flex-col gap-[32px] animate-in fade-in duration-500">
                    <Card className="p-[32px]">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-[24px] mb-[48px]">
                            <div>
                                <h2 className="text-[32px] font-semibold text-[#F9FAFB] tracking-tight">
                                    {isFunTab ? tabItem?.label : `Phase 0${activeTab.slice(1)}`}
                                </h2>
                                <p className="text-[14px] text-[#7C3AED] font-medium uppercase tracking-widest mt-[8px]">
                                    {isFunTab ? 'Experimental Engagement Cluster' : `Deployment Window: Year ${tabYear}`}
                                </p>
                            </div>
                            
                            <Button
                                variant={isThisRoundLive ? 'secondary' : 'primary'}
                                onClick={() => {
                                    if (isLocked) {
                                        setMsg({ type: 'error', text: 'This round is permanently locked. Use Reset Competition to start over.' });
                                        return;
                                    }
                                    handleStartStopRound(!isThisRoundLive);
                                }}
                                className={`w-full lg:w-auto h-[48px] px-[28px] ${btnStyle}`}
                            >
                                {btnIcon}
                                <span className="text-[14px] uppercase tracking-wider ml-[8px]">{btnLabel}</span>
                            </Button>
                        </div>

                        {/* Filter Area for Roles / Sub-Rounds */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-[24px] mb-[32px] pb-[24px] border-b border-[#1F2937]">
                             <div className="flex bg-[#111827] rounded-[8px] p-[4px] border border-[#1F2937]">
                                 {(isFunTab ? ['fun'] : ['cto', 'cfo', 'pm']).map(role => (
                                     <button
                                         key={role}
                                         onClick={() => { setActiveRoleFilter(role); setIsAddingQuestion(false); }}
                                         className={`px-[24px] py-[8px] rounded-[6px] text-[14px] font-medium uppercase transition-all ${activeRoleFilter === role ? 'bg-[#7C3AED] text-white shadow-glow-sm' : 'text-[#9CA3AF] hover:text-[#F9FAFB]'}`}
                                     >
                                         {role === 'fun' ? 'All Participants' : role}
                                     </button>
                                 ))}
                             </div>

                             {isFunTab && (
                                 <div className="flex items-center gap-[12px]">
                                     <label className="text-[11px] font-bold text-[#9CA3AF] uppercase">Sub-Round Map:</label>
                                     <select 
                                        className="bg-[#111827] border border-[#1F2937] text-[#F9FAFB] text-[14px] py-[8px] px-[12px] rounded-[8px] focus:outline-none"
                                        onChange={(e) => {
                                            const qId = e.target.value;
                                            if (qId) {
                                               const q = questions.find(qn => qn._id === qId);
                                               if (q) handleEditClick(q);
                                            }
                                        }}
                                     >
                                         <option value="">Select Scenario...</option>
                                         {questions.filter(q => q.year === tabYear && q.role === 'fun').map((q, idx) => (
                                             <option key={q._id} value={q._id}>Sub-Round {idx + 1}: {q.question.substring(0, 30)}...</option>
                                         ))}
                                     </select>
                                 </div>
                             )}

                             <Button 
                                variant={isAddingQuestion ? 'ghost' : 'secondary'}
                                onClick={() => {
                                    if(isAddingQuestion) {
                                        setEditingQId(null);
                                        setNewQ({
                                            type: 'mcq',
                                            question: '',
                                            options: [
                                              { optionId: 'A', text: '', value: 'A' },
                                              { optionId: 'B', text: '', value: 'B' },
                                              { optionId: 'C', text: '', value: 'C' },
                                              { optionId: 'D', text: '', value: 'D' }
                                            ],
                                            correctAnswer: 'A',
                                            correctAnswers: [],
                                            range: { min: 1, max: 10 },
                                            scoringRubric: { full: 10, partial: 5, incorrect: -5 }
                                        });
                                    } else {
                                        // Auto-set role if in fun tab
                                        if (isFunTab) setActiveRoleFilter('fun');
                                    }
                                    setIsAddingQuestion(!isAddingQuestion);
                                }}
                                className="h-[40px] px-[16px] text-[12px]"
                             >
                                {isAddingQuestion ? <FiX className="text-red-400" /> : <FiPlus />}
                                <span className="ml-[8px]">{isAddingQuestion ? 'CANCEL' : `PLACE NEW SCENARIO FOR ${activeRoleFilter.toUpperCase()}`}</span>
                             </Button>
                        </div>

                        {/* Add Question Form */}
                        {isAddingQuestion && (
                            <div className="bg-[#1F2937] rounded-[12px] p-[32px] mb-[32px] border border-[#7C3AED]/20 animate-in zoom-in-95 duration-300">
                                <div className="mb-[24px] flex justify-between items-start">
                                    <div>
                                        <h4 className="text-[18px] font-semibold text-[#F9FAFB]">{editingQId ? 'Edit Simulation' : 'Scenario Architect'} - {activeRoleFilter.toUpperCase()}</h4>
                                        <p className="text-[12px] text-[#9CA3AF] mt-[4px]">{editingQId ? `Modifying existing deployment ID: ${editingQId}` : `Phase ${activeTab.slice(1)} Simulation Parameters`}</p>
                                    </div>
                                    <select 
                                        value={newQ.type}
                                        onChange={e => setNewQ({...newQ, type: e.target.value})}
                                        className="bg-[#111827] border border-[#1F2937] text-[#7C3AED] text-[12px] font-bold px-[12px] py-[6px] rounded uppercase tracking-wider focus:outline-none"
                                    >
                                        <option value="mcq">MCQ</option>
                                        <option value="truefalse">True/False</option>
                                        <option value="multi-select">Multi-Selection</option>
                                        <option value="range">Range/Numerical</option>
                                        <option value="numerical">Numerical Exact</option>
                                    </select>
                                </div>
                                
                                <form onSubmit={handleCreateQuestion} className="flex flex-col gap-[24px]">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-[16px]">
                                        <div className="flex flex-col gap-[8px]">
                                            <label className="text-[12px] font-medium text-[#10B981] uppercase tracking-widest px-[4px]">Correct Reward</label>
                                            <input 
                                                type="number"
                                                value={newQ.scoringRubric.full}
                                                onChange={e=>setNewQ({...newQ, scoringRubric: {...newQ.scoringRubric, full: Number(e.target.value)}})}
                                                className="w-full px-[16px] py-[10px] bg-[#111827] border border-[#1F2937] rounded-[8px] text-[14px] text-emerald-400 focus:border-emerald-500/50 focus:outline-none transition-all font-mono"
                                            />
                                        </div>
                                        {['multi-select', 'range', 'numerical'].includes(newQ.type) && (
                                            <div className="flex flex-col gap-[8px]">
                                                <label className="text-[12px] font-medium text-[#7C3AED] uppercase tracking-widest px-[4px]">
                                                    {newQ.type === 'numerical' ? 'Target Value' : 'Partial Credit'}
                                                </label>
                                                <input 
                                                    type="number"
                                                    value={newQ.type === 'numerical' ? newQ.range.min : newQ.scoringRubric.partial}
                                                    onChange={e=>{
                                                        if(newQ.type === 'numerical') {
                                                            setNewQ({...newQ, range: {...newQ.range, min: Number(e.target.value), max: Number(e.target.value)}});
                                                        } else {
                                                            setNewQ({...newQ, scoringRubric: {...newQ.scoringRubric, partial: Number(e.target.value)}});
                                                        }
                                                    }}
                                                    className="w-full px-[16px] py-[10px] bg-[#111827] border border-[#1F2937] rounded-[8px] text-[14px] text-[#A78BFA] focus:border-[#7C3AED]/50 focus:outline-none transition-all font-mono"
                                                />
                                            </div>
                                        )}
                                        {newQ.type === 'range' && (
                                            <>
                                                <div className="flex flex-col gap-[8px]">
                                                    <label className="text-[12px] font-medium text-[#7C3AED] uppercase tracking-widest px-[4px]">Min Value</label>
                                                    <input 
                                                        type="number"
                                                        value={newQ.range.min}
                                                        onChange={e=>setNewQ({...newQ, range: {...newQ.range, min: Number(e.target.value)}})}
                                                        className="w-full px-[16px] py-[10px] bg-[#111827] border border-[#1F2937] rounded-[8px] text-[14px] text-[#A78BFA] focus:border-[#7C3AED]/50 focus:outline-none transition-all font-mono"
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-[8px]">
                                                    <label className="text-[12px] font-medium text-[#7C3AED] uppercase tracking-widest px-[4px]">Max Value</label>
                                                    <input 
                                                        type="number"
                                                        value={newQ.range.max}
                                                        onChange={e=>setNewQ({...newQ, range: {...newQ.range, max: Number(e.target.value)}})}
                                                        className="w-full px-[16px] py-[10px] bg-[#111827] border border-[#1F2937] rounded-[8px] text-[14px] text-[#A78BFA] focus:border-[#7C3AED]/50 focus:outline-none transition-all font-mono"
                                                    />
                                                </div>
                                            </>
                                        )}
                                        <div className="flex flex-col gap-[8px]">
                                            <label className="text-[12px] font-medium text-red-400 uppercase tracking-widest px-[4px]">Penalty (-)</label>
                                            <input 
                                                type="number"
                                                value={newQ.scoringRubric.incorrect}
                                                onChange={e=>setNewQ({...newQ, scoringRubric: {...newQ.scoringRubric, incorrect: Number(e.target.value)}})}
                                                className="w-full px-[16px] py-[10px] bg-[#111827] border border-[#1F2937] rounded-[8px] text-[14px] text-red-400 focus:border-red-500/50 focus:outline-none transition-all font-mono"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-[8px]">
                                        <label className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-widest px-[4px]">Simulation Script</label>
                                        <textarea 
                                            value={newQ.question}
                                            onChange={e=>setNewQ({...newQ, question: e.target.value})}
                                            className="w-full px-[16px] py-[12px] bg-[#111827] border border-[#1F2937] rounded-[8px] text-[14px] text-[#F9FAFB] min-h-[100px] focus:border-[#7C3AED] focus:outline-none transition-all"
                                            placeholder="Define the tactical objective..."
                                            required
                                        />
                                    </div>

                                    {newQ.type === 'range' ? (
                                        <div className="grid grid-cols-2 gap-[16px]">
                                            <div className="flex flex-col gap-[8px]">
                                                <label className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-widest px-[4px]">Minimum Bound</label>
                                                <input 
                                                    type="number"
                                                    value={newQ.range.min}
                                                    onChange={e=>setNewQ({...newQ, range: {...newQ.range, min: Number(e.target.value)}})}
                                                    className="w-full px-[16px] py-[12px] bg-[#111827] border border-[#1F2937] rounded-[8px] text-[14px] text-[#F9FAFB] focus:border-[#7C3AED] focus:outline-none transition-all font-mono"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-[8px]">
                                                <label className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-widest px-[4px]">Maximum Bound</label>
                                                <input 
                                                    type="number"
                                                    value={newQ.range.max}
                                                    onChange={e=>setNewQ({...newQ, range: {...newQ.range, max: Number(e.target.value)}})}
                                                    className="w-full px-[16px] py-[12px] bg-[#111827] border border-[#1F2937] rounded-[8px] text-[14px] text-[#F9FAFB] focus:border-[#7C3AED] focus:outline-none transition-all font-mono"
                                                />
                                            </div>
                                        </div>
                                    ) : newQ.type === 'truefalse' ? (
                                        <div className="flex items-center gap-[24px] p-[24px] bg-[#111827] border border-[#1F2937] rounded-[12px]">
                                            <div className="flex-1">
                                                <h4 className="text-[14px] font-semibold text-[#F9FAFB]">Binary Resolution</h4>
                                                <p className="text-[12px] text-[#9CA3AF]">Select the correct state for this tactical condition.</p>
                                            </div>
                                            <div className="flex gap-[12px]">
                                                {['A', 'B'].map((optId) => (
                                                    <button
                                                        key={optId}
                                                        type="button"
                                                        onClick={() => setNewQ({...newQ, correctAnswer: optId})}
                                                        className={`px-[24px] py-[12px] rounded-[8px] text-[14px] font-bold tracking-widest transition-all ${
                                                            newQ.correctAnswer === optId 
                                                            ? 'bg-[#7C3AED] text-white shadow-glow' 
                                                            : 'bg-[#0B0F14] text-[#9CA3AF] border border-[#1F2937] hover:border-[#7C3AED]/30'
                                                        }`}
                                                    >
                                                        {optId === 'A' ? 'TRUE' : 'FALSE'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
                                            {newQ.options.map((opt, i) => {
                                                const isCorrect = newQ.type === 'multi-select' 
                                                    ? newQ.correctAnswers.includes(opt.optionId)
                                                    : newQ.correctAnswer === opt.optionId;

                                                return (
                                                    <div key={i} className="flex flex-col gap-[8px]">
                                                        <div className="flex items-center justify-between px-[4px] mb-[2px]">
                                                            <label className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-widest">Op-Code {opt.optionId}</label>
                                                            <button 
                                                                type="button"
                                                                onClick={() => {
                                                                    if (newQ.type === 'multi-select') {
                                                                        const cur = [...newQ.correctAnswers];
                                                                        if (cur.includes(opt.optionId)) {
                                                                            setNewQ({...newQ, correctAnswers: cur.filter(x => x !== opt.optionId)});
                                                                        } else {
                                                                            setNewQ({...newQ, correctAnswers: [...cur, opt.optionId]});
                                                                        }
                                                                    } else {
                                                                        setNewQ({...newQ, correctAnswer: opt.optionId});
                                                                    }
                                                                }}
                                                                className={`text-[18px] font-bold transition-all hover:scale-110 ${isCorrect ? 'text-emerald-400' : 'text-[#4B5563]'}`}
                                                            >
                                                                {isCorrect ? <FiCheckCircle /> : <FiCircle />}
                                                            </button>
                                                        </div>
                                                        <input 
                                                            type="text"
                                                            value={opt.text}
                                                            onChange={e => {
                                                                const opts = [...newQ.options];
                                                                opts[i].text = e.target.value;
                                                                setNewQ({...newQ, options: opts});
                                                            }}
                                                            className={`w-full px-[16px] py-[10px] bg-[#111827] border rounded-[8px] text-[14px] text-[#F9FAFB] focus:outline-none transition-all ${
                                                                isCorrect ? 'border-emerald-400/30 bg-emerald-400/5' : 'border-[#1F2937]'
                                                            }`}
                                                            placeholder={`Protocol ${opt.optionId} sequence...`}
                                                            required={i < 2 || newQ.type === 'mcq'}
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    <Button type="submit" className="w-full h-[56px] mt-[8px]">
                                        <FiZap size={20} className="mr-[8px]" />
                                        <span className="text-[16px] uppercase tracking-wider">{editingQId ? 'Update Operational Sequence' : 'Commit Tactical Scenario'}</span>
                                    </Button>
                                </form>
                            </div>
                        )}

                        {/* List of Questions */}
                        <div className="flex flex-col gap-[16px]">
                            {questions.filter(q => q.year === tabYear && q.role === activeRoleFilter).length === 0 ? (
                                <div className="py-[48px] text-center text-[#9CA3AF] text-[14px] border border-dashed border-[#1F2937] rounded-[12px]">
                                    No scenarios configured for {activeRoleFilter === 'fun' ? 'ALL PARTICIPANTS' : activeRoleFilter.toUpperCase()} in this phase.
                                </div>
                            ) : (
                                questions.filter(q => q.year === tabYear && q.role === activeRoleFilter).map((q, i) => (
                                    <div key={i} className="p-[24px] bg-[#111827] rounded-[12px] border border-[#1F2937] flex flex-col md:flex-row items-start justify-between gap-[24px] group hover:bg-[#1F2937]/50 hover:border-[#7C3AED]/30 transition-all duration-300">
                                        <div className="flex-1 w-full">
                                            <div className="flex items-center gap-[12px] mb-[16px]">
                                                <span className="bg-[#7C3AED]/10 text-[#7C3AED] px-[12px] py-[4px] rounded-[4px] text-[10px] font-bold uppercase tracking-wider border border-[#7C3AED]/20">
                                                    {q.role === 'fun' ? 'All Participants' : q.role}
                                                </span>
                                                <span className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-widest flex items-center">
                                                    <FiAward className="mr-[8px] text-[#7C3AED]" size={14} /> {q.scoringRubric?.full || 0} Units
                                                </span>
                                            </div>
                                            <p className="text-[18px] font-semibold text-[#F9FAFB] leading-tight mb-[20px] transition-colors">{q.question}</p>
                                            <div className="flex flex-wrap gap-[12px]">
                                                {['range', 'numerical'].includes(q.type) ? (
                                                    <div className="px-[12px] py-[6px] rounded-[4px] text-[12px] font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-[8px]">
                                                        <FiCheckCircle size={14} />
                                                        {q.type === 'range' ? `Correct Range: ${q.acceptableRange?.min || 0} - ${q.acceptableRange?.max || 0}` : `Correct Value: ${q.correctAnswer || q.acceptableRange?.min || 0}`}
                                                    </div>
                                                ) : q.type === 'truefalse' ? (
                                                    <div className="flex gap-[12px]">
                                                        {['A', 'B'].map((optId) => {
                                                            const isCorrect = q.correctAnswer === optId;
                                                            return (
                                                                <div key={optId} className={`px-[12px] py-[6px] rounded-[4px] text-[12px] font-medium flex items-center border transition-all ${
                                                                    isCorrect 
                                                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold' 
                                                                    : 'bg-white/5 border-[#1F2937] text-[#9CA3AF] opacity-60'
                                                                }`}>
                                                                    {isCorrect && <FiCheckCircle size={14} className="mr-[8px]" />}
                                                                    {optId === 'A' ? 'TRUE' : 'FALSE'}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : q.options?.map((o, idx) => {
                                                    const isCorrect = q.type === 'multi-select' 
                                                        ? (Array.isArray(q.correctAnswer) ? q.correctAnswer.includes(o.optionId) : (q.correctAnswers || []).includes(o.optionId))
                                                        : o.optionId === q.correctAnswer;

                                                    return (
                                                        <div key={idx} className={`px-[12px] py-[6px] rounded-[4px] text-[12px] font-medium flex items-center border transition-all ${
                                                            isCorrect 
                                                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold' 
                                                            : 'bg-white/5 border-[#1F2937] text-[#9CA3AF] opacity-60'
                                                        }`}>
                                                            {isCorrect && <FiCheckCircle size={14} className="mr-[8px]" />}
                                                            <span className="mr-[8px] opacity-40 font-mono">{o.optionId}</span>
                                                            {o.text}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-[8px] opacity-0 group-hover:opacity-100 transition-all duration-300">
                                            <button 
                                                onClick={() => handleEditClick(q)}
                                                className="p-[12px] rounded-[8px] bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white transition-all border border-brand-primary/20"
                                                title="Edit Scenario"
                                            >
                                                <FiTarget size={18} />
                                            </button>
                                            <button 
                                                onClick={async () => {
                                                    if(window.confirm('IRREVERSIBLE: Eliminate this scenario from operational clusters?')) {
                                                        await adminAPI.deleteQuestion(q._id);
                                                        const res = await adminAPI.getQuestions();
                                                        setQuestions(res.data);
                                                        setMsg({type:'success', text: 'Scenario successfully eliminated.'});
                                                    }
                                                }}
                                                className="p-[12px] rounded-[8px] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                                                title="Delete Scenario"
                                            >
                                                <FiTrash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>
                </div>
                );
            })()}

            {activeTab === 'profile' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-[32px] animate-in fade-in duration-500">
                     <Card className="p-[48px] text-center w-full flex flex-col items-center relative overflow-hidden h-fit">
                        <div className="w-[120px] h-[120px] bg-[#1F2937] rounded-[24px] border border-[#1F2937] flex items-center justify-center mb-[32px] text-[#F9FAFB] transform transition-transform duration-500">
                            <FiUser size={64} />
                        </div>
                        
                        <h2 className="text-[32px] font-semibold text-[#F9FAFB] tracking-tight">{useGameStore.getState().userId || 'Root Admin'}</h2>
                        <p className="text-[#9CA3AF] font-medium uppercase tracking-[0.2em] text-[14px] mb-[48px] mt-[12px]">Authorization Valid</p>

                        <div className="flex gap-[16px]">
                            <button 
                                onClick={handleLogout}
                                className="px-[32px] py-[12px] bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-[8px] text-[14px] font-bold uppercase tracking-widest transition-all border border-red-500/20 shadow-glow-sm"
                            >
                                Logout
                            </button>
                        </div>
                     </Card>

                     <Card className="text-left w-full flex flex-col relative overflow-hidden h-fit">
                        <div className="w-full mb-[24px]">
                            <h3 className="text-[20px] font-semibold text-[#F9FAFB] mb-[4px]">Create Sub-Administrator</h3>
                            <p className="text-[14px] text-[#9CA3AF]">Provision new administrative access tokens.</p>
                        </div>
                        <form onSubmit={handleCreateAdmin} className="w-full flex flex-col gap-[16px]">
                            <div className="flex flex-col gap-[8px]">
                                <label className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-widest">Admin Team/User ID</label>
                                <input 
                                    type="text"
                                    value={newAdmin.teamId}
                                    onChange={e=>setNewAdmin({...newAdmin, teamId: e.target.value})}
                                    placeholder="ADMIN-002"
                                    className="w-full px-[16px] py-[12px] bg-[#111827] border border-[#1F2937] rounded-[8px] text-[14px] text-[#F9FAFB] focus:border-[#7C3AED] focus:outline-none transition-all"
                                    required
                                />
                            </div>
                            <div className="flex flex-col gap-[8px]">
                                <label className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-widest">Admin Alias Name</label>
                                <input 
                                    type="text"
                                    value={newAdmin.teamName}
                                    onChange={e=>setNewAdmin({...newAdmin, teamName: e.target.value})}
                                    placeholder="Event Coordinator"
                                    className="w-full px-[16px] py-[12px] bg-[#111827] border border-[#1F2937] rounded-[8px] text-[14px] text-[#F9FAFB] focus:border-[#7C3AED] focus:outline-none transition-all"
                                    required
                                />
                            </div>
                            <div className="flex flex-col gap-[8px]">
                                <label className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-widest">Access Password</label>
                                <input 
                                    type="password"
                                    value={newAdmin.password}
                                    onChange={e=>setNewAdmin({...newAdmin, password: e.target.value})}
                                    placeholder="••••••••"
                                    className="w-full px-[16px] py-[12px] bg-[#111827] border border-[#1F2937] rounded-[8px] text-[14px] text-[#F9FAFB] focus:border-[#7C3AED] focus:outline-none transition-all"
                                    required
                                />
                            </div>
                             <Button type="submit" className="w-full mt-[8px]">
                                 Provision Root Access
                             </Button>
                         </form>
                     </Card>

                     {/* Reset Competition Card */}
                     <Card className="text-left w-full flex flex-col relative overflow-hidden h-fit border-red-500/20 md:col-span-2">
                        <div className="w-full mb-[24px]">
                            <h3 className="text-[20px] font-semibold text-red-500 mb-[4px] flex items-center">
                                <FiAlertCircle className="mr-8" /> Danger Zone
                            </h3>
                            <p className="text-[14px] text-[#9CA3AF]">Reset the entire competition back to Round 1. This wipes all progress but keeps teams and questions.</p>
                        </div>
                        <button 
                            onClick={() => handleReset('partial')}
                            className="w-full px-[32px] py-[16px] bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-[8px] text-[16px] font-bold uppercase tracking-widest transition-all border border-red-500/20 shadow-glow-sm flex justify-center items-center gap-12"
                        >
                            <FiActivity size={20} /> Reset Competition
                        </button>
                     </Card>
                </div>
            )}

            {activeTab === 'register' && (
                <div className="max-w-[1000px] mx-auto animate-in fade-in duration-500">
                    <div className="mb-[32px] flex justify-between items-end">
                        <div>
                            <h2 className="text-[32px] font-semibold text-[#F9FAFB] tracking-tight">Provision Units</h2>
                            <p className="text-[14px] text-[#9CA3AF] mt-[4px]">Register a new unit or view existing deployment credentials.</p>
                        </div>
                        <Button 
                            variant="primary" 
                            onClick={() => setCreatedTeamId(null)}
                            className="h-40 px-16 text-12 mb-4"
                        >
                            <FiPlus className="mr-8" /> REGISTER NEW
                        </Button>
                    </div>

                    {!createdTeamId ? (
                        <div className="flex flex-col gap-32">
                            {/* REGISTER NEW TEAM FORM */}
                            <Card className="p-[40px]">
                                <form onSubmit={async (e) => {
                                    e.preventDefault();
                                    try {
                                        const res = await adminAPI.registerTeam(newTeam);
                                        setCreatedTeamId(res.data.teamId);
                                        setMsg({ type: 'success', text: `Unit Registered. TEAM ID: ${res.data.teamId}` });
                                        // Refresh teams list
                                        const tms = await adminAPI.getTeams();
                                        setTeams(tms.data.teams || []);
                                    } catch (err) {
                                        setMsg({ type: 'error', text: err.response?.data?.error || 'Registration failed.' });
                                    }
                                }} className="flex flex-col gap-[32px]">
                                    <div className="flex flex-col gap-[8px]">
                                        <label className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-widest px-[4px]">Team Identity</label>
                                        <input 
                                            type="text"
                                            placeholder="Enter Team Name"
                                            value={newTeam.teamName}
                                            onChange={e => setNewTeam({...newTeam, teamName: e.target.value})}
                                            className="w-full px-[16px] py-[12px] bg-[#111827] border border-[#1F2937] rounded-[8px] text-[14px] text-[#F9FAFB] focus:border-[#7C3AED] focus:outline-none transition-all"
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-[24px]">
                                        {newTeam.members.map((member, idx) => (
                                            <div key={idx} className="flex flex-col gap-[16px] p-[20px] bg-[#111827] rounded-[12px] border border-[#1F2937]">
                                                <span className="text-[12px] font-bold text-[#7C3AED] uppercase tracking-widest">{member.role}</span>
                                                <div className="flex flex-col gap-[8px]">
                                                    <label className="text-[10px] font-medium text-[#9CA3AF] uppercase">Name</label>
                                                    <input 
                                                        type="text"
                                                        placeholder="Operator Name"
                                                        value={member.name}
                                                        onChange={e => {
                                                            const m = [...newTeam.members];
                                                            m[idx].name = e.target.value;
                                                            setNewTeam({...newTeam, members: m});
                                                        }}
                                                        className="w-full px-[12px] py-[8px] bg-[#0B0F14] border border-[#1F2937] rounded-[6px] text-[13px] text-[#F9FAFB] focus:border-[#7C3AED] focus:outline-none transition-all"
                                                        required
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-[8px]">
                                                    <label className="text-[10px] font-medium text-[#9CA3AF] uppercase">Password</label>
                                                    <div className="relative">
                                                        <input 
                                                            type="text"
                                                            placeholder="••••••••"
                                                            value={member.password}
                                                            onChange={e => {
                                                                const m = [...newTeam.members];
                                                                m[idx].password = e.target.value;
                                                                setNewTeam({...newTeam, members: m});
                                                            }}
                                                            className="w-full px-[12px] py-[8px] bg-[#0B0F14] border border-[#1F2937] rounded-[6px] text-[13px] text-[#F9FAFB] focus:border-[#7C3AED] focus:outline-none transition-all"
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <Button type="submit" className="w-full h-[56px] mt-[16px]">
                                        <FiPlus size={20} className="mr-[8px]" />
                                        <span className="text-[16px] uppercase tracking-wider">Initialize Team Deployment</span>
                                    </Button>
                                </form>
                            </Card>

                            {/* REGISTERED TEAMS LIST WITH PASSWORDS */}
                            <Card className="p-0 overflow-hidden border-[#1F2937]">
                                <div className="px-24 py-16 bg-[#111827] border-b border-[#1F2937] flex items-center justify-between">
                                    <h3 className="text-16 font-bold text-[#F9FAFB] uppercase tracking-wider">Deployment Registry</h3>
                                    <span className="text-12 text-[#9CA3AF] font-medium">{teams.length} Teams Online</span>
                                </div>
                                <div className="overflow-x-auto max-h-[600px] overflow-y-auto hidden-scrollbar">
                                    <table className="w-full text-left">
                                        <thead className="bg-[#0F172A] border-b border-[#1F2937] sticky top-0 z-10">
                                            <tr>
                                                <th className="px-16 py-12 text-10 font-bold text-[#9CA3AF] uppercase tracking-widest">Team ID</th>
                                                <th className="px-16 py-12 text-10 font-bold text-[#9CA3AF] uppercase tracking-widest">Team Name</th>
                                                <th className="px-16 py-12 text-10 font-bold text-[#9CA3AF] uppercase tracking-widest">Operator (Role)</th>
                                                <th className="px-16 py-12 text-10 font-bold text-[#9CA3AF] uppercase tracking-widest border-l border-[#1F2937]">Password</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#1F2937]">
                                            {teams.map((team, tIdx) => (
                                                <React.Fragment key={team._id}>
                                                    {team.members.map((member, mIdx) => (
                                                        <tr key={`${team._id}-${mIdx}`} className={`hover:bg-white/[0.02] transition-colors ${mIdx === 0 ? 'bg-white/[0.01]' : ''}`}>
                                                            {mIdx === 0 ? (
                                                                <td className="px-16 py-12 align-top" rowSpan={3}>
                                                                    <span className="font-mono text-14 text-[#7C3AED] font-bold">{team.teamId}</span>
                                                                </td>
                                                            ) : null}
                                                            {mIdx === 0 ? (
                                                                <td className="px-16 py-12 align-top" rowSpan={3}>
                                                                    <span className="text-14 font-semibold text-[#F9FAFB]">{team.teamName}</span>
                                                                </td>
                                                            ) : null}
                                                            <td className="px-16 py-12">
                                                                <div className="flex items-center gap-8">
                                                                    <span className="text-13 text-[#D1D5DB]">{member.name}</span>
                                                                    <span className="text-9 font-bold text-[#7C3AED] bg-[#7C3AED]/10 px-6 py-2 rounded border border-[#7C3AED]/20 uppercase">{member.role}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-16 py-12 border-l border-[#1F2937]">
                                                                <input 
                                                                    type="text"
                                                                    value={member.password}
                                                                    readOnly
                                                                    className="w-full bg-[#0B0F14] border border-[#1F2937] rounded-[4px] px-[8px] py-[4px] text-[12px] font-mono text-emerald-400 font-bold opacity-70 cursor-default focus:outline-none"
                                                                />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </React.Fragment>
                                            ))}
                                            {teams.length === 0 && (
                                                <tr>
                                                    <td colSpan="4" className="px-16 py-48 text-center text-[#4B5563] italic">
                                                        No teams registered in the command cluster yet.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </div>
                    ) : (
                        <Card className="p-[48px] text-center border-emerald-500/20 bg-emerald-500/5">
                            <div className="w-[80px] h-[80px] bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-[24px]">
                                <FiCheckCircle className="text-emerald-500" size={40} />
                            </div>
                            <h3 className="text-[24px] font-semibold text-[#F9FAFB] mb-[8px]">Team Successfully Provisioned</h3>
                            <p className="text-[#9CA3AF] mb-[32px]">Direct the team to use the following signature for all deployments:</p>
                            
                            <div className="bg-[#0B0F14] border border-[#1F2937] p-[24px] rounded-[16px] mb-[32px]">
                                <span className="text-[12px] font-medium text-[#7C3AED] uppercase tracking-[0.2em] block mb-[8px]">Primary Deployment ID</span>
                                <span className="text-[36px] font-mono font-bold text-[#F9FAFB] tracking-tighter">{createdTeamId}</span>
                            </div>

                            <Button 
                                variant="secondary"
                                onClick={() => {
                                    setCreatedTeamId(null);
                                    setNewTeam({
                                        teamName: '',
                                        members: [
                                          { name: '', role: 'cto', password: '' },
                                          { name: '', role: 'cfo', password: '' },
                                          { name: '', role: 'pm', password: '' }
                                        ]
                                    });
                                }}
                            >
                                Register Another Team
                            </Button>
                        </Card>
                    )}
                </div>

            )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
