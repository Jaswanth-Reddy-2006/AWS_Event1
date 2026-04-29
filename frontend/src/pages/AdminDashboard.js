import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import Leaderboard from '../components/Leaderboard';
import FunLeaderboard from '../components/FunLeaderboard';
import LightRays from '../components/LightRays';
import Button from '../components/Button';
import Card from '../components/Card';
import { adminAPI } from '../utils/api';
import { useGameStore } from '../utils/store';
import {
    FiUsers,
    FiActivity,
    FiShield,
    FiPlus,
    FiTrash2,
    FiPlay,
    FiStopCircle,
    FiX,
    FiCheckCircle,
    FiAlertCircle,
    FiEye,
    FiEyeOff,
    FiLock,
    FiTrendingUp,
    FiUser,
    FiHome,
    FiTarget,
    FiCloud,
    FiZap,
    FiCircle,
    FiAward,
    FiPlusSquare,
    FiCopy,
    FiRadio,
    FiSend,
    FiRefreshCw,
    FiChevronRight,
    FiChevronLeft,
    FiSkipForward,
} from 'react-icons/fi';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { tab } = useParams();
  const activeTab = tab || 'dashboard';
  const { setLogout } = useGameStore();
  const [leaderboardMode, setLeaderboardMode] = useState('standard');
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [isFullScreenLeaderboard, setIsFullScreenLeaderboard] = useState(false);
  const [filteredRound, setFilteredRound] = useState(null);

  const togglePasswordVisibility = (key) => { // eslint-disable-line no-unused-vars
    setVisiblePasswords(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const copyToClipboard = (text, label = 'Operational Key') => {
    navigator.clipboard.writeText(text);
    setMsg({ type: 'success', text: `${label} copied to terminal clipboard.` });
    setTimeout(() => setMsg({ type: '', text: '' }), 3000);
  };


  const menuItems = [
    { id: 'dashboard', label: 'Participants Hub', icon: <FiHome /> },
    { id: 'leaderboard', label: 'Ranking', icon: <FiAward /> },
    { id: 'r1', label: 'Round 1', icon: <FiTarget />, year: 0 },
    { id: 'r2', label: 'Round 2', icon: <FiTarget />, year: 1 },
    { id: 'r3', label: 'Round 3', icon: <FiTarget />, year: 2 },
    { id: 'r4', label: 'Round 4', icon: <FiTarget />, year: 3 },
    { id: 'r5', label: 'Round 5', icon: <FiTarget />, year: 4 },
    { id: 'r6', label: 'Fun Round 1', icon: <FiZap />, year: 5, isFun: true },
    { id: 'r7', label: 'Fun Round 2', icon: <FiZap />, year: 6, isFun: true },
    { id: 'r8', label: 'Fun Round 3', icon: <FiZap />, year: 7, isFun: true },
    { id: 'r9', label: 'Fun Round 4', icon: <FiZap />, year: 8, isFun: true },
  ];


  const [settings, setSettings] = useState(null);
  const [teams, setTeams] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [roundStats, setRoundStats] = useState({
    totalTeams: 0,
    totalParticipants: 0,
    onlinePeople: 0,
    ctoCompleted: 0,
    cfoCompleted: 0,
    pmCompleted: 0,
    teamsFullyCompleted: 0
  });

  const fetchRoundStats = async () => {
    try {
      const res = await adminAPI.getRoundStats();
      setRoundStats(res.data);
    } catch (err) {
      console.error('Failed to fetch round stats:', err);
    }
  };
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [editingQId, setEditingQId] = useState(null);
  const [activeRoleFilter, setActiveRoleFilter] = useState('cto'); 
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [roundTimeLeft, setRoundTimeLeft] = useState(null); // seconds remaining
  const [showInitBanner, setShowInitBanner] = useState(false); // eslint-disable-line no-unused-vars
  const timerRef = useRef(null);
  const [activeQuestionStats, setActiveQuestionStats] = useState({ answeredCount: 0, totalTeams: 0 });
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastType, setBroadcastType] = useState('info');
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastHistory, setBroadcastHistory] = useState([]);
  const [showBroadcastPanel, setShowBroadcastPanel] = useState(false);
  const [roundSubs, setRoundSubs] = useState(null);

  useEffect(() => {
    let interval;
    const isFunTabActive = menuItems.find(m => m.id === activeTab)?.isFun;
    if (isFunTabActive && settings?.isRoundActive) {
      fetchActiveQuestionStats();
      interval = setInterval(fetchActiveQuestionStats, 2000);
    }
    return () => clearInterval(interval);
  }, [activeTab, settings?.isRoundActive, settings?.activeFunQuestionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchActiveQuestionStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/admin/active-question-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActiveQuestionStats(res.data);
    } catch (err) {
      console.error('Stats fetch error:', err);
    }
  };

  const fetchBroadcasts = async () => {
    try {
      const res = await adminAPI.getBroadcasts();
      setBroadcastHistory(res.data.broadcasts || []);
    } catch {}
  };

  useEffect(() => {
    fetchBroadcasts();
  }, []);

  const handleSendBroadcast = async () => {
    if (!broadcastMsg.trim()) return;
    setBroadcastSending(true);
    try {
      await adminAPI.broadcast(broadcastMsg.trim(), broadcastType);
      setMsg({ type: 'success', text: 'Broadcast sent to all teams.' });
      setBroadcastMsg('');
      fetchBroadcasts();
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to send broadcast.' });
    } finally {
      setBroadcastSending(false);
    }
  };

  const handleClearBroadcasts = async () => {
    try {
      await adminAPI.clearBroadcasts();
      setBroadcastHistory([]);
      setMsg({ type: 'success', text: 'Broadcast history cleared.' });
    } catch {
      setMsg({ type: 'error', text: 'Failed to clear broadcasts.' });
    }
  };

  const [showRegistryPasswords, setShowRegistryPasswords] = useState(true);
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
    domain: '',
    population: 100,
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
        fetchRoundStats();
        setLoading(false);
      } catch (err) {
        console.error('Data Load Error:', err);
        setLoading(false);
      }
    };
    loadAll();
    const interval = setInterval(loadAll, 3000); // Increased polling for telemetry
    return () => clearInterval(interval);
  }, []);

  // Countdown timer effect — recalculates every second from roundStartedAt
  // Auto-stops round when timer hits 0
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (settings?.isRoundActive && settings?.roundStartedAt) {
      const computeLeft = () => {
        const deadline = new Date(settings.roundStartedAt).getTime() + 20 * 60 * 1000;
        const left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
        setRoundTimeLeft(left);
        if (left <= 0) {
          clearInterval(timerRef.current);
          handleStartStopRound(false, settings.currentRound);
        }
      };
      computeLeft();
      timerRef.current = setInterval(computeLeft, 1000);
    } else {
      setRoundTimeLeft(null);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.isRoundActive, settings?.roundStartedAt]);

  // Poll submission stats when round is active
  useEffect(() => {
    let subInterval;
    if (settings?.isRoundActive && settings?.currentRound !== undefined) {
      const fetchSubs = async () => {
        try {
          const res = await adminAPI.getRoundSubmissions(settings.currentRound);
          setRoundSubs(res.data);
        } catch (e) { /* ignore */ }
      };
      fetchSubs();
      subInterval = setInterval(fetchSubs, 4000);
    } else {
      setRoundSubs(null);
    }
    return () => { if (subInterval) clearInterval(subInterval); };
  }, [settings?.isRoundActive, settings?.currentRound]);

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

  const handleStartStopRound = async (start, overrideYear = null) => {
    const targetYear = overrideYear !== null ? overrideYear : Number(menuItems.find(m => m.id === activeTab)?.year);

    if (start) {
        if (isNaN(targetYear)) {
            setMsg({ type: 'error', text: 'Please navigate to a round tab first.' });
            return;
        }
    }

    try {
      const payload = {
        currentRound: targetYear,
        isRoundActive: start
      };

      if (start) {
          payload.activeFunQuestionId = null;
      }

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
      setMsg({ type: 'success', text: `${targetYear >= 5 ? `Fun Round ${targetYear - 4}` : `Round ${targetYear + 1}`} is now ${start ? 'LIVE — 20 min timer started' : 'STANDBY'}.` });
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
        assetUrl: q.assetUrl || '',
        options: q.type === 'range' || q.type === 'text' || q.type === 'shorttext' ? [
            { optionId: 'A', text: '', value: 'A' },
            { optionId: 'B', text: '', value: 'B' },
            { optionId: 'C', text: '', value: 'C' },
            { optionId: 'D', text: '', value: 'D' }
        ] : q.options.length < 4 ? [...q.options, ...Array(4 - q.options.length).fill(null).map((_, i) => ({ optionId: String.fromCharCode(65 + q.options.length + i), text: '', value: String.fromCharCode(65 + q.options.length + i) }))] : q.options,
        correctAnswer: q.correctAnswer || 'A',
        correctAnswers: q.type === 'multi-select' ? (Array.isArray(q.correctAnswer) ? q.correctAnswer : []) : [],
        range: q.type === 'range' ? q.acceptableRange || { min: 1, max: 10 } : { min: 1, max: 10 },
        scoringRubric: q.scoringRubric || { full: 10, partial: 5, incorrect: -5 }
    });
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    const tabItem = menuItems.find(m => m.id === activeTab);
    const year = tabItem?.year || 0;
    
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
            scenario: 'AWS Operational Event',
            assetUrl: newQ.assetUrl // Added for Fun Rounds
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
            scoringRubric: { full: 10, partial: 5, incorrect: -5 },
            assetUrl: ''
        });
        setIsAddingQuestion(false);
        setEditingQId(null);
    } catch (err) {
        setMsg({ type: 'error', text: `ERROR: ${err.response?.data?.error || 'Validation failure'}` });
    }
  };

  const handleActivateFunQuestion = async (qId) => {
    // Allow activating if we are in a Fun Round (Year 5-9) or if competition hasn't started
    const isCompetitionStarted = settings && settings.currentRound > 0;
    const currentTabItem = menuItems.find(m => m.id === activeTab);
    const isFunRound = currentTabItem?.isFun;

    if (isCompetitionStarted && !isFunRound) {
      setMsg({ type: 'error', text: 'Fun Questions can only be activated during Experimental Rounds or before Round 1.' });
      return;
    }

    try {
      await adminAPI.updateSettings({
        activeFunQuestionId: qId
      });
      setMsg({ type: 'success', text: 'Fun question broadcasted to all units.' });
    } catch (err) {
      setMsg({ type: 'error', text: 'Broadcast uplink failed.' });
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
        fetchRoundStats();
      
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


            <button
                onClick={() => navigate('/admin/fun-leaderboard')}
                className={`w-full flex items-center gap-[12px] px-[16px] py-[12px] rounded-[8px] transition-all duration-200 text-[14px] font-medium mt-[8px] ${
                    activeTab === 'fun-leaderboard' 
                    ? 'bg-yellow-500/10 text-yellow-500 shadow-glow-sm border border-yellow-500/20' 
                    : 'text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-white/5'
                }`}
            >
                <FiTrendingUp className="text-yellow-500" size={18} />
                <span>Fun Rankings</span>
            </button>

            <button
                onClick={() => navigate('/admin/register')}
                className={`w-full flex items-center gap-[12px] px-[16px] py-[12px] rounded-[8px] transition-all duration-200 text-[14px] font-medium mt-[8px] ${
                    activeTab === 'register' 
                    ? 'bg-[#10B981]/10 text-[#10B981] shadow-glow-sm border border-[#10B981]/20' 
                    : 'text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-white/5'
                }`}
            >
                <FiPlus size={18} />
                <span>Provision Units</span>
            </button>

            <button
                onClick={() => { setShowBroadcastPanel(!showBroadcastPanel); }}
                className={`w-full flex items-center gap-[12px] px-[16px] py-[12px] rounded-[8px] transition-all duration-200 text-[14px] font-medium mt-[8px] ${
                    showBroadcastPanel
                    ? 'bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20'
                    : 'text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-white/5'
                }`}
            >
                <FiRadio size={18} />
                <span>Broadcast</span>
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
        {/* ── Live Round Panel ── */}
        {settings?.isRoundActive && roundTimeLeft !== null && (
            <div className={`mb-[24px] rounded-[14px] border overflow-hidden ${
                roundTimeLeft < 300 ? 'border-red-500/40 bg-red-500/5' : 'border-[#7C3AED]/30 bg-[#7C3AED]/5'
            }`}>
                {/* Timer row */}
                <div className="px-[20px] py-[14px] flex items-center justify-between">
                    <div className="flex items-center gap-[12px]">
                        <div className={`w-[10px] h-[10px] rounded-full animate-pulse ${roundTimeLeft < 300 ? 'bg-red-500' : 'bg-[#7C3AED]'}`} />
                        <span className="text-[14px] font-bold text-[#F9FAFB]">
                            {(settings?.currentRound || 0) >= 5 ? `Fun Round ${(settings?.currentRound || 0) - 4}` : `Round ${(settings?.currentRound || 0) + 1}`} — LIVE
                        </span>
                        <span className={`text-[18px] font-bold tabular-nums ml-[8px] ${
                            roundTimeLeft < 60 ? 'text-red-400 animate-pulse' : roundTimeLeft < 300 ? 'text-red-400' : 'text-[#F9FAFB]'
                        }`}>
                            {Math.floor(roundTimeLeft / 60)}:{String(roundTimeLeft % 60).padStart(2, '0')}
                        </span>
                    </div>
                    {roundSubs?.allTeamsComplete && (
                        <button
                            onClick={() => handleStartStopRound(false, settings.currentRound)}
                            className="px-[16px] py-[8px] bg-red-500 hover:bg-red-600 text-white text-[12px] font-bold uppercase tracking-wider rounded-[8px] transition-all flex items-center gap-[6px]"
                        >
                            <FiX size={14} /> Close Round Early
                        </button>
                    )}
                </div>

                {/* Submission stats row */}
                {roundSubs && (
                    <div className="px-[20px] py-[12px] border-t border-[#1F2937] bg-[#0B0F14]/50 flex flex-wrap items-center gap-[16px]">
                        <div className="flex items-center gap-[6px]">
                            <span className="text-[11px] text-[#6B7280] font-medium">Teams:</span>
                            <span className="text-[13px] font-bold text-[#F9FAFB]">{roundSubs.totalTeams}</span>
                        </div>
                        <div className="h-[14px] w-[1px] bg-[#1F2937]" />
                        {[
                            { label: 'CTO', count: roundSubs.ctoSubmitted, color: '#7C3AED' },
                            { label: 'CFO', count: roundSubs.cfoSubmitted, color: '#f59e0b' },
                            { label: 'PM', count: roundSubs.pmSubmitted, color: '#10b981' },
                        ].map(({ label, count, color }) => (
                            <div key={label} className="flex items-center gap-[6px]">
                                <span className="text-[10px] font-bold uppercase px-[5px] py-[1px] rounded" style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>{label}</span>
                                <span className="text-[13px] font-bold text-[#F9FAFB]">{count}<span className="text-[#6B7280]">/{roundSubs.totalTeams}</span></span>
                            </div>
                        ))}
                        <div className="h-[14px] w-[1px] bg-[#1F2937]" />
                        <span className={`text-[11px] font-bold ${roundSubs.allTeamsComplete ? 'text-emerald-400' : 'text-[#6B7280]'}`}>
                            {roundSubs.allTeamsComplete ? '✓ All teams submitted' : `${roundSubs.teams?.filter(t => t.allDone).length || 0}/${roundSubs.totalTeams} complete`}
                        </span>
                    </div>
                )}
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

        {/* Broadcast Panel */}
        {showBroadcastPanel && (
            <div className="mb-[24px] rounded-[12px] border border-[#F59E0B]/20 bg-[#111827] overflow-hidden">
                <div className="p-[20px] border-b border-[#1F2937] flex items-center justify-between">
                    <div className="flex items-center gap-[10px]">
                        <FiRadio className="text-[#F59E0B]" size={18} />
                        <h3 className="text-[16px] font-semibold text-[#F9FAFB]">Broadcast Center</h3>
                    </div>
                    <button onClick={() => setShowBroadcastPanel(false)} className="text-[#6B7280] hover:text-[#F9FAFB] transition-colors">
                        <FiX size={16} />
                    </button>
                </div>
                <div className="p-[20px]">
                    <div className="flex gap-[12px] mb-[12px]">
                        <div className="flex-1">
                            <textarea
                                value={broadcastMsg}
                                onChange={(e) => setBroadcastMsg(e.target.value)}
                                placeholder="Type your announcement to all teams..."
                                rows={2}
                                className="w-full bg-[#0B0F14] border border-[#1F2937] rounded-[8px] px-[14px] py-[10px] text-[14px] text-[#F9FAFB] placeholder-[#4B5563] focus:border-[#F59E0B]/50 focus:outline-none resize-none"
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendBroadcast(); } }}
                            />
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-[8px]">
                            {['info', 'warning', 'alert', 'success'].map(t => {
                                const colors = {
                                    info: { active: 'bg-[#7C3AED]/20 text-[#7C3AED] border-[#7C3AED]/30', idle: 'text-[#6B7280] border-[#1F2937] hover:border-[#374151]' },
                                    warning: { active: 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/30', idle: 'text-[#6B7280] border-[#1F2937] hover:border-[#374151]' },
                                    alert: { active: 'bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/30', idle: 'text-[#6B7280] border-[#1F2937] hover:border-[#374151]' },
                                    success: { active: 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30', idle: 'text-[#6B7280] border-[#1F2937] hover:border-[#374151]' },
                                };
                                return (
                                    <button
                                        key={t}
                                        onClick={() => setBroadcastType(t)}
                                        className={`px-[12px] py-[6px] rounded-[6px] text-[11px] font-bold uppercase tracking-wider border transition-all ${
                                            broadcastType === t ? colors[t].active : colors[t].idle
                                        }`}
                                    >
                                        {t}
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            onClick={handleSendBroadcast}
                            disabled={!broadcastMsg.trim() || broadcastSending}
                            className="flex items-center gap-[8px] px-[20px] py-[8px] rounded-[8px] bg-[#F59E0B] text-[#0B0F14] text-[13px] font-bold uppercase tracking-wider hover:bg-[#D97706] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                            <FiSend size={14} />
                            {broadcastSending ? 'Sending...' : 'Broadcast'}
                        </button>
                    </div>

                    {/* Broadcast History */}
                    {broadcastHistory.length > 0 && (
                        <div className="mt-[16px] pt-[16px] border-t border-[#1F2937]">
                            <div className="flex items-center justify-between mb-[10px]">
                                <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Recent Broadcasts</span>
                                <button onClick={handleClearBroadcasts} className="text-[11px] text-red-400 hover:text-red-300 font-medium transition-colors">Clear All</button>
                            </div>
                            <div className="flex flex-col gap-[6px] max-h-[200px] overflow-y-auto custom-scrollbar">
                                {[...broadcastHistory].reverse().slice(0, 10).map((b, i) => {
                                    const typeColors = {
                                        info: 'border-l-[#7C3AED]',
                                        warning: 'border-l-[#F59E0B]',
                                        alert: 'border-l-[#EF4444]',
                                        success: 'border-l-[#10B981]',
                                    };
                                    return (
                                        <div key={i} className={`pl-[12px] py-[8px] border-l-2 ${typeColors[b.type] || typeColors.info} bg-[#0B0F14]/50 rounded-r-[6px]`}>
                                            <p className="text-[13px] text-[#D1D5DB]">{b.message}</p>
                                            <p className="text-[10px] text-[#4B5563] mt-[2px]">
                                                {new Date(b.timestamp).toLocaleTimeString()} — {b.type}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* Dynamic Content Based on Tab */}
        <div className="max-w-[1200px] mx-auto relative">
            {activeTab === 'dashboard' && (
                <div className="flex flex-col gap-[24px] animate-in fade-in duration-500">

                    {/* ── LIVE ROUND BANNER ── */}
                    <div className={`relative rounded-[16px] overflow-hidden border ${settings?.isRoundActive ? 'border-[#7C3AED]/30 bg-gradient-to-r from-[#7C3AED]/10 via-[#111827] to-[#7C3AED]/10' : 'border-[#1F2937] bg-[#111827]/80'}`}>
                        <div className="flex flex-col md:flex-row items-center justify-between p-[24px] gap-[16px]">
                            <div className="flex items-center gap-[16px]">
                                <div className={`w-[48px] h-[48px] rounded-[12px] flex items-center justify-center ${settings?.isRoundActive ? 'bg-[#7C3AED] shadow-[0_0_20px_rgba(124,58,237,0.4)]' : 'bg-[#1F2937]'}`}>
                                    {settings?.isRoundActive ? <FiRadio size={22} className="text-white animate-pulse" /> : <FiCircle size={22} className="text-[#6B7280]" />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-[10px]">
                                        <h2 className="text-[22px] font-bold text-[#F9FAFB]">
                                            {settings?.isRoundActive ? `${(settings?.currentRound || 0) >= 5 ? `Fun Round ${(settings?.currentRound || 0) - 4}` : `Round ${(settings?.currentRound || 0) + 1}`} is LIVE` : 'No Round Active'}
                                        </h2>
                                        {settings?.isRoundActive && <span className="w-[8px] h-[8px] bg-emerald-400 rounded-full animate-pulse" />}
                                    </div>
                                    <p className="text-[13px] text-[#9CA3AF] mt-[2px]">
                                        {settings?.isRoundActive
                                            ? `${roundStats.teamsFullyCompleted}/${teams.length} teams completed`
                                            : `Current position: Round ${(settings?.currentRound || 0) + 1}`}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-[16px]">
                                {settings?.isRoundActive && roundTimeLeft !== null && (
                                    <div className={`text-[36px] font-mono font-black tracking-wider ${roundTimeLeft < 60 ? 'text-red-400 animate-pulse' : roundTimeLeft < 300 ? 'text-amber-400' : 'text-[#F9FAFB]'}`}>
                                        {Math.floor(roundTimeLeft / 60)}:{String(roundTimeLeft % 60).padStart(2, '0')}
                                    </div>
                                )}
                                {settings?.isRoundActive && (
                                    <button
                                        onClick={() => handleStartStopRound(false, settings.currentRound)}
                                        className="px-[20px] py-[10px] bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-[13px] rounded-[10px] border border-red-500/20 transition-all"
                                    >
                                        Stop Round
                                    </button>
                                )}
                            </div>
                        </div>
                        {settings?.isRoundActive && (
                            <div className="h-[3px] bg-[#1F2937]">
                                <div className="h-full bg-gradient-to-r from-[#7C3AED] to-[#3b82f6] transition-all duration-1000" style={{ width: `${roundTimeLeft !== null ? (roundTimeLeft / (20 * 60)) * 100 : 100}%` }} />
                            </div>
                        )}
                    </div>

                    {/* ── STATS ROW ── */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-[16px]">
                        <div className="bg-[#111827]/60 border border-[#1F2937] rounded-[12px] p-[20px]">
                            <div className="flex items-center justify-between mb-[12px]">
                                <span className="text-[11px] text-[#6B7280] uppercase tracking-widest font-medium">Teams</span>
                                <FiUsers size={16} className="text-[#7C3AED]" />
                            </div>
                            <div className="text-[28px] font-bold text-[#F9FAFB]">{teams.length}</div>
                            <div className="text-[12px] text-[#6B7280] mt-[4px]">{teams.length * 3} participants</div>
                        </div>
                        <div className="bg-[#111827]/60 border border-[#1F2937] rounded-[12px] p-[20px]">
                            <div className="flex items-center justify-between mb-[12px]">
                                <span className="text-[11px] text-[#6B7280] uppercase tracking-widest font-medium">Total Points</span>
                                <FiAward size={16} className="text-amber-500" />
                            </div>
                            <div className="text-[28px] font-bold text-[#F9FAFB]">
                                {teams.reduce((acc, team) => {
                                    let sum = 0;
                                    for (let i = 0; i <= 9; i++) {
                                        const yd = team.gameState?.[`year${i}`];
                                        if (yd?.scores) sum += (yd.scores.cto || 0) + (yd.scores.cfo || 0) + (yd.scores.pm || 0);
                                    }
                                    return acc + sum;
                                }, 0).toLocaleString()}
                            </div>
                            <div className="text-[12px] text-[#6B7280] mt-[4px]">across all rounds</div>
                        </div>
                        <div className="bg-[#111827]/60 border border-[#1F2937] rounded-[12px] p-[20px]">
                            <div className="flex items-center justify-between mb-[12px]">
                                <span className="text-[11px] text-[#6B7280] uppercase tracking-widest font-medium">Completion</span>
                                <FiCheckCircle size={16} className="text-emerald-500" />
                            </div>
                            <div className="text-[28px] font-bold text-[#F9FAFB]">
                                {teams.length > 0 ? Math.round((roundStats.teamsFullyCompleted / teams.length) * 100) : 0}%
                            </div>
                            <div className="w-full bg-[#1F2937] h-[4px] rounded-full mt-[8px] overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${teams.length > 0 ? (roundStats.teamsFullyCompleted / teams.length) * 100 : 0}%` }} />
                            </div>
                        </div>
                        <div className="bg-[#111827]/60 border border-[#1F2937] rounded-[12px] p-[20px]">
                            <div className="flex items-center justify-between mb-[12px]">
                                <span className="text-[11px] text-[#6B7280] uppercase tracking-widest font-medium">Role Progress</span>
                                <FiActivity size={16} className="text-sky-400" />
                            </div>
                            <div className="flex items-center gap-[16px] mt-[4px]">
                                {[
                                    { label: 'CTO', count: roundStats.ctoCompleted, color: '#7C3AED' },
                                    { label: 'CFO', count: roundStats.cfoCompleted, color: '#f59e0b' },
                                    { label: 'PM', count: roundStats.pmCompleted, color: '#10b981' },
                                ].map(r => (
                                    <div key={r.label} className="flex-1 text-center">
                                        <div className="text-[20px] font-bold text-[#F9FAFB]">{r.count}</div>
                                        <div className="text-[9px] uppercase font-bold mt-[2px]" style={{ color: r.color }}>{r.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── ROUNDS OVERVIEW ── */}
                    <div>
                        <h3 className="text-[16px] font-semibold text-[#F9FAFB] mb-[16px]">Rounds Overview</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-[14px]">
                            {/* Main Rounds 1-5 */}
                            {[0, 1, 2, 3, 4].map(yr => {
                                const isActive = settings?.isRoundActive && settings?.currentRound === yr;

                                const roleCounts = { cto: 0, cfo: 0, pm: 0 };
                                teams.forEach(t => {
                                    const yd = t.gameState?.[`year${yr}`];
                                    if (yd?.answers?.cto && Object.keys(yd.answers.cto).length > 0) roleCounts.cto++;
                                    if (yd?.answers?.cfo && Object.keys(yd.answers.cfo).length > 0) roleCounts.cfo++;
                                    if (yd?.answers?.pm && Object.keys(yd.answers.pm).length > 0) roleCounts.pm++;
                                });
                                const totalDone = roleCounts.cto + roleCounts.cfo + roleCounts.pm;
                                const totalPossible = teams.length * 3;
                                const pct = totalPossible > 0 ? (totalDone / totalPossible) * 100 : 0;
                                const hasData = totalDone > 0;

                                return (
                                    <div
                                        key={yr}
                                        onClick={() => navigate(`/admin/r${yr + 1}`)}
                                        className={`rounded-[14px] border p-[16px] cursor-pointer transition-all hover:scale-[1.02] ${
                                            isActive ? 'border-[#7C3AED]/40 bg-[#7C3AED]/5 shadow-[0_0_20px_rgba(124,58,237,0.1)]'
                                            : hasData ? 'border-emerald-500/20 bg-emerald-500/5'
                                            : 'border-[#1F2937] bg-[#111827]/60'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-[14px]">
                                            <div className="flex items-center gap-[8px]">
                                                {isActive && <span className="w-[8px] h-[8px] bg-[#7C3AED] rounded-full animate-pulse shadow-[0_0_8px_rgba(124,58,237,0.5)]" />}
                                                {!isActive && hasData && <FiCheckCircle size={14} className="text-emerald-400" />}
                                                <span className="text-[15px] font-bold text-[#F9FAFB]">Round {yr + 1}</span>
                                            </div>
                                            <span className={`text-[10px] font-bold uppercase px-[8px] py-[2px] rounded-full ${
                                                isActive ? 'bg-[#7C3AED]/20 text-[#7C3AED]'
                                                : hasData ? 'bg-emerald-500/10 text-emerald-400'
                                                : 'bg-[#1F2937] text-[#6B7280]'
                                            }`}>
                                                {isActive ? 'LIVE' : hasData ? 'PLAYED' : 'READY'}
                                            </span>
                                        </div>

                                        <div className="flex gap-[6px] mb-[12px]">
                                            {[
                                                { label: 'CTO', count: roleCounts.cto, color: '#7C3AED' },
                                                { label: 'CFO', count: roleCounts.cfo, color: '#f59e0b' },
                                                { label: 'PM', count: roleCounts.pm, color: '#10b981' },
                                            ].map(r => (
                                                <div key={r.label} className="flex-1 bg-[#0B0F14] rounded-[8px] py-[8px] text-center border border-[#1F2937]/50">
                                                    <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: r.color }}>{r.label}</div>
                                                    <div className="text-[14px] font-bold text-[#F9FAFB] mt-[2px]">{r.count}<span className="text-[11px] text-[#6B7280] font-normal">/{teams.length}</span></div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex items-center gap-[8px]">
                                            <div className="flex-1 bg-[#1F2937] h-[4px] rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full transition-all duration-700 ${hasData ? 'bg-emerald-500' : 'bg-[#7C3AED]'}`} style={{ width: `${pct}%` }} />
                                            </div>
                                            <span className="text-[10px] font-bold text-[#6B7280]">{Math.round(pct)}%</span>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Fun Round - single card for all fun rounds */}
                            {(() => {
                                const isFunActive = settings?.isRoundActive && settings?.currentRound >= 5 && settings?.currentRound <= 8;
                                const funYears = [5, 6, 7, 8];
                                let funTotal = 0;
                                funYears.forEach(yr => {
                                    teams.forEach(t => {
                                        const yd = t.gameState?.[`year${yr}`];
                                        if (yd?.answers) {
                                            if (yd.answers.cto && Object.keys(yd.answers.cto).length > 0) funTotal++;
                                            if (yd.answers.cfo && Object.keys(yd.answers.cfo).length > 0) funTotal++;
                                            if (yd.answers.pm && Object.keys(yd.answers.pm).length > 0) funTotal++;
                                        }
                                    });
                                });

                                return (
                                    <div
                                        onClick={() => navigate('/admin/r6')}
                                        className={`rounded-[14px] border p-[16px] cursor-pointer transition-all hover:scale-[1.02] ${
                                            isFunActive
                                                ? 'border-yellow-500/40 bg-yellow-500/5 shadow-[0_0_20px_rgba(234,179,8,0.1)]'
                                                : 'border-[#1F2937] bg-[#111827]/60'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-[14px]">
                                            <div className="flex items-center gap-[8px]">
                                                {isFunActive && <span className="w-[8px] h-[8px] bg-yellow-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(234,179,8,0.5)]" />}
                                                <FiZap size={14} className="text-yellow-500" />
                                                <span className="text-[15px] font-bold text-[#F9FAFB]">Fun Round</span>
                                            </div>
                                            <span className={`text-[10px] font-bold uppercase px-[8px] py-[2px] rounded-full ${
                                                isFunActive ? 'bg-yellow-500/20 text-yellow-500' : 'bg-[#1F2937] text-[#6B7280]'
                                            }`}>
                                                {isFunActive ? 'ACTIVE' : funTotal > 0 ? 'PLAYED' : 'READY'}
                                            </span>
                                        </div>

                                        <div className="text-center py-[8px]">
                                            <div className="text-[24px] font-bold text-yellow-500">{funTotal}</div>
                                            <div className="text-[10px] text-[#6B7280] uppercase tracking-wider">submissions</div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    {/* ── TEAM CARDS GRID ── */}
                    <div>
                        <div className="flex items-center justify-between mb-[16px]">
                            <h3 className="text-[16px] font-semibold text-[#F9FAFB]">All Teams ({teams.length})</h3>
                        </div>
                        {teams.length === 0 ? (
                            <div className="py-[64px] text-center bg-[#111827]/40 rounded-[12px] border border-dashed border-[#1F2937]">
                                <FiUsers className="text-[#1F2937] mx-auto mb-[12px]" size={40} />
                                <p className="text-[14px] text-[#6B7280]">No teams registered yet</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-[20px]">
                                {teams.map((team, idx) => {
                                    const currentYearKey = `year${settings?.currentRound || 0}`;
                                    const rd = team.gameState?.[currentYearKey];
                                    const roles = ['cto', 'cfo', 'pm'];
                                    const doneCount = roles.filter(r => rd?.answers?.[r] && Object.keys(rd.answers[r]).length > 0).length;
                                    let totalScore = 0;
                                    let roundsPlayed = 0;
                                    for (let i = 0; i <= 4; i++) {
                                        const yd = team.gameState?.[`year${i}`];
                                        if (yd?.scores) {
                                            const rScore = (yd.scores.cto || 0) + (yd.scores.cfo || 0) + (yd.scores.pm || 0);
                                            totalScore += rScore;
                                            if (rScore > 0) roundsPlayed++;
                                        }
                                    }
                                    const allDone = doneCount === 3;
                                    const avgScore = roundsPlayed > 0 ? Math.round(totalScore / roundsPlayed) : 0;

                                    return (
                                        <Card
                                            key={idx}
                                            className={`!p-0 cursor-pointer group ${allDone ? '!border-emerald-500/20' : ''}`}
                                        >
                                            <div onClick={() => setSelectedTeam(team)} className="p-[20px]">
                                                {/* Header */}
                                                <div className="flex items-start justify-between mb-[20px]">
                                                    <div className="flex items-center gap-[12px]">
                                                        <div className="w-[44px] h-[44px] rounded-[12px] bg-gradient-to-br from-[#7C3AED] to-[#3b82f6] flex items-center justify-center text-white font-bold text-[18px] shadow-lg shadow-[#7C3AED]/20">
                                                            {team.teamName.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <h4 className="text-[16px] font-bold text-[#F9FAFB] group-hover:text-[#7C3AED] transition-colors">{team.teamName}</h4>
                                                            <div className="flex items-center gap-[6px] mt-[2px]">
                                                                <span className="text-[10px] text-[#6B7280] font-mono">{team.teamId}</span>
                                                                <span className="text-[8px] text-[#374151]">|</span>
                                                                <span className={`text-[9px] font-bold uppercase ${team.status === 'registered' ? 'text-sky-400' : team.status === 'in-progress' ? 'text-amber-400' : 'text-emerald-400'}`}>{team.status}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-[22px] font-black text-[#F9FAFB]">{totalScore}</div>
                                                        <div className="text-[9px] text-[#6B7280] uppercase tracking-wider">points</div>
                                                    </div>
                                                </div>

                                                {/* Role cards */}
                                                <div className="flex gap-[8px] mb-[16px]">
                                                    {roles.map(role => {
                                                        const member = team.members?.find(m => m.role === role);
                                                        const done = rd?.answers?.[role] && Object.keys(rd.answers[role]).length > 0;
                                                        const roleScore = rd?.scores?.[role] || 0;
                                                        const roleColors = { cto: '#7C3AED', cfo: '#f59e0b', pm: '#10b981' };
                                                        return (
                                                            <div key={role} className={`flex-1 rounded-[10px] p-[10px] border transition-all ${done ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-[#0B0F14] border-[#1F2937]'}`}>
                                                                <div className="flex items-center justify-between mb-[6px]">
                                                                    <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: roleColors[role] }}>{role}</span>
                                                                    {done ? <FiCheckCircle size={11} className="text-emerald-400" /> : <FiCircle size={11} className="text-[#374151]" />}
                                                                </div>
                                                                <div className={`text-[12px] font-medium truncate ${done ? 'text-[#D1D5DB]' : 'text-[#6B7280]'}`}>{member?.name || '—'}</div>
                                                                {done && <div className="text-[10px] font-bold text-emerald-400 mt-[4px]">+{roleScore} pts</div>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Footer stats */}
                                                <div className="flex items-center justify-between pt-[12px] border-t border-[#1F2937]/50">
                                                    <div className="flex items-center gap-[12px]">
                                                        <span className="text-[11px] text-[#6B7280]"><span className="text-[#9CA3AF] font-medium">{roundsPlayed}</span> rounds played</span>
                                                        {roundsPlayed > 0 && <span className="text-[11px] text-[#6B7280]"><span className="text-[#9CA3AF] font-medium">{avgScore}</span> avg</span>}
                                                    </div>
                                                    <div className="flex items-center gap-[8px]">
                                                        <div className="w-[60px] bg-[#1F2937] h-[4px] rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full transition-all duration-500 ${allDone ? 'bg-emerald-500' : 'bg-[#7C3AED]'}`} style={{ width: `${(doneCount / 3) * 100}%` }} />
                                                        </div>
                                                        <span className={`text-[11px] font-bold ${allDone ? 'text-emerald-400' : 'text-[#6B7280]'}`}>{doneCount}/3</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </div>

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
                                        <h4 className="text-[16px] font-bold text-[#F9FAFB] border-b border-[#1F2937] pb-[12px] mb-[16px] uppercase tracking-wider">Operational Lifecycle (10 Rounds)</h4>
                                        {[0,1,2,3,4,5,6,7,8,9].map(y => {
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
                                                                                const isZero = pts === 0; // eslint-disable-line no-unused-vars
                                                                                return (
                                                                                    <span key={qId} title={`Q${qi+1}: ${qId}`} className={`text-[11px] font-mono px-[8px] py-[3px] rounded border ${
                                                                                        isPos ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' :
                                                                                        isNeg ? 'bg-red-500/10 border-red-500/30 text-red-300' :
                                                                                        'bg-white/5 border-[#1F2937] text-[#4B5563]'
                                                                                    }`}>
                                                                                        {isPos ? '✓' : isNeg ? '✕' : '—'} Q{qi+1}: {pts > 0 ? '+' : ''}{pts}pts
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

            {activeTab === 'fun-leaderboard' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex items-center justify-between mb-[32px]">
                        <div>
                            <h2 className="text-[32px] font-semibold text-yellow-500 tracking-tight">Experimental Standings</h2>
                            <p className="text-[14px] text-[#9CA3AF] mt-[4px]">Performance metrics for the current speed-based Fun Round.</p>
                        </div>
                    </div>
                    <FunLeaderboard />
                </div>
            )}

            {activeTab === 'leaderboard' && (
                <div className="animate-in fade-in duration-500">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-24 mb-[48px]">
                        <div>
                            <h2 className="text-[32px] font-semibold text-[#F9FAFB] tracking-tight">Global Rankings</h2>
                            <p className="text-[14px] text-[#9CA3AF] mt-[4px]">Live valuation progression map and multi-year analytics.</p>
                        </div>
                        <div className="flex items-center gap-16">
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
                            <button 
                                onClick={() => { setFilteredRound(null); setIsFullScreenLeaderboard(true); }}
                                className="px-[20px] py-[8px] bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-[8px] text-[12px] font-bold uppercase tracking-widest transition-all border border-emerald-500/20 shadow-glow-sm flex items-center gap-8"
                            >
                                <FiActivity size={14} /> Full Screen
                            </button>
                        </div>
                    </div>
                    {leaderboardMode === 'standard' ? <Leaderboard /> : <FunLeaderboard />}
                </div>
            )}

            {['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9', 'r10'].includes(activeTab) && (() => {
                const tabItem = menuItems.find(m => m.id === activeTab);
                const isFunTab = tabItem?.isFun;
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

                const funQs = isFunTab
                  ? questions.filter(q => q.year === tabYear && q.role === 'fun')
                  : [];
                const currentFunIdx = funQs.findIndex(q => q.questionId === settings?.activeFunQuestionId);
                const currentFunQ = currentFunIdx >= 0 ? funQs[currentFunIdx] : null;

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
                                    {isFunTab ? tabItem?.label : `Round ${activeTab.slice(1)}`}
                                </h2>
                                <p className="text-[14px] text-[#7C3AED] font-medium uppercase tracking-widest mt-[8px]">
                                    {isFunTab ? 'Fun Round Activity' : `Standard Operations: Round ${tabYear + 1}`}
                                </p>
                            </div>
                            
                            <div className="flex flex-col lg:flex-row gap-16 w-full lg:w-auto">
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        setLeaderboardMode(isFunTab ? 'fun' : 'standard');
                                        setFilteredRound(isFunTab ? null : tabYear);
                                        setIsFullScreenLeaderboard(true);
                                    }}
                                    className="h-[48px] px-[28px] border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10"
                                >
                                    <FiAward size={20} />
                                    <span className="text-[14px] uppercase tracking-wider ml-[8px]">Ranking</span>
                                </Button>

                                <Button
                                    variant={isThisRoundLive ? 'secondary' : 'primary'}
                                    onClick={() => {
                                        if (isLocked) {
                                            setMsg({ type: 'error', text: 'This round is permanently locked. Use Reset Competition to start over.' });
                                            return;
                                        }
                                        handleStartStopRound(!isThisRoundLive);
                                    }}
                                    className={`h-[48px] px-[28px] ${btnStyle}`}
                                >
                                    {btnIcon}
                                    <span className="text-[14px] uppercase tracking-wider ml-[8px]">{btnLabel}</span>
                                </Button>
                            </div>
                        </div>

                        {isFunTab && isThisRoundLive && (
                            <div className="mb-[32px] rounded-[16px] border border-yellow-500/30 bg-gradient-to-br from-yellow-500/8 via-[#111827] to-[#111827] overflow-hidden animate-in slide-in-from-top-4 duration-500 shadow-[0_0_40px_rgba(234,179,8,0.06)]">
                                {/* Host Panel Header */}
                                <div className="px-[24px] py-[14px] border-b border-yellow-500/10 bg-yellow-500/5 flex items-center justify-between">
                                    <div className="flex items-center gap-[12px]">
                                        <div className="w-[10px] h-[10px] bg-yellow-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(234,179,8,0.6)]" />
                                        <span className="text-[13px] font-black text-yellow-500 uppercase tracking-[0.15em]">Quiz Host Panel</span>
                                    </div>
                                    {funQs.length > 0 && (
                                        <div className="flex items-center gap-[14px]">
                                            <span className="text-[13px] text-[#9CA3AF] font-medium">
                                                Question <span className="text-[#F9FAFB] font-bold">{currentFunIdx >= 0 ? currentFunIdx + 1 : '—'}</span> of <span className="text-[#F9FAFB] font-bold">{funQs.length}</span>
                                            </span>
                                            <div className="w-[100px] bg-[#1F2937] h-[6px] rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full transition-all duration-700 ease-out" style={{ width: `${funQs.length > 0 ? (Math.max(0, currentFunIdx + 1) / funQs.length) * 100 : 0}%` }} />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Current Question Preview */}
                                <div className="p-[24px]">
                                    {currentFunQ ? (
                                        <div className="flex gap-[20px] items-start">
                                            {currentFunQ.assetUrl && (
                                                <div className="w-[140px] h-[90px] rounded-[10px] overflow-hidden border border-[#1F2937] bg-[#0B0F14] shrink-0">
                                                    <img src={currentFunQ.assetUrl} alt="" className="w-full h-full object-cover" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-[10px] mb-[8px]">
                                                    <span className="w-[28px] h-[28px] rounded-[8px] bg-yellow-500 text-black flex items-center justify-center text-[13px] font-black shrink-0">{currentFunIdx + 1}</span>
                                                    <span className="text-[10px] font-black text-yellow-500 bg-yellow-500/10 px-[10px] py-[3px] rounded-full border border-yellow-500/20 uppercase tracking-wider">Showing to participants</span>
                                                </div>
                                                <p className="text-[15px] font-semibold text-[#F9FAFB] leading-snug truncate">{currentFunQ.question}</p>
                                                <div className="flex items-center gap-[6px] mt-[6px]">
                                                    <FiCheckCircle size={12} className="text-emerald-400 shrink-0" />
                                                    <span className="text-[12px] text-emerald-400 font-medium">Answer: {currentFunQ.correctAnswer}</span>
                                                </div>
                                            </div>
                                            <div className="text-center shrink-0 bg-[#0B0F14] rounded-[12px] px-[20px] py-[14px] border border-[#1F2937]">
                                                <div className="text-[32px] font-black text-yellow-500 leading-none">{activeQuestionStats.answeredCount}</div>
                                                <div className="text-[10px] text-[#6B7280] uppercase tracking-wider mt-[4px] font-bold">of {activeQuestionStats.totalTeams} answered</div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-[20px]">
                                            <div className="w-[56px] h-[56px] rounded-[14px] bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto mb-[14px]">
                                                <FiZap className="text-yellow-500" size={26} />
                                            </div>
                                            <p className="text-[18px] font-bold text-[#F9FAFB] mb-[6px]">Ready to Begin</p>
                                            <p className="text-[13px] text-[#6B7280]">{funQs.length} question{funQs.length !== 1 ? 's' : ''} loaded — click below to show the first question to everyone</p>
                                        </div>
                                    )}
                                </div>

                                {/* Navigation Controls */}
                                <div className="px-[24px] py-[16px] border-t border-[#1F2937] bg-[#0B0F14]/60 flex items-center justify-between">
                                    <button
                                        onClick={() => { if (currentFunIdx > 0) handleActivateFunQuestion(funQs[currentFunIdx - 1].questionId); }}
                                        disabled={currentFunIdx <= 0}
                                        className="flex items-center gap-[6px] px-[16px] py-[10px] rounded-[10px] text-[12px] font-bold uppercase tracking-wider transition-all border border-[#1F2937] text-[#9CA3AF] hover:text-[#F9FAFB] hover:border-[#374151] hover:bg-[#1F2937]/50 disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#9CA3AF]"
                                    >
                                        <FiChevronLeft size={16} /> Previous
                                    </button>

                                    <button
                                        onClick={() => {
                                            if (currentFunIdx === -1 && funQs.length > 0) {
                                                handleActivateFunQuestion(funQs[0].questionId);
                                            } else if (currentFunIdx < funQs.length - 1) {
                                                handleActivateFunQuestion(funQs[currentFunIdx + 1].questionId);
                                            }
                                        }}
                                        disabled={funQs.length === 0 || (currentFunIdx >= 0 && currentFunIdx >= funQs.length - 1)}
                                        className="flex items-center gap-[10px] px-[32px] py-[12px] rounded-[12px] bg-yellow-500 hover:bg-yellow-400 text-black text-[14px] font-black uppercase tracking-wider transition-all shadow-lg shadow-yellow-500/25 hover:shadow-yellow-500/40 hover:scale-[1.03] active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none"
                                    >
                                        {currentFunIdx === -1 ? (
                                            <><FiPlay size={18} /> Show First Question</>
                                        ) : currentFunIdx >= funQs.length - 1 ? (
                                            <><FiCheckCircle size={18} /> All Questions Shown</>
                                        ) : (
                                            <>Next Question <FiChevronRight size={18} /></>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Filter Area for Roles / Sub-Rounds */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-[24px] mb-[32px] pb-[24px] border-b border-[#1F2937]">
                             <div className="flex bg-[#111827] rounded-[8px] p-[4px] border border-[#1F2937]">
                                 {(isFunTab ? ['scenarios'] : ['cto', 'cfo', 'pm']).map(role => (
                                     <button
                                         key={role}
                                         onClick={() => { setActiveRoleFilter(role); setIsAddingQuestion(false); }}
                                         className={`px-[24px] py-[8px] rounded-[6px] text-[14px] font-medium uppercase transition-all ${activeRoleFilter === role ? 'bg-[#7C3AED] text-white shadow-glow-sm' : 'text-[#9CA3AF] hover:text-[#F9FAFB]'}`}
                                     >
                                         {role === 'scenarios' ? 'Scenarios' : role}
                                     </button>
                                 ))}
                             </div>
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
                                        if (isFunTab) {
                                            setActiveRoleFilter('fun');
                                            setNewQ(prev => ({...prev, type: 'text', correctAnswer: '', assetUrl: '', question: ''}));
                                        }
                                    }
                                    setIsAddingQuestion(!isAddingQuestion);
                                }}
                                className="h-[40px] px-[16px] text-[12px]"
                             >
                                {isAddingQuestion ? <FiX className="text-red-400" /> : <FiPlus />}
                                <span className="ml-[8px]">{isAddingQuestion ? 'CANCEL' : (isFunTab ? 'ADD FUN QUESTION' : `PLACE NEW SCENARIO FOR ${activeRoleFilter.toUpperCase()}`)}</span>
                             </Button>
                        </div>

                        {/* Add Question Form */}
                        {isAddingQuestion && isFunTab && (
                            <div className="bg-gradient-to-br from-yellow-500/5 via-[#111827] to-[#111827] border border-yellow-500/20 rounded-[16px] p-[32px] mb-[32px] animate-in zoom-in-95 duration-300">
                                <div className="mb-[28px]">
                                    <div className="flex items-center gap-[12px] mb-[6px]">
                                        <FiZap className="text-yellow-500" size={22} />
                                        <h4 className="text-[20px] font-bold text-[#F9FAFB]">{editingQId ? 'Edit Fun Question' : 'New Fun Question'}</h4>
                                    </div>
                                    <p className="text-[12px] text-[#9CA3AF]">Add an image and set the correct answer. Scoring is speed-based — fastest correct answer wins.</p>
                                </div>

                                <form onSubmit={handleCreateQuestion} className="flex flex-col gap-[24px]">
                                    {/* Image Upload — Hero Section */}
                                    <div className="rounded-[14px] border-2 border-dashed border-[#1F2937] bg-[#0B0F14] p-[24px] transition-all hover:border-yellow-500/30">
                                        {newQ.assetUrl ? (
                                            <div className="flex flex-col items-center gap-[16px]">
                                                <div className="relative rounded-[12px] overflow-hidden border border-[#1F2937] bg-[#111827] inline-block">
                                                    <img src={newQ.assetUrl} alt="Preview" className="max-w-full max-h-[280px] object-contain" />
                                                    <button
                                                        type="button"
                                                        onClick={() => setNewQ({...newQ, assetUrl: ''})}
                                                        className="absolute top-[8px] right-[8px] w-[28px] h-[28px] bg-red-500/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-all"
                                                    >
                                                        <FiX size={14} />
                                                    </button>
                                                </div>
                                                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Image loaded</span>
                                            </div>
                                        ) : (
                                            <label className="flex flex-col items-center gap-[16px] cursor-pointer py-[24px]">
                                                <div className="w-[64px] h-[64px] rounded-[16px] bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                                                    <FiPlusSquare className="text-yellow-500" size={28} />
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-[14px] font-semibold text-[#F9FAFB]">Click to upload image</p>
                                                    <p className="text-[11px] text-[#6B7280] mt-[4px]">PNG, JPG, GIF up to 10MB</p>
                                                </div>
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        const file = e.target.files[0];
                                                        if (file) {
                                                            const reader = new FileReader();
                                                            reader.onloadend = () => setNewQ({...newQ, assetUrl: reader.result});
                                                            reader.readAsDataURL(file);
                                                        }
                                                    }}
                                                />
                                            </label>
                                        )}
                                        <div className="flex items-center gap-[12px] mt-[16px]">
                                            <div className="flex-1 h-[1px] bg-[#1F2937]" />
                                            <span className="text-[10px] text-[#4B5563] font-bold uppercase tracking-wider">or paste URL</span>
                                            <div className="flex-1 h-[1px] bg-[#1F2937]" />
                                        </div>
                                        <input
                                            type="text"
                                            value={newQ.assetUrl?.startsWith('data:') ? '' : (newQ.assetUrl || '')}
                                            onChange={e => setNewQ({...newQ, assetUrl: e.target.value})}
                                            className="w-full mt-[12px] px-[16px] py-[10px] bg-[#111827] border border-[#1F2937] rounded-[10px] text-[13px] text-[#F9FAFB] focus:border-yellow-500/40 focus:outline-none transition-all font-mono placeholder-[#374151]"
                                            placeholder="https://example.com/image.png"
                                        />
                                    </div>

                                    {/* Question + Answer Side by Side */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px]">
                                        <div className="flex flex-col gap-[8px]">
                                            <label className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest px-[4px]">Question / Hint</label>
                                            <textarea
                                                value={newQ.question}
                                                onChange={e => setNewQ({...newQ, question: e.target.value})}
                                                className="w-full h-[100px] px-[16px] py-[12px] bg-[#0B0F14] border border-[#1F2937] rounded-[12px] text-[14px] text-[#F9FAFB] focus:border-yellow-500/40 focus:outline-none transition-all resize-none placeholder-[#374151]"
                                                placeholder="e.g. Guess the word from this image"
                                                required
                                            />
                                        </div>
                                        <div className="flex flex-col gap-[8px]">
                                            <label className="text-[11px] font-bold text-yellow-500 uppercase tracking-widest px-[4px]">Correct Answer</label>
                                            <input
                                                type="text"
                                                value={typeof newQ.correctAnswer === 'string' ? newQ.correctAnswer : ''}
                                                onChange={e => setNewQ({...newQ, correctAnswer: e.target.value, type: 'text'})}
                                                className="w-full px-[16px] py-[14px] bg-[#0B0F14] border-2 border-yellow-500/20 rounded-[12px] text-[18px] font-bold text-yellow-500 focus:border-yellow-500/60 focus:outline-none transition-all placeholder-[#374151] text-center"
                                                placeholder="Downtown"
                                                required
                                            />
                                            <div className="flex items-center gap-[8px] px-[4px]">
                                                <div className="w-[4px] h-[4px] rounded-full bg-emerald-500" />
                                                <span className="text-[10px] text-[#6B7280]">Case-insensitive, spaces ignored</span>
                                            </div>
                                            <div className="flex items-center gap-[8px] px-[4px]">
                                                <div className="w-[4px] h-[4px] rounded-full bg-emerald-500" />
                                                <span className="text-[10px] text-[#6B7280]">"Down Town" = "downtown" = "DOWNTOWN"</span>
                                            </div>
                                        </div>
                                    </div>

                                    <Button type="submit" className="w-full h-[52px] !bg-yellow-500 hover:!bg-yellow-400 !text-black">
                                        <FiZap size={18} className="mr-[8px]" />
                                        <span className="text-[15px] font-black uppercase tracking-wider">{editingQId ? 'Update Question' : 'Add Fun Question'}</span>
                                    </Button>
                                </form>
                            </div>
                        )}

                        {isAddingQuestion && !isFunTab && (
                            <div className="bg-[#111827]/80 backdrop-blur-xl border border-[#7C3AED]/30 rounded-[12px] p-[32px] mb-[32px] animate-in zoom-in-95 duration-300">
                                <div className="mb-[24px] flex justify-between items-start">
                                    <div>
                                        <h4 className="text-[18px] font-semibold text-[#F9FAFB]">{editingQId ? 'Modify Scenario' : 'Strategic Scenario Architect'}</h4>
                                        <p className="text-[12px] text-[#9CA3AF] mt-[4px]">{editingQId ? `Modifying existing deployment ID: ${editingQId}` : 'Phase Simulation Parameters'}</p>
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
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-[24px]">
                                        <div className="flex flex-col gap-[20px]">
                                            <div className="flex flex-col gap-[8px]">
                                                <label className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-widest px-[4px]">Mission Briefing (Question)</label>
                                                <textarea
                                                    value={newQ.question}
                                                    onChange={e => setNewQ({...newQ, question: e.target.value})}
                                                    className="w-full h-[120px] px-[16px] py-[12px] bg-[#0B0F14] border border-[#1F2937] rounded-[12px] text-[14px] text-[#F9FAFB] focus:border-[#7C3AED] focus:outline-none transition-all resize-none"
                                                    placeholder="Define the tactical objective..."
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="bg-[#111827] border border-[#1F2937] rounded-[12px] p-[20px] flex flex-col gap-[16px]">
                                            <h5 className="text-[10px] font-bold text-[#4B5563] uppercase tracking-[0.2em] mb-[4px]">Scoring Rubric</h5>
                                            <div className="grid grid-cols-2 gap-[16px]">
                                                <div className="flex flex-col gap-[8px]">
                                                    <label className="text-[12px] font-medium text-[#10B981] uppercase tracking-widest px-[4px]">Correct Reward</label>
                                                    <input
                                                        type="number"
                                                        value={newQ.scoringRubric.full}
                                                        onChange={e=>setNewQ({...newQ, scoringRubric: {...newQ.scoringRubric, full: Number(e.target.value)}})}
                                                        className="w-full px-[16px] py-[10px] bg-[#0B0F14] border border-[#1F2937] rounded-[8px] text-[14px] text-emerald-400 focus:border-emerald-500/50 focus:outline-none transition-all font-mono"
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-[8px]">
                                                    <label className="text-[12px] font-medium text-red-400 uppercase tracking-widest px-[4px]">Penalty (-)</label>
                                                    <input
                                                        type="number"
                                                        value={newQ.scoringRubric.incorrect}
                                                        onChange={e=>setNewQ({...newQ, scoringRubric: {...newQ.scoringRubric, incorrect: Number(e.target.value)}})}
                                                        className="w-full px-[16px] py-[10px] bg-[#0B0F14] border border-[#1F2937] rounded-[8px] text-[14px] text-red-400 focus:border-red-500/50 focus:outline-none transition-all font-mono"
                                                    />
                                                </div>
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
                                                        className="w-full px-[16px] py-[10px] bg-[#0B0F14] border border-[#1F2937] rounded-[8px] text-[14px] text-[#A78BFA] focus:border-[#7C3AED]/50 focus:outline-none transition-all font-mono"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {newQ.type === 'text' && (
                                        <div className="flex flex-col gap-[8px] p-[24px] bg-[#111827] border border-[#1F2937] rounded-[12px]">
                                            <label className="text-[12px] font-medium text-yellow-500 uppercase tracking-widest px-[4px]">Correct Answer (Case-Insensitive)</label>
                                            <input
                                                type="text"
                                                value={newQ.correctAnswer}
                                                onChange={e => setNewQ({...newQ, correctAnswer: e.target.value})}
                                                className="w-full px-[16px] py-[12px] bg-[#0B0F14] border border-[#1F2937] rounded-[12px] text-[14px] text-white focus:border-yellow-500/50 focus:outline-none transition-all font-mono"
                                                placeholder="Enter the required response..."
                                                required
                                            />
                                            <p className="text-[10px] text-[#9CA3AF] mt-4 italic font-medium px-4">The platform will automatically ignore capitalization when validating unit responses.</p>
                                        </div>
                                    )}

                                    {newQ.type === 'range' ? (
                                        <div className="grid grid-cols-2 gap-[16px] p-[24px] bg-[#111827] border border-[#1F2937] rounded-[12px]">
                                            <div className="flex flex-col gap-[8px]">
                                                <label className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-widest px-[4px]">Minimum Bound</label>
                                                <input 
                                                    type="number"
                                                    value={newQ.range.min}
                                                    onChange={e=>setNewQ({...newQ, range: {...newQ.range, min: Number(e.target.value)}})}
                                                    className="w-full px-[16px] py-[12px] bg-[#0B0F14] border border-[#1F2937] rounded-[8px] text-[14px] text-[#F9FAFB] focus:border-[#7C3AED] focus:outline-none transition-all font-mono"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-[8px]">
                                                <label className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-widest px-[4px]">Maximum Bound</label>
                                                <input 
                                                    type="number"
                                                    value={newQ.range.max}
                                                    onChange={e=>setNewQ({...newQ, range: {...newQ.range, max: Number(e.target.value)}})}
                                                    className="w-full px-[16px] py-[12px] bg-[#0B0F14] border border-[#1F2937] rounded-[8px] text-[14px] text-[#F9FAFB] focus:border-[#7C3AED] focus:outline-none transition-all font-mono"
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

                        <div className="flex flex-col gap-[16px]">
                            {activeRoleFilter === 'leaderboard' ? (
                                <FunLeaderboard />
                            ) : (
                                <>
                                    {questions.filter(q => q.year === tabYear && (isFunTab ? q.role === 'fun' : q.role === activeRoleFilter)).length === 0 ? (
                                        <div className="py-[48px] text-center text-[#9CA3AF] text-[14px] border border-dashed border-[#1F2937] rounded-[12px]">
                                            No scenarios created for {isFunTab ? 'this Experimental Round' : activeRoleFilter.toUpperCase()} yet. Click "Add Scenario" to initiate.
                                        </div>
                                    ) : (
                                        (isFunTab ? funQs : questions.filter(q => q.year === tabYear && q.role === activeRoleFilter)).map((q, i) => {
                                            const isCurrent = isFunTab && settings?.activeFunQuestionId === q.questionId;
                                            const isDone = isFunTab && currentFunIdx >= 0 && i < currentFunIdx;
                                            const isNext = isFunTab && currentFunIdx >= 0 && i === currentFunIdx + 1;

                                            return (
                                            <div key={i} className={`p-[24px] rounded-[12px] border flex flex-col md:flex-row items-start justify-between gap-[24px] group transition-all duration-300 ${
                                                isCurrent
                                                    ? 'bg-yellow-500/5 border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.08)]'
                                                    : isDone
                                                    ? 'bg-emerald-500/3 border-emerald-500/15'
                                                    : 'bg-[#111827] border-[#1F2937] hover:bg-[#1F2937]/50 hover:border-[#7C3AED]/30'
                                            }`}>
                                                <div className="flex-1 w-full">
                                                    <div className="flex items-center gap-[12px] mb-[16px]">
                                                        {isFunTab ? (
                                                            <>
                                                                <span className={`w-[32px] h-[32px] rounded-[8px] flex items-center justify-center text-[14px] font-black shrink-0 transition-all ${
                                                                    isCurrent ? 'bg-yellow-500 text-black shadow-[0_0_12px_rgba(234,179,8,0.4)]'
                                                                    : isDone ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                                    : 'bg-[#1F2937] text-[#9CA3AF]'
                                                                }`}>{i + 1}</span>
                                                                {isCurrent && (
                                                                    <span className="text-[10px] font-black bg-yellow-500 text-black px-[10px] py-[3px] rounded-full uppercase tracking-wider animate-pulse">LIVE NOW</span>
                                                                )}
                                                                {isDone && (
                                                                    <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 px-[10px] py-[3px] rounded-full border border-emerald-500/20 uppercase tracking-wider flex items-center gap-[4px]">
                                                                        <FiCheckCircle size={10} /> Done
                                                                    </span>
                                                                )}
                                                                {isNext && (
                                                                    <span className="text-[10px] font-bold bg-[#1F2937] text-[#9CA3AF] px-[10px] py-[3px] rounded-full border border-[#374151] uppercase tracking-wider flex items-center gap-[4px]">
                                                                        <FiSkipForward size={10} /> Up Next
                                                                    </span>
                                                                )}
                                                                {(() => {
                                                                    const count = teams.filter(t => {
                                                                        const yd = t.gameState?.[`year${tabYear}`];
                                                                        if (!yd?.answers) return false;
                                                                        return ['cto','cfo','pm'].some(r => yd.answers[r]?.[q.questionId] !== undefined);
                                                                    }).length;
                                                                    return count > 0 ? (
                                                                        <span className="text-[10px] font-bold text-[#6B7280] ml-auto">{count} answered</span>
                                                                    ) : null;
                                                                })()}
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span className="px-[12px] py-[4px] rounded-[4px] text-[10px] font-bold uppercase tracking-wider border bg-[#7C3AED]/10 text-[#7C3AED] border-[#7C3AED]/20">
                                                                    {q.role}
                                                                </span>
                                                                <span className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-widest flex items-center">
                                                                    <FiAward className="mr-[8px] text-[#7C3AED]" size={14} /> {q.scoringRubric?.full || 0} pts
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                    <p className="text-[18px] font-semibold text-[#F9FAFB] leading-tight mb-[20px] transition-colors">{q.question}</p>
                                                    {q.assetUrl && (
                                                        <div className="mb-[16px] rounded-[10px] overflow-hidden border border-[#1F2937] bg-[#0B0F14] inline-block">
                                                            <img src={q.assetUrl} alt="" className="max-w-[200px] max-h-[120px] object-contain" />
                                                        </div>
                                                    )}
                                                    <div className="flex flex-wrap gap-[12px]">
                                                        {['range', 'numerical', 'text'].includes(q.type) ? (
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
                                                <div className={`flex flex-col gap-[8px] transition-all duration-300 ${isFunTab ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                    <button
                                                        onClick={() => handleEditClick(q)}
                                                        className="p-[12px] rounded-[8px] bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white transition-all border border-brand-primary/20"
                                                        title="Edit"
                                                    >
                                                        <FiRefreshCw size={16} />
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
                                            );
                                        })
                                    )}
                                </>
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
                                    placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
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
                            <p className="text-[14px] text-[#9CA3AF]">Irreversible actions. Double confirmation required.</p>
                        </div>

                        <div className="flex flex-col gap-[16px]">
                            {/* Partial Reset */}
                            <div className="flex items-center justify-between p-[16px] bg-[#0B0F14] rounded-[12px] border border-[#1F2937]">
                                <div>
                                    <p className="text-[14px] font-semibold text-[#F9FAFB]">Reset All Progress</p>
                                    <p className="text-[12px] text-[#6B7280]">Wipes all scores, submissions & round data. Keeps teams & questions intact.</p>
                                </div>
                                <button
                                    onClick={() => handleReset('partial')}
                                    className="shrink-0 ml-[16px] px-[20px] py-[10px] bg-red-500/10 border border-red-500/30 text-red-400 text-[12px] font-bold uppercase tracking-wider rounded-[10px] hover:bg-red-500/20 hover:border-red-500/50 transition-all"
                                >
                                    Reset Progress
                                </button>
                            </div>

                        </div>
                     </Card>
                </div>
            )}

            {activeTab === 'register' && (
                <div className="max-w-[1100px] mx-auto animate-in fade-in duration-500">
                    <div className="mb-[28px]">
                        <h2 className="text-[28px] font-bold text-[#F9FAFB] tracking-tight">Teams & Credentials</h2>
                        <p className="text-[14px] text-[#9CA3AF] mt-[4px]">Register new teams and view/copy login credentials for all participants.</p>
                    </div>

                    <div className="flex flex-col gap-[24px]">

                        {/* ── Registration Form ── */}
                        <Card className="p-[32px]">
                            <h3 className="text-[16px] font-bold text-[#F9FAFB] mb-[20px] flex items-center gap-[8px]">
                                <FiPlus size={16} className="text-[#7C3AED]" /> Register New Team
                            </h3>
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                try {
                                    const res = await adminAPI.registerTeam(newTeam);
                                    setCreatedTeamId(res.data.teamId);
                                    setMsg({ type: 'success', text: `Team registered! ID: ${res.data.teamId}` });
                                    const tms = await adminAPI.getTeams();
                                    setTeams(tms.data.teams || []);
                                } catch (err) {
                                    setMsg({ type: 'error', text: err.response?.data?.error || 'Registration failed.' });
                                }
                            }} className="flex flex-col gap-[20px]">

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-[16px]">
                                    <div className="flex flex-col gap-[6px]">
                                        <label className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider">Team Name</label>
                                        <input
                                            type="text"
                                            placeholder="Enter team name"
                                            value={newTeam.teamName}
                                            onChange={e => setNewTeam({...newTeam, teamName: e.target.value})}
                                            className="w-full px-[14px] py-[10px] bg-[#0B0F14] border border-[#1F2937] rounded-[8px] text-[14px] text-[#F9FAFB] focus:border-[#7C3AED] focus:outline-none transition-all"
                                            required
                                        />
                                    </div>
                                    <div className="flex flex-col gap-[6px]">
                                        <label className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider">College</label>
                                        <input
                                            type="text"
                                            placeholder="College name"
                                            value={newTeam.college || ''}
                                            onChange={e => setNewTeam({...newTeam, college: e.target.value})}
                                            className="w-full px-[14px] py-[10px] bg-[#0B0F14] border border-[#1F2937] rounded-[8px] text-[14px] text-[#F9FAFB] focus:border-[#7C3AED] focus:outline-none transition-all"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-[6px]">
                                        <label className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider">Department</label>
                                        <input
                                            type="text"
                                            placeholder="Department"
                                            value={newTeam.department || ''}
                                            onChange={e => setNewTeam({...newTeam, department: e.target.value})}
                                            className="w-full px-[14px] py-[10px] bg-[#0B0F14] border border-[#1F2937] rounded-[8px] text-[14px] text-[#F9FAFB] focus:border-[#7C3AED] focus:outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-[12px]">
                                    {newTeam.members.map((member, idx) => (
                                        <div key={idx} className="p-[16px] bg-[#0B0F14] rounded-[10px] border border-[#1F2937] flex flex-col gap-[12px]">
                                            <span className="text-[11px] font-bold text-[#7C3AED] uppercase tracking-widest">{member.role}</span>
                                            <input
                                                type="text"
                                                placeholder="Member name"
                                                value={member.name}
                                                onChange={e => {
                                                    const m = [...newTeam.members];
                                                    m[idx].name = e.target.value;
                                                    setNewTeam({...newTeam, members: m});
                                                }}
                                                className="w-full px-[12px] py-[8px] bg-[#111827] border border-[#1F2937] rounded-[6px] text-[13px] text-[#F9FAFB] focus:border-[#7C3AED] focus:outline-none transition-all"
                                                required
                                            />
                                            <input
                                                type="text"
                                                placeholder="Password"
                                                value={member.password}
                                                onChange={e => {
                                                    const m = [...newTeam.members];
                                                    m[idx].password = e.target.value;
                                                    setNewTeam({...newTeam, members: m});
                                                }}
                                                className="w-full px-[12px] py-[8px] bg-[#111827] border border-[#1F2937] rounded-[6px] text-[13px] text-[#F9FAFB] focus:border-[#7C3AED] focus:outline-none transition-all font-mono"
                                                required
                                            />
                                        </div>
                                    ))}
                                </div>

                                <Button type="submit" className="w-full h-[48px]">
                                    <FiPlus size={18} className="mr-[8px]" />
                                    <span className="text-[14px] font-bold uppercase tracking-wider">Register Team</span>
                                </Button>
                            </form>
                        </Card>

                        {/* ── Newly Created Team Banner ── */}
                        {createdTeamId && (
                            <Card className="p-[28px] border-emerald-500/20 bg-emerald-500/5">
                                <div className="flex items-center gap-[12px] mb-[20px]">
                                    <FiCheckCircle className="text-emerald-500" size={22} />
                                    <h3 className="text-[16px] font-bold text-emerald-400">Team Registered Successfully</h3>
                                </div>
                                <div className="bg-[#0B0F14] border border-emerald-500/20 rounded-[10px] p-[20px] text-center mb-[20px]">
                                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block mb-[6px]">Team ID — share with all members</span>
                                    <span className="text-[32px] font-mono font-bold text-[#F9FAFB]">{createdTeamId}</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-[12px] mb-[16px]">
                                    {newTeam.members.map((member, idx) => (
                                        <div key={idx} className="bg-[#0B0F14] border border-[#1F2937] rounded-[10px] p-[16px] flex flex-col gap-[8px]">
                                            <span className="text-[10px] font-bold text-[#7C3AED] uppercase tracking-widest">{member.role}</span>
                                            <div className="text-[13px] font-semibold text-[#F9FAFB]">{member.name}</div>
                                            <div className="flex items-center gap-[6px]">
                                                <span className="text-[13px] font-mono font-bold text-emerald-400 bg-emerald-400/5 px-[8px] py-[3px] rounded border border-emerald-400/20 flex-1">{member.password}</span>
                                                <button onClick={() => copyToClipboard(member.password, "Password")} className="p-[4px] text-[#6B7280] hover:text-emerald-400 transition-all"><FiCopy size={13} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={() => {
                                        setCreatedTeamId(null);
                                        setNewTeam({ teamName: '', domain: '', college: '', department: '', population: 100, members: [{ name: '', role: 'cto', password: '' }, { name: '', role: 'cfo', password: '' }, { name: '', role: 'pm', password: '' }] });
                                    }}
                                    className="text-[12px] text-[#6B7280] hover:text-[#9CA3AF] transition-all"
                                >
                                    Dismiss
                                </button>
                            </Card>
                        )}

                        {/* ── All Teams with Credentials ── */}
                        <div>
                            <div className="flex items-center justify-between mb-[16px]">
                                <h3 className="text-[16px] font-bold text-[#F9FAFB]">All Teams ({teams.length})</h3>
                                <button
                                    onClick={() => {
                                        const newState = !showRegistryPasswords;
                                        setShowRegistryPasswords(newState);
                                        const nextVisible = {};
                                        teams.forEach(t => t.members.forEach((m, idx) => { nextVisible[`${t._id || t.teamId}-${idx}`] = newState; }));
                                        setVisiblePasswords(nextVisible);
                                    }}
                                    className="flex items-center gap-[6px] text-[12px] font-medium text-[#7C3AED] hover:text-[#A78BFA] transition-all"
                                >
                                    {showRegistryPasswords ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                                    {showRegistryPasswords ? 'Hide All Passwords' : 'Show All Passwords'}
                                </button>
                            </div>

                            {teams.length === 0 ? (
                                <Card className="p-[48px] text-center">
                                    <p className="text-[14px] text-[#6B7280]">No teams registered yet.</p>
                                </Card>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
                                    {teams.map((team) => (
                                        <Card key={team._id || team.teamId} className="p-[20px] hover:border-[#7C3AED]/20 transition-all">
                                            {/* Team header */}
                                            <div className="flex items-start justify-between mb-[14px]">
                                                <div>
                                                    <div className="flex items-center gap-[8px] mb-[2px]">
                                                        <span className="text-[15px] font-bold text-[#F9FAFB]">{team.teamName}</span>
                                                        <span className="text-[10px] font-bold text-[#7C3AED] bg-[#7C3AED]/10 px-[6px] py-[1px] rounded border border-[#7C3AED]/20">{team.points || 0} pts</span>
                                                    </div>
                                                    <div className="flex items-center gap-[6px]">
                                                        <span className="text-[12px] font-mono text-[#7C3AED]">{team.teamId}</span>
                                                        <button onClick={() => copyToClipboard(team.teamId, "Team ID")} className="text-[#4B5563] hover:text-[#7C3AED] transition-all"><FiCopy size={11} /></button>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-[6px]">
                                                    <span className={`text-[10px] font-bold uppercase px-[8px] py-[3px] rounded-full ${
                                                        team.status === 'registered' ? 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20' :
                                                        team.status === 'playing' ? 'text-amber-400 bg-amber-400/10 border border-amber-400/20' :
                                                        'text-[#6B7280] bg-[#1F2937] border border-[#374151]'
                                                    }`}>
                                                        {team.status || 'registered'}
                                                    </span>
                                                    <button
                                                        onClick={async () => {
                                                            if (!window.confirm(`Delete team "${team.teamName}" (${team.teamId})? This removes the team and all their submissions permanently.`)) return;
                                                            try {
                                                                await adminAPI.deleteTeam(team.teamId);
                                                                setTeams(prev => prev.filter(t => t.teamId !== team.teamId));
                                                                setMsg({ type: 'success', text: `Team ${team.teamName} deleted.` });
                                                            } catch (err) {
                                                                setMsg({ type: 'error', text: err.response?.data?.error || 'Delete failed.' });
                                                            }
                                                        }}
                                                        className="p-[4px] text-[#374151] hover:text-red-500 transition-all"
                                                        title="Delete team"
                                                    >
                                                        <FiTrash2 size={13} />
                                                    </button>
                                                </div>
                                            </div>

                                            {team.college && (
                                                <p className="text-[11px] text-[#6B7280] mb-[12px]">{team.college}{team.department ? ` — ${team.department}` : ''}</p>
                                            )}

                                            {/* Members with passwords */}
                                            <div className="flex flex-col gap-[8px]">
                                                {team.members.map((member, mIdx) => {
                                                    const passKey = `${team._id || team.teamId}-${mIdx}`;
                                                    const passVisible = showRegistryPasswords || visiblePasswords[passKey];
                                                    return (
                                                        <div key={mIdx} className="flex items-center gap-[10px] p-[10px] bg-[#0B0F14] rounded-[8px] border border-[#1F2937]">
                                                            <span className="text-[9px] font-bold text-[#7C3AED] bg-[#7C3AED]/10 px-[6px] py-[2px] rounded uppercase w-[36px] text-center shrink-0">{member.role}</span>
                                                            <span className="text-[13px] text-[#D1D5DB] font-medium min-w-[80px]">{member.name || '—'}</span>
                                                            <div className="flex-1 flex items-center gap-[6px] ml-auto justify-end">
                                                                {member.password ? (
                                                                    <>
                                                                        <span className={`text-[12px] font-mono ${passVisible ? 'text-emerald-400' : 'text-[#374151]'}`}>
                                                                            {passVisible ? member.password : '••••••••'}
                                                                        </span>
                                                                        <button onClick={() => copyToClipboard(member.password, `${member.name}'s password`)} className="p-[3px] text-[#4B5563] hover:text-emerald-400 transition-all" title="Copy password"><FiCopy size={12} /></button>
                                                                        <button onClick={() => setVisiblePasswords(prev => ({ ...prev, [passKey]: !prev[passKey] }))} className="p-[3px] text-[#4B5563] hover:text-[#7C3AED] transition-all">{passVisible ? <FiEyeOff size={12} /> : <FiEye size={12} />}</button>
                                                                    </>
                                                                ) : (
                                                                    <div className="flex items-center gap-[6px]">
                                                                        {member.hasPassword && <span className="text-[11px] text-[#6B7280] italic">Encrypted</span>}
                                                                        <button
                                                                            onClick={async () => {
                                                                                const np = prompt(`${member.password ? 'Reset' : 'Set'} password for ${member.name} (${member.role.toUpperCase()}):`);
                                                                                if (!np || np.length < 4) { if (np !== null) alert('Password must be at least 4 characters'); return; }
                                                                                try {
                                                                                    await adminAPI.resetPassword(team.teamId, member.role, np);
                                                                                    setMsg({ type: 'success', text: `Password set for ${member.name}` });
                                                                                    const res = await adminAPI.getTeams();
                                                                                    setTeams(res.data.teams || []);
                                                                                } catch (e) { setMsg({ type: 'error', text: 'Failed to set password' }); }
                                                                            }}
                                                                            className="flex items-center gap-[4px] px-[8px] py-[3px] bg-amber-500/10 text-amber-400 text-[10px] font-bold rounded border border-amber-500/20 hover:bg-amber-500/20 transition-all"
                                                                        >
                                                                            <FiRefreshCw size={10} /> {member.hasPassword ? 'Reset' : 'Set'}
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* FULL SCREEN LEADERBOARD OVERLAY */}
        {isFullScreenLeaderboard && (
            <div className="fixed inset-0 z-[9999] bg-[#030712] flex flex-col animate-in fade-in duration-500 overflow-hidden">

                {/* LightRays Background */}
                <div className="absolute inset-0 z-0">
                    <LightRays
                        raysOrigin="top-center"
                        raysColor="#7C3AED"
                        raysSpeed={0.6}
                        lightSpread={2.5}
                        rayLength={1.5}
                        followMouse={true}
                        mouseInfluence={0.15}
                        noiseAmount={0.05}
                        distortion={0.03}
                        pulsating
                    />
                </div>

                <div className="absolute top-[24px] right-[24px] z-20">
                    <button
                        onClick={() => { setIsFullScreenLeaderboard(false); setFilteredRound(null); }}
                        className="w-48 h-48 bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-500 rounded-full flex items-center justify-center transition-all border border-white/10 hover:border-red-500/30 shadow-xl backdrop-blur-sm"
                    >
                        <FiX size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto hidden-scrollbar relative z-10 p-[24px] md:p-[48px]">
                    {leaderboardMode === 'standard' ? (
                        <Leaderboard isFullScreen={true} filterYear={filteredRound} />
                    ) : (
                        <FunLeaderboard isFullScreen={true} filterRound={filteredRound} />
                    )}
                </div>

            </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
