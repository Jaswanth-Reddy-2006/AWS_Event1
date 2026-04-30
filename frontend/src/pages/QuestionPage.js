import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import LockdownMode from '../components/LockdownMode';
import { useGameStore } from '../utils/store';
import { questionsAPI, submissionsAPI, adminAPI, authAPI } from '../utils/api';
import {
  FiAlertCircle, FiChevronRight, FiChevronLeft,
  FiCheckCircle, FiLoader, FiActivity, FiLock, FiSend,
  FiMaximize, FiLogOut, FiBookOpen, FiX
} from 'react-icons/fi';
import confetti from 'canvas-confetti';

const QuestionPage = () => {
  const { year } = useParams();
  const navigate = useNavigate();
  const { role, teamId, answers, setCurrentQuestions, setAnswer, setNextRoundSettings, setTabSwitchWarnings } = useGameStore();

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(1200);
  const [settingsReady, setSettingsReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  const [screenOutCount, setScreenOutCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [animDir, setAnimDir] = useState('right');
  const [animKey, setAnimKey] = useState(0);
  const [showHandbook, setShowHandbook] = useState(false);
  const contentRef = useRef(null);

  const enterFullscreen = useCallback(() => {
    const el = document.documentElement;
    (el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen)?.call(el);
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const handleExitQuiz = () => {
    if (window.confirm('Exit the round? Unsubmitted answers will be lost.')) {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      navigate('/profile');
    }
  };

  const handleDisqualify = useCallback(async (reason) => {
    if (submitting || submitted) return;
    setSubmitting(true);
    setError('Disqualified: ' + reason);
    try {
      await submissionsAPI.disqualify(year, reason);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      setTimeout(() => navigate('/profile'), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Disqualification failed.');
      setSubmitting(false);
    }
  }, [submitting, submitted, year, navigate]);

  const handleTabSwitch = useCallback(async (count, reason) => {
    setTabSwitchWarnings(count);
    setScreenOutCount(count);
    setShowWarning(true);
    try {
      const res = await submissionsAPI.reportScreenOut();
      if (res.data.count >= 5) {
        handleDisqualify('Exceeded maximum violations (5). Auto-disqualified.');
        return;
      }
    } catch (err) {
      console.error('Failed to report violation:', err);
    }
    if (count >= 5) handleDisqualify(reason || 'Maximum security violations exceeded');
  }, [setTabSwitchWarnings, handleDisqualify]);

  const handleSubmit = useCallback(async () => {
    if (submitting || submitted) return;

    const unanswered = questions
      .map((q, i) => (!answers[q.questionId] && answers[q.questionId] !== 0) ? i + 1 : null)
      .filter(Boolean);

    if (unanswered.length > 0 && timeLeft > 0) {
      setError(`Answer question${unanswered.length > 1 ? 's' : ''} ${unanswered.join(', ')} before submitting.`);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await submissionsAPI.submit(year, answers, 1200 - timeLeft);
      setSubmitted(true);
      const end = Date.now() + 2500;
      const burst = () => {
        confetti({ particleCount: 80, spread: 100, origin: { x: Math.random(), y: Math.random() * 0.4 }, colors: ['#7C3AED', '#3b82f6', '#f59e0b', '#10b981', '#ec4899'] });
        if (Date.now() < end) requestAnimationFrame(burst);
      };
      burst();
      setTimeout(() => {
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        navigate('/profile', { state: { submissionSuccess: true } });
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed. Try again.');
      setSubmitting(false);
    }
  }, [submitting, submitted, questions, answers, timeLeft, year, navigate]);

  useEffect(() => {
    let intervalId;
    const validateAndLoad = async () => {
      try {
        const [settingsRes, teamRes] = await Promise.all([
          adminAPI.getSettings(),
          authAPI.getTeam(teamId)
        ]);
        const settings = settingsRes.data;
        const teamData = teamRes.data;
        setNextRoundSettings(settings);

        if (teamData?.fraudFlags?.screenOuts) setScreenOutCount(teamData.fraudFlags.screenOuts);
        setSettingsReady(true);

        if (!settings.isRoundActive || settings.currentRound !== parseInt(year)) {
          if (!submitted) {
            if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
            navigate('/profile');
          }
          return;
        }

        const hasCompleted = Object.keys(teamData?.gameState?.[`year${year}`]?.answers?.[role?.toLowerCase()] || {}).length > 0;
        if (hasCompleted && !submitted) setSubmitted(true);

        if (questions.length === 0) {
          const response = await questionsAPI.getByYear(year, role);
          setQuestions(response.data.questions);
          setCurrentQuestions(response.data.questions);
        }
        setError('');
        setLoading(false);
      } catch (err) {
        if (loading) setError('Failed to connect. Check your network.');
        setLoading(false);
      }
    };

    if (year && role) {
      validateAndLoad();
      intervalId = setInterval(validateAndLoad, 15000);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, role, teamId, navigate, questions.length, setCurrentQuestions, submitted, setNextRoundSettings, setTabSwitchWarnings]);

  const timerHadTime = useRef(false);

  useEffect(() => {
    if (submitted || !settingsReady) return;
    const timer = setInterval(() => {
      const settings = useGameStore.getState().nextRoundSettings;
      if (settings?.roundStartedAt) {
        const deadline = new Date(settings.roundStartedAt).getTime() + 20 * 60 * 1000;
        const remaining = Math.max(0, Math.round((deadline - Date.now()) / 1000));
        if (remaining > 0) {
          timerHadTime.current = true;
        } else if (!timerHadTime.current) {
          clearInterval(timer);
          if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
          navigate('/profile');
          return;
        }
        setTimeLeft(remaining);
      } else {
        setTimeLeft(prev => {
          if (prev > 1) timerHadTime.current = true;
          return prev > 0 ? prev - 1 : 0;
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [submitted, settingsReady, navigate]);

  const hasLoadedQuestions = useRef(false);
  useEffect(() => {
    if (questions.length > 0) hasLoadedQuestions.current = true;
  }, [questions.length]);

  useEffect(() => {
    if (timeLeft === 0 && !submitting && !submitted && settingsReady && hasLoadedQuestions.current && timerHadTime.current) handleSubmit();
  }, [timeLeft, submitting, submitted, settingsReady, handleSubmit]);

  const goToQuestion = (index) => {
    if (index === currentIndex) return;
    setAnimDir(index > currentIndex ? 'right' : 'left');
    setAnimKey(k => k + 1);
    setCurrentIndex(index);
    setError('');
    if (contentRef.current) contentRef.current.scrollTop = 0;
  };

  const setAnswerInternal = (questionId, answer) => {
    if (submitted) return;
    setAnswer(questionId, answer);
    setError('');
  };

  const currentQuestion = questions[currentIndex];
  const isFunRound = parseInt(year) >= 5;

  const answeredCount = questions.filter(q => answers[q.questionId] !== undefined && answers[q.questionId] !== '').length;

  const renderOptions = () => {
    if (!currentQuestion) return null;

    switch (currentQuestion.type) {
      case 'mcq':
        return (
          <div className="space-y-[10px]">
            {currentQuestion.options.map((opt) => {
              const isSelected = answers[currentQuestion.questionId] === opt.optionId;
              return (
                <button
                  key={opt.optionId}
                  onClick={() => setAnswerInternal(currentQuestion.questionId, opt.optionId)}
                  className="w-full text-left group"
                >
                  <div
                    className="flex items-start gap-[14px] p-[16px] rounded-[12px] border-2 transition-all duration-200"
                    style={{
                      background: isSelected ? 'rgba(124,58,237,0.08)' : '#111827',
                      borderColor: isSelected ? '#7C3AED' : '#1F2937',
                      boxShadow: isSelected ? '0 0 20px rgba(124,58,237,0.12)' : 'none',
                    }}
                  >
                    <div
                      className="w-[28px] h-[28px] rounded-[8px] flex items-center justify-center font-bold text-[13px] shrink-0 transition-all duration-200"
                      style={{
                        background: isSelected ? '#7C3AED' : '#1F2937',
                        color: isSelected ? '#fff' : '#9CA3AF',
                      }}
                    >
                      {opt.optionId}
                    </div>
                    <span className={`text-[14px] leading-[1.6] pt-[3px] ${isSelected ? 'text-[#F9FAFB] font-medium' : 'text-[#D1D5DB] group-hover:text-[#F9FAFB]'}`}>
                      {opt.text}
                    </span>
                    {isSelected && <FiCheckCircle className="text-[#7C3AED] shrink-0 ml-auto mt-[4px]" size={16} />}
                  </div>
                </button>
              );
            })}
          </div>
        );

      case 'truefalse':
        return (
          <div className="flex gap-[16px] max-w-[400px]">
            {['True', 'False'].map((val) => {
              const isSelected = answers[currentQuestion.questionId] === val;
              const isTrue = val === 'True';
              const color = isTrue ? '#10b981' : '#ef4444';
              return (
                <button
                  key={val}
                  onClick={() => setAnswerInternal(currentQuestion.questionId, val)}
                  className="flex-1 py-[20px] rounded-[14px] border-2 flex flex-col items-center gap-[8px] transition-all duration-200"
                  style={{
                    background: isSelected ? `${color}12` : '#111827',
                    borderColor: isSelected ? color : '#1F2937',
                    boxShadow: isSelected ? `0 0 24px ${color}18` : 'none',
                  }}
                >
                  <span className="text-[28px] font-black" style={{ color: isSelected ? color : '#374151' }}>
                    {isTrue ? 'YES' : 'NO'}
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: isSelected ? color : '#6B7280' }}>
                    {val}
                  </span>
                </button>
              );
            })}
          </div>
        );

      case 'multi-select':
        return (
          <div className="space-y-[12px]">
            <div className="flex items-center gap-[8px] text-[#A78BFA] text-[12px] font-medium px-[12px] py-[8px] bg-[#7C3AED]/8 rounded-[8px] border border-[#7C3AED]/15">
              <FiActivity size={13} className="shrink-0" />
              <span>Select all that apply — multiple answers may be correct</span>
            </div>
            <div className="space-y-[8px]">
              {currentQuestion.options.map((opt) => {
                const currentAnswers = answers[currentQuestion.questionId] || [];
                const isSelected = currentAnswers.includes(opt.optionId);
                return (
                  <button
                    key={opt.optionId}
                    onClick={() => {
                      const next = isSelected
                        ? currentAnswers.filter(id => id !== opt.optionId)
                        : [...currentAnswers, opt.optionId];
                      setAnswerInternal(currentQuestion.questionId, next);
                    }}
                    className="w-full text-left"
                  >
                    <div
                      className="flex items-center gap-[12px] p-[14px] rounded-[12px] border-2 transition-all duration-200"
                      style={{
                        background: isSelected ? 'rgba(124,58,237,0.08)' : '#111827',
                        borderColor: isSelected ? '#7C3AED' : '#1F2937',
                      }}
                    >
                      <div
                        className="w-[22px] h-[22px] rounded-[6px] border-2 flex items-center justify-center shrink-0 transition-all"
                        style={{
                          background: isSelected ? '#7C3AED' : 'transparent',
                          borderColor: isSelected ? '#7C3AED' : '#374151',
                        }}
                      >
                        {isSelected && <FiCheckCircle size={12} className="text-white" />}
                      </div>
                      <span className={`text-[14px] ${isSelected ? 'text-[#F9FAFB] font-medium' : 'text-[#D1D5DB]'}`}>
                        {opt.text}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 'range':
        return (
          <div className="max-w-[700px] p-[32px] bg-[#111827] border border-[#1F2937] rounded-[24px] space-y-[40px]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[32px]">
              <div className="space-y-[12px]">
                <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest">Lower Bound Threshold</label>
                <div className="relative group">
                  <input
                    type="number"
                    value={answers[currentQuestion.questionId]?.min || ''}
                    onChange={(e) => {
                      const current = answers[currentQuestion.questionId] || { min: '', max: '' };
                      setAnswerInternal(currentQuestion.questionId, { ...current, min: e.target.value });
                    }}
                    className="w-full bg-[#030712] border-2 border-[#1F2937] rounded-[16px] py-[20px] px-[24px] text-[32px] font-bold text-[#F9FAFB] focus:border-[#7C3AED] outline-none transition-all"
                    placeholder="0"
                  />
                  <div className="absolute right-[20px] top-1/2 -translate-y-1/2 text-[#9CA3AF]/20 font-bold">MIN</div>
                </div>
              </div>
              <div className="space-y-[12px]">
                <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest">Upper Bound Threshold</label>
                <div className="relative group">
                  <input
                    type="number"
                    value={answers[currentQuestion.questionId]?.max || ''}
                    onChange={(e) => {
                      const current = answers[currentQuestion.questionId] || { min: '', max: '' };
                      setAnswerInternal(currentQuestion.questionId, { ...current, max: e.target.value });
                    }}
                    className="w-full bg-[#030712] border-2 border-[#1F2937] rounded-[16px] py-[20px] px-[24px] text-[32px] font-bold text-[#F9FAFB] focus:border-[#7C3AED] outline-none transition-all"
                    placeholder="100"
                  />
                  <div className="absolute right-[20px] top-1/2 -translate-y-1/2 text-[#9CA3AF]/20 font-bold">MAX</div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'numerical':
        return (
          <div className="max-w-[400px]">
            <div className="relative group">
              <input
                type="number"
                value={answers[currentQuestion.questionId] || ''}
                onChange={(e) => setAnswerInternal(currentQuestion.questionId, e.target.value)}
                className="w-full bg-[#111827] border-2 border-[#1F2937] rounded-[20px] py-[24px] px-[32px] text-[40px] font-bold text-[#F9FAFB] focus:border-[#7C3AED] outline-none transition-all text-center focus:shadow-[0_0_30px_rgba(124,58,237,0.1)]"
                placeholder="ENTER VALUE"
              />
              <div className="absolute inset-x-0 -bottom-[12px] flex justify-center">
                <span className="bg-[#7C3AED] text-white text-[10px] font-bold py-[4px] px-[12px] rounded-full uppercase tracking-widest">Numerical Input</span>
              </div>
            </div>
          </div>
        );

      case 'text':
        return (
          <div className="max-w-[600px] space-y-[16px]">
            <div className="relative group">
              <input
                type="text"
                value={answers[currentQuestion.questionId] || ''}
                onChange={(e) => setAnswerInternal(currentQuestion.questionId, e.target.value)}
                className="w-full bg-[#111827] border-2 border-[#1F2937] rounded-[20px] py-[24px] px-[32px] text-[24px] font-bold text-[#F9FAFB] focus:border-[#7C3AED] outline-none transition-all focus:shadow-[0_0_30px_rgba(124,58,237,0.1)]"
                placeholder="Enter response here..."
              />
            </div>
            <p className="text-[10px] text-[#9CA3AF] uppercase tracking-widest font-bold px-[8px] opacity-60 italic">Note: Response is case-insensitive.</p>
          </div>
        );

      case 'rating':
        return (
          <div className="w-full max-w-[800px]">
            <div className="flex flex-wrap gap-[12px]">
              {currentQuestion.options.map((opt, i) => {
                const isSelected = answers[currentQuestion.questionId] === opt.optionId;
                const colors = [
                  { bg: '#ef4444', glow: 'rgba(239,68,68,0.2)' },
                  { bg: '#f97316', glow: 'rgba(249,115,22,0.2)' },
                  { bg: '#f59e0b', glow: 'rgba(245,158,11,0.2)' },
                  { bg: '#10b981', glow: 'rgba(16,185,129,0.2)' },
                  { bg: '#7C3AED', glow: 'rgba(124,58,237,0.2)' },
                ];
                const color = colors[i % colors.length];
                return (
                  <button
                    key={opt.optionId}
                    onClick={() => setAnswerInternal(currentQuestion.questionId, opt.optionId)}
                    className="flex-1 min-w-[120px] py-[20px] px-[16px] rounded-[16px] border-2 flex flex-col items-center justify-center gap-[8px] transition-all duration-200"
                    style={{
                      background: isSelected ? `${color.bg}15` : '#111827',
                      borderColor: isSelected ? color.bg : '#1F2937',
                      boxShadow: isSelected ? `0 0 24px ${color.glow}` : 'none',
                      transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                    }}
                  >
                    <span className="text-[24px] font-black transition-all" style={{ color: isSelected ? color.bg : '#374151' }}>
                      {opt.optionId}
                    </span>
                    <span className={`text-[13px] font-bold uppercase tracking-wide ${isSelected ? 'text-[#F9FAFB]' : 'text-[#6B7280]'}`}>
                      {opt.text}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );

      default:
        return <p className="text-[#9CA3AF]">Unknown question type.</p>;
    }
  };

  // ─── Render ───

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070B14] flex flex-col items-center justify-center gap-[20px]">
        <FiLoader className="w-[40px] h-[40px] text-[#7C3AED] animate-spin" />
        <p className="text-[13px] font-medium text-[#9CA3AF] tracking-wider">Loading questions...</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#070B14] flex flex-col items-center justify-center p-[40px] text-center">
        <div className="w-[72px] h-[72px] rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-[24px]">
          <FiCheckCircle size={36} className="text-emerald-500" />
        </div>
        <h2 className="text-[28px] font-bold text-emerald-400 mb-[12px]">Answers Submitted</h2>
        <p className="text-[14px] text-[#9CA3AF] mb-[24px]">Your responses have been recorded. Redirecting...</p>
        <div className="flex items-center gap-[10px] px-[16px] py-[10px] bg-[#111827] border border-[#1F2937] rounded-[10px]">
          <div className="w-[6px] h-[6px] bg-[#7C3AED] rounded-full animate-ping" />
          <span className="text-[12px] text-[#9CA3AF] font-medium">Syncing with server...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#070B14] text-[#F9FAFB] font-sans flex flex-col overflow-hidden select-none">
      <LockdownMode onTabSwitch={handleTabSwitch} onWarning={(msg) => setError(msg)} />

      {/* ── Violation Warning Overlay ── */}
      {showWarning && !submitted && (
        <div className="fixed inset-0 z-[100] bg-[#070B14]/85 backdrop-blur-md flex items-center justify-center p-[24px]">
          <div className="w-full max-w-[420px] bg-[#111827] border border-red-500/25 rounded-[20px] p-[36px] text-center">
            <div className="w-[64px] h-[64px] bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-[20px]">
              <FiAlertCircle className="text-red-500" size={32} />
            </div>
            <h2 className="text-[20px] font-bold text-white mb-[8px]">Security Violation</h2>
            <p className="text-[13px] text-[#9CA3AF] mb-[20px] leading-relaxed">
              Leaving fullscreen or switching tabs is a violation. This has been logged.
            </p>
            <div className="flex items-center justify-center gap-[6px] mb-[20px]">
              {[1, 2, 3, 4, 5].map(i => (
                <div
                  key={i}
                  className="w-[10px] h-[10px] rounded-full transition-all"
                  style={{
                    background: i <= screenOutCount ? '#ef4444' : '#374151',
                    boxShadow: i <= screenOutCount ? '0 0 6px rgba(239,68,68,0.5)' : 'none',
                  }}
                />
              ))}
            </div>
            <p className="text-[12px] text-red-400 font-medium mb-[24px]">
              {screenOutCount >= 4 ? 'FINAL WARNING — next violation = disqualification' : `Strike ${screenOutCount}/5`}
            </p>
            <button
              onClick={() => { setShowWarning(false); enterFullscreen(); }}
              className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold py-[14px] rounded-[12px] transition-all text-[13px]"
            >
              Return to Fullscreen
            </button>
          </div>
        </div>
      )}

      {/* ── Fullscreen Required Overlay ── */}
      {!isFullscreen && !submitted && !showWarning && (
        <div className="fixed inset-0 z-[90] bg-[#070B14]/80 backdrop-blur-md flex items-center justify-center">
          <div className="text-center p-[36px] bg-[#111827] border border-[#1F2937] rounded-[20px] max-w-[380px]">
            <FiLock className="text-[#7C3AED] mx-auto mb-[16px]" size={40} />
            <h2 className="text-[18px] font-bold text-white mb-[8px]">Fullscreen Required</h2>
            <p className="text-[#9CA3AF] text-[13px] mb-[24px]">This round must be completed in fullscreen mode.</p>
            <button
              onClick={enterFullscreen}
              className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-[28px] py-[12px] rounded-[12px] font-bold text-[13px] transition-all"
            >
              <FiMaximize className="inline mr-[8px]" size={14} />
              Enter Fullscreen
            </button>
          </div>
        </div>
      )}

      <div className="h-[52px] border-b border-[#1F2937] bg-[#0B0F14] flex items-center justify-between px-[20px] shrink-0 z-50">
        {!isFullscreen ? (
          <>
            <div className="flex items-center gap-[16px]">
              <div className="flex items-center gap-[8px]">
                <div className="w-[8px] h-[8px] bg-[#7C3AED] rounded-full animate-pulse" />
                <span className="text-[13px] font-bold text-[#F9FAFB]">
                  {isFunRound ? `Fun Round ${parseInt(year) - 4}` : `Round ${parseInt(year) + 1}`}
                </span>
              </div>
              <div className="h-[16px] w-[1px] bg-[#1F2937]" />
              <span className="text-[11px] text-[#6B7280] font-medium uppercase">{role}</span>
            </div>

            <div className="flex items-center gap-[16px]">
              {error && (
                <div className="flex items-center gap-[6px] text-red-400 text-[11px] font-medium max-w-[300px] truncate">
                  <FiAlertCircle size={13} className="shrink-0" />
                  <span className="truncate">{error}</span>
                </div>
              )}

              <button 
                onClick={() => setShowHandbook(!showHandbook)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  showHandbook 
                    ? 'bg-[#7C3AED] text-white' 
                    : 'bg-[#7C3AED]/10 text-[#A78BFA] border border-[#7C3AED]/20 hover:bg-[#7C3AED]/20'
                }`}
              >
                <FiBookOpen size={14} />
                {showHandbook ? 'Close Handbook' : 'Open Handbook'}
              </button>

              <button onClick={enterFullscreen} className="text-[#6B7280] hover:text-[#7C3AED] transition-colors p-[4px]" title="Fullscreen">
                <FiMaximize size={15} />
              </button>
              <button onClick={handleExitQuiz} className="text-[#6B7280] hover:text-red-400 transition-colors p-[4px]" title="Exit">
                <FiLogOut size={15} />
              </button>
            </div>
          </>
        ) : (
          /* Simplified Bar for Lockdown Mode */
          <>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowHandbook(!showHandbook)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-all ${
                  showHandbook 
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40' 
                    : 'bg-[#7C3AED] text-white shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:scale-105 active:scale-95'
                }`}
              >
                {showHandbook ? <FiX size={18} /> : <FiBookOpen size={18} />}
                {showHandbook ? 'CLOSE HANDBOOK' : 'OPEN HANDBOOK'}
              </button>
              {error && (
                <div className="flex items-center gap-2 text-red-400 text-xs font-bold bg-red-500/5 px-3 py-1.5 rounded-lg border border-red-500/10">
                  <FiAlertCircle size={14} className="shrink-0" />
                  <span className="uppercase tracking-wider">{error}</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Split Layout Container ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Side: Quiz Content */}
        <div className={`flex flex-col flex-1 overflow-hidden transition-all duration-500 ease-in-out ${showHandbook ? 'w-[55%]' : 'w-full'}`}>
          {/* ── Question Navigator ── */}
          <div className="border-b border-[#1F2937] bg-[#0B0F14] px-[20px] py-[10px] shrink-0 z-40">
            <div className="flex items-center gap-[6px] overflow-x-auto no-scrollbar">
              {questions.map((q, i) => {
                const isAnswered = answers[q.questionId] !== undefined && answers[q.questionId] !== '';
                const isCurrent = i === currentIndex;
                return (
                  <button
                    key={q.questionId}
                    onClick={() => goToQuestion(i)}
                    className="shrink-0 transition-all duration-200"
                    style={{
                      width: isCurrent ? '36px' : '28px',
                      height: isCurrent ? '36px' : '28px',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: isCurrent ? '13px' : '11px',
                      fontWeight: 700,
                      background: isCurrent ? '#7C3AED' : isAnswered ? 'rgba(16,185,129,0.1)' : '#111827',
                      border: `2px solid ${isCurrent ? '#7C3AED' : isAnswered ? 'rgba(16,185,129,0.3)' : '#1F2937'}`,
                      color: isCurrent ? '#fff' : isAnswered ? '#10b981' : '#6B7280',
                    }}
                  >
                    {i + 1}
                  </button>
                );
              })}
              <div className="ml-auto shrink-0 text-[11px] text-[#6B7280] font-medium pl-[12px]">
                {answeredCount}/{questions.length} answered
              </div>
            </div>
          </div>

          {/* ── Main Content ── */}
          <div className="flex-1 overflow-y-auto custom-scrollbar" ref={contentRef}>
            {currentQuestion && (
              <div
                key={animKey}
                className={`mx-auto px-[24px] py-[32px] md:px-[40px] md:py-[40px] transition-all duration-500 ${showHandbook ? 'max-w-full' : 'max-w-[760px]'}`}
                style={{
                  animation: `slideIn${animDir === 'right' ? 'Right' : 'Left'} 0.25s ease-out`,
                }}
              >
                {/* Question number + type badge */}
                <div className="flex items-center gap-[10px] mb-[16px]">
                  <span className="text-[12px] font-bold text-[#7C3AED]">Q{currentIndex + 1}</span>
                  <span className="text-[11px] text-[#6B7280] font-medium px-[8px] py-[2px] bg-[#111827] border border-[#1F2937] rounded-[6px]">
                    {currentQuestion.type === 'mcq' ? 'Multiple Choice'
                      : currentQuestion.type === 'truefalse' ? 'True / False'
                      : currentQuestion.type === 'multi-select' ? 'Multi-Select'
                      : currentQuestion.type === 'range' ? 'Range Input'
                      : currentQuestion.type === 'numerical' ? 'Numerical'
                      : currentQuestion.type === 'text' ? 'Text Response'
                      : currentQuestion.type === 'rating' ? 'Rating'
                      : currentQuestion.type}
                  </span>
                  {currentQuestion.points && (
                    <span className="text-[11px] text-[#f59e0b] font-bold">{currentQuestion.points} pts</span>
                  )}
                </div>

                {/* Asset (image/video) */}
                {currentQuestion.assetUrl && (
                  <div className="mb-[20px] rounded-[14px] overflow-hidden border border-[#1F2937] bg-[#0B0F14]">
                    {currentQuestion.assetUrl.includes('video') || currentQuestion.assetUrl.endsWith('.mp4') ? (
                      <video src={currentQuestion.assetUrl} controls className="max-w-full max-h-[320px] mx-auto" />
                    ) : (
                      <img src={currentQuestion.assetUrl} alt="" className="max-w-full max-h-[320px] mx-auto object-contain" />
                    )}
                  </div>
                )}

                {/* Question text */}
                <h2 className="text-[20px] md:text-[22px] font-semibold text-[#F9FAFB] leading-[1.5] mb-[28px]">
                  {currentQuestion.question}
                </h2>

                {/* Options */}
                {renderOptions()}
              </div>
            )}
          </div>

          {/* ── Bottom Navigation ── */}
          <div className="h-[60px] border-t border-[#1F2937] bg-[#0B0F14] flex items-center px-[20px] shrink-0 z-40">
            <div className={`mx-auto w-full flex items-center justify-between transition-all duration-500 ${showHandbook ? 'max-w-full' : 'max-w-[760px]'}`}>
              <button
                onClick={() => goToQuestion(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                className={`flex items-center gap-[6px] px-[16px] py-[8px] rounded-[10px] text-[13px] font-medium transition-all ${
                  currentIndex === 0
                    ? 'opacity-25 cursor-not-allowed text-[#6B7280]'
                    : 'text-[#D1D5DB] hover:text-white hover:bg-white/5'
                }`}
              >
                <FiChevronLeft size={16} />
                Previous
              </button>

              <div className="flex items-center gap-[10px]">
                {currentIndex < questions.length - 1 ? (
                  <button
                    onClick={() => goToQuestion(Math.min(questions.length - 1, currentIndex + 1))}
                    className="flex items-center gap-[6px] bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-[20px] py-[9px] rounded-[10px] font-bold text-[13px] transition-all"
                  >
                    Next
                    <FiChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex items-center gap-[6px] bg-emerald-600 hover:bg-emerald-700 text-white px-[20px] py-[9px] rounded-[10px] font-bold text-[13px] transition-all disabled:opacity-50"
                  >
                    {submitting ? <FiLoader className="animate-spin" size={14} /> : <FiSend size={14} />}
                    Submit Answers
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Handbook Viewer */}
        {showHandbook && (
          <div className="w-[45%] border-l border-[#1F2937] bg-[#0B0F14] flex flex-col relative animate-slideInRight">
            <div className="h-[40px] bg-[#111827] border-b border-[#1F2937] flex items-center justify-between px-4">
              <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest">Participant Handbook</span>
              <button 
                onClick={() => setShowHandbook(false)}
                className="text-[#6B7280] hover:text-white transition-colors"
              >
                <FiX size={18} />
              </button>
            </div>
            <div className="flex-1 bg-[#030712]">
              <iframe
                src="/CloudTycoon_Participant_Handbook_v3.pdf#toolbar=0&navpanes=0"
                className="w-full h-full border-none"
                title="Handbook"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionPage;
