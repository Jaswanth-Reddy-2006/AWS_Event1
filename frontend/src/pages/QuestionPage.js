import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import LockdownMode from '../components/LockdownMode';
import { useGameStore } from '../utils/store';
import { questionsAPI, submissionsAPI, adminAPI, authAPI } from '../utils/api';
import { 
  FiClock, FiAlertCircle, FiChevronRight, FiChevronLeft, 
  FiCheckCircle, FiLoader, FiActivity, FiLock
} from 'react-icons/fi';

const QuestionPage = () => {
  const { year } = useParams();
  const navigate = useNavigate();
  const { role, teamId, answers, setCurrentQuestions, setAnswer, setNextRoundSettings, setTabSwitchWarnings } = useGameStore();

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(1200); // 20 minutes
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [screenOutCount, setScreenOutCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);

  const enterFullscreen = useCallback(() => {
    const element = document.documentElement;
    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if (element.mozRequestFullScreen) {
      element.mozRequestFullScreen();
    } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
      element.msRequestFullscreen();
    }
  }, []);

  const handleExitQuiz = () => {
    if (window.confirm('Are you sure you want to exit? Your progress will not be saved unless submitted.')) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      navigate('/profile');
    }
  };

  useEffect(() => {
    const handleFullscreenChange = async () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);

      if (!isCurrentlyFullscreen && !submitted && !loading) {
        try {
          const res = await submissionsAPI.reportScreenOut();
          setScreenOutCount(res.data.count);
          setShowWarning(true);
          
          if (res.data.count >= 5) {
            handleDisqualify('Exceeded maximum allowed screen exits (5). Operational sequence terminated by system security.');
          }
        } catch (err) {
          console.error('Failed to report screen out:', err);
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    // Block right click
    const blockContextMenu = (e) => e.preventDefault();
    document.addEventListener('contextmenu', blockContextMenu);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      document.removeEventListener('contextmenu', blockContextMenu);
    };
  }, [submitted, loading, navigate]);

  const handleSubmit = useCallback(async () => {
    if (submitting || submitted) return;

    if (questions.length > 0) {
        const unasweredIndices = questions.map((q, i) => (answers[q.questionId] === undefined || answers[q.questionId] === '') ? i + 1 : null).filter(i => i !== null);
        if (unasweredIndices.length > 0 && timeLeft > 0) {
          setError(`Operational Failure: Tactical scenarios ${unasweredIndices.join(', ')} require data input before final commitment.`);
          return;
        }
    }

    setSubmitting(true);
    setError('');

    try {
      await submissionsAPI.submit(year, answers, 1200 - timeLeft);
      setSubmitted(true);
      setTimeout(() => {
          if (document.fullscreenElement) {
              document.exitFullscreen().catch(() => {});
          }
          navigate('/profile', { state: { submissionSuccess: true } });
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Uplink Failed. Retrying...');
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
        
        if (teamData?.fraudFlags?.screenOuts) {
          setScreenOutCount(teamData.fraudFlags.screenOuts);
        }

        if (!settings.isRoundActive || settings.currentRound !== parseInt(year)) {
          if (!submitted) {
            if (document.fullscreenElement) {
              document.exitFullscreen().catch(() => {});
            }
            navigate('/profile');
          }
          return;
        }

        const hasCompleted = Object.keys(teamData?.gameState?.[`year${year}`]?.answers?.[role?.toLowerCase()] || {}).length > 0;
        if (hasCompleted && !submitted) {
            setSubmitted(true);
        }

        if (questions.length === 0) {
            const response = await questionsAPI.getByYear(year, role);
            setQuestions(response.data.questions);
            setCurrentQuestions(response.data.questions);
        }
        setLoading(false);
      } catch (err) {
        setError('Communications Link Failure. Verify AWS Connection.');
        setLoading(false);
      }
    };

    if (year && role) {
      validateAndLoad();
      intervalId = setInterval(validateAndLoad, 5000);
    }

    return () => {
        if (intervalId) clearInterval(intervalId);
    };
  }, [year, role, teamId, navigate, questions.length, setCurrentQuestions, submitted, setNextRoundSettings, setTabSwitchWarnings]);

  useEffect(() => {
    if (!isAuthorized || submitted) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, [isAuthorized, submitted]);

  useEffect(() => {
    if (timeLeft === 0 && !submitting && isAuthorized && !submitted) {
      handleSubmit();
    }
  }, [timeLeft, submitting, isAuthorized, submitted, handleSubmit]);

  const handleDisqualify = async (reason) => {
    if (submitting || submitted) return;
    setSubmitting(true);
    setError('Disqualified: ' + reason);
    try {
      await submissionsAPI.disqualify(year, reason);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      setTimeout(() => navigate('/profile'), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Disqualification Uplink Failed.');
      setSubmitting(false);
    }
  };

  const handleTabSwitch = (count, reason) => {
    setTabSwitchWarnings(count);
    if (count >= 5) handleDisqualify(reason || 'Terminal Security Violation: Multiple Unauthorized Escapes'); 
  };

  const setAnswerInternal = (questionId, answer) => {
    if (submitted) return;
    setAnswer(questionId, answer);
    setError('');
  };

  const isFunRound = parseInt(year) >= 5;


  const renderQuestion = () => {
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return null;

    switch (currentQuestion.type) {
      case 'mcq':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px]">
            {currentQuestion.options.map((opt) => {
                const isSelected = answers[currentQuestion.questionId] === opt.optionId;
                return (
                    <button
                        key={opt.optionId}
                        onClick={() => setAnswerInternal(currentQuestion.questionId, opt.optionId)}
                        className={`p-[24px] rounded-[16px] border-2 text-left transition-all group relative overflow-hidden ${
                            isSelected 
                            ? 'bg-[#7C3AED]/10 border-[#7C3AED] shadow-[0_0_20px_rgba(124,58,237,0.2)]' 
                            : 'bg-[#111827] border-[#1F2937] hover:border-[#7C3AED]/40'
                        }`}
                    >
                        <div className="flex items-start gap-[16px] relative z-10">
                            <div className={`w-[32px] h-[32px] rounded-[8px] flex items-center justify-center font-bold text-[14px] shrink-0 transition-all ${
                                isSelected ? 'bg-[#7C3AED] text-white' : 'bg-[#1F2937] text-[#9CA3AF]'
                            }`}>
                                {opt.optionId}
                            </div>
                            <span className={`text-[16px] font-medium leading-relaxed ${isSelected ? 'text-[#F9FAFB]' : 'text-[#9CA3AF]'}`}>
                                {opt.text}
                            </span>
                        </div>
                        {isSelected && (
                            <div className="absolute top-0 right-0 p-[8px]">
                                <FiCheckCircle className="text-[#7C3AED]" size={20} />
                            </div>
                        )}
                    </button>
                );
            })}
          </div>
        );

      case 'truefalse':
        return (
          <div className="grid grid-cols-2 gap-[24px] max-w-[600px]">
            {['True', 'False'].map((val) => {
              const isSelected = answers[currentQuestion.questionId] === val;
              const isTrue = val === 'True';
              return (
                <button
                  key={val}
                  onClick={() => setAnswerInternal(currentQuestion.questionId, val)}
                  className={`p-[40px] rounded-[20px] border-2 flex flex-col items-center justify-center gap-[16px] transition-all group ${
                    isSelected 
                      ? (isTrue ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.2)]' : 'bg-red-500/10 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.2)]')
                      : 'bg-[#111827] border-[#1F2937] hover:border-white/20'
                  }`}
                >
                  <div className={`text-[48px] font-black uppercase tracking-tighter transition-all ${
                    isSelected ? 'scale-110' : 'opacity-20'
                  } ${isTrue ? 'text-emerald-500' : 'text-red-500'}`}>
                    {val === 'True' ? 'YES' : 'NO'}
                  </div>
                  <span className={`text-[12px] font-bold uppercase tracking-widest px-[16px] py-[6px] rounded-full border ${
                    isSelected 
                      ? (isTrue ? 'border-emerald-500/30 text-emerald-500' : 'border-red-500/30 text-red-500')
                      : 'border-[#1F2937] text-[#9CA3AF]'
                  }`}>
                    {val.toUpperCase()}
                  </span>
                </button>
              );
            })}
          </div>
        );

      case 'multi-select':
        return (
            <div className="space-y-[16px]">
                <div className="flex items-center gap-[12px] text-[#A78BFA] text-[12px] font-bold uppercase tracking-widest mb-[12px] p-[12px] bg-[#7C3AED]/10 rounded">
                    <FiActivity size={14} className="animate-pulse shrink-0" />
                    <span style={{textTransform: 'none'}}>Note: This is a multiple choice question. This question may have more than one correct option and you are allowed to select more than one answer.</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
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
                                className={`p-[24px] rounded-[16px] border-2 text-left transition-all group ${
                                    isSelected 
                                    ? 'bg-[#7C3AED]/10 border-[#7C3AED] shadow-[0_0_20px_rgba(124,58,237,0.1)]' 
                                    : 'bg-[#111827] border-[#1F2937] hover:border-white/10'
                                }`}
                            >
                                <div className="flex items-center gap-[16px]">
                                    <div className={`w-[24px] h-[24px] rounded-[6px] border-2 flex items-center justify-center transition-all ${
                                        isSelected ? 'bg-[#7C3AED] border-[#7C3AED]' : 'border-[#1F2937]'
                                    }`}>
                                        {isSelected && <FiCheckCircle size={14} className="text-white" />}
                                    </div>
                                    <span className={`text-[15px] font-medium ${isSelected ? 'text-[#F9FAFB]' : 'text-[#9CA3AF]'}`}>
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
                    <span className="bg-[#7C3AED] text-white text-[10px] font-bold py-[4px] px-[12px] rounded-full uppercase tracking-widest">Numerical Input Lock</span>
                </div>
             </div>
          </div>
        );

      default:
        return <p className="text-[#9CA3AF]">Scenario data corrupted. Please contact command center.</p>;
    }
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-[#F9FAFB] font-mono selection:bg-[#7C3AED]/30 flex flex-col overflow-hidden relative">
      {!isAuthorized && <LockdownMode onAuthorized={() => setIsAuthorized(true)} />}
      <LockdownMode onTabSwitch={handleTabSwitch} onWarning={(msg) => setError(msg)} />

      {/* Screen Out Warning Overlay */}
      {showWarning && !submitted && (
        <div className="absolute inset-0 z-[100] bg-[#070B14]/90 backdrop-blur-xl flex items-center justify-center p-[40px]">
          <div className="w-full max-w-[500px] bg-[#111827] border border-red-500/30 rounded-[32px] p-[48px] text-center shadow-[0_0_100px_rgba(239,68,68,0.1)] animate-in zoom-in duration-300">
            <div className="w-[80px] h-[80px] bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-[32px]">
              <FiAlertCircle className="text-red-500" size={40} />
            </div>
            <h2 className="text-[24px] font-bold text-white mb-[16px] uppercase tracking-tight">Security Violation Detected</h2>
            <p className="text-[#9CA3AF] mb-[32px] leading-relaxed">
              Fullscreen exit detected. This action has been logged at the Command Center.
              Multiple violations will result in automated disqualification.
            </p>
            
            <div className="flex flex-col gap-[16px]">
              <div className="py-[12px] px-[24px] bg-[#1F2937] rounded-[16px] flex justify-between items-center border border-[#374151]">
                <span className="text-[12px] font-bold text-[#9CA3AF] uppercase">Violation Count</span>
                <span className="text-[20px] font-bold text-red-500">{screenOutCount} / 5</span>
              </div>
              
              <button
                onClick={() => {
                  setShowWarning(false);
                  enterFullscreen();
                }}
                className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold py-[18px] rounded-[16px] transition-all shadow-[0_10px_20px_rgba(124,58,237,0.2)]"
              >
                RETURN TO MISSION
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Requirement: Fullscreen Overlay */}
      {!isFullscreen && !submitted && !loading && !showWarning && (
        <div className="absolute inset-0 z-[90] bg-[#070B14]/80 backdrop-blur-md flex items-center justify-center">
            <div className="text-center p-[48px] bg-[#111827] border border-[#1F2937] rounded-[32px] max-w-[400px]">
                <FiLock className="text-[#7C3AED] mx-auto mb-[24px]" size={48} />
                <h2 className="text-[20px] font-bold text-white mb-[12px] uppercase">Secure Mode Required</h2>
                <p className="text-[#9CA3AF] text-[14px] mb-[32px]">This mission requires an encrypted fullscreen environment to prevent data leaks.</p>
                <button 
                    onClick={enterFullscreen}
                    className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-[32px] py-[16px] rounded-[16px] font-bold uppercase tracking-widest text-[12px] transition-all border border-[#7C3AED]/50"
                >
                    Initialize Secure Mode
                </button>
            </div>
        </div>
      )}

      {/* Top Tactical Taskbar */}
      <div className="h-[64px] border-b border-[#1F2937] bg-[#0F172A]/80 backdrop-blur-md flex items-center justify-between px-[32px] shrink-0 z-50">
        <div className="flex items-center gap-[24px]">
          <div className="flex items-center gap-[12px] group cursor-default">
            <div className="w-[10px] h-[10px] bg-[#7C3AED] rounded-full animate-pulse shadow-[0_0_8px_rgba(124,58,237,0.6)]"></div>
            <span className="text-[14px] font-bold tracking-[0.2em] text-[#F9FAFB] uppercase">
                {parseInt(year) >= 5 ? `Funderon 0${parseInt(year) - 4}` : `Year 0${parseInt(year) + 1}`} - Tactical Mode
            </span>
          </div>
          
          <div className="h-[20px] w-[1px] bg-[#1F2937]"></div>
          
          <button 
            onClick={handleExitQuiz}
            className="text-[10px] font-bold text-red-500/60 hover:text-red-500 uppercase tracking-widest transition-all"
          >
            Terminal Exit
          </button>
          
          <button 
            onClick={enterFullscreen}
            className="text-[10px] font-bold text-[#7C3AED]/60 hover:text-[#7C3AED] uppercase tracking-widest transition-all border border-[#7C3AED]/30 px-[12px] py-[4px] rounded-full hover:bg-[#7C3AED]/10"
          >
            Full Screen
          </button>
        </div>

        <div className="flex items-center gap-[40px]">
          {error && (
            <div className="flex items-center gap-[10px] text-red-400 text-[12px] font-bold uppercase tracking-wider animate-in slide-in-from-right duration-300">
                <FiAlertCircle className="animate-pulse" />
                <span>{error}</span>
            </div>
          )}
          
          <div className={`flex items-center gap-[16px] px-[20px] py-[8px] rounded-[8px] border transition-all duration-500 ${
            timeLeft < 300 ? 'bg-red-500/10 border-red-500/30 animate-pulse' : 'bg-[#111827] border-[#1F2937]'
          }`}>
            <FiClock size={14} className={timeLeft < 300 ? 'text-red-500' : 'text-[#7C3AED]'} />
            <span className={`text-[18px] font-bold tabular-nums tracking-wider ${timeLeft < 300 ? 'text-red-500' : 'text-[#F9FAFB]'}`}>
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
            </span>
          </div>
          
          </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">


        {/* Neural Interlink Layer (Visual backgrounds) */}
        <div className="absolute inset-0 pointer-events-none z-0">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-[#7C3AED]/5 via-transparent to-transparent"></div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto relative z-10 custom-scrollbar">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-[24px]">
              <FiLoader className="w-[48px] h-[48px] text-[#7C3AED] animate-spin" />
              <p className="text-[12px] font-bold uppercase tracking-[0.4em] text-[#9CA3AF] animate-pulse">Syncing Tactical Link...</p>
            </div>
          ) : submitted ? (
            <div className="h-full flex flex-col items-center justify-center p-[40px] text-center max-w-[600px] mx-auto animate-in zoom-in duration-500">
               <div className="w-[80px] h-[80px] rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-[24px]">
                 <FiCheckCircle size={40} className="text-emerald-500" />
               </div>
               <h2 className="text-[32px] font-bold mb-[24px] text-emerald-400 uppercase">Mission Recorded</h2>
               <div className="p-24 bg-[#111827] border border-[#1F2937] rounded-xl flex items-center justify-center gap-16 mb-40">
                  <div className="w-8 h-8 bg-[#7C3AED] rounded-full animate-ping"></div>
                  <span className="text-12 font-bold uppercase tracking-[0.2em] text-[#9CA3AF]">Syncing tactical data with Command Center...</span>
               </div>
               <p className="text-12 text-[#9CA3AF] animate-pulse uppercase tracking-widest font-bold">Safe Exit Authorized in 3 Seconds...</p>
            </div>
          ) : (
            <div className="max-w-[1000px] mx-auto p-[40px] md:p-[64px] animate-in slide-in-from-bottom-4 duration-500">
              {questions[currentIndex] && (
                <div className="space-y-[48px]">
                  <div className="flex items-center justify-between opacity-60">
                    <span className="text-[12px] font-bold text-[#7C3AED] uppercase tracking-widest">Scenario {currentIndex + 1} of {questions.length}</span>
                    {screenOutCount > 0 && (
                      <span className="text-[10px] font-bold text-red-500/80 uppercase px-[12px] py-[4px] border border-red-500/20 rounded-full bg-red-500/5">
                        Alert: {screenOutCount} / 5 Security Blips
                      </span>
                    )}
                  </div>

                  <div className="space-y-[24px]">
                    <div className="flex items-center gap-[12px]">
                        <div className="px-[12px] py-[4px] rounded-full border border-[#7C3AED]/30 bg-[#7C3AED]/10 text-[#7C3AED] text-[10px] font-bold uppercase tracking-widest">
                            {isFunRound ? 'Experimental Scenario' : 'Strategic Objective'}
                        </div>
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-[#7C3AED]/30 to-transparent"></div>
                    </div>
                    <h3 className="text-[32px] md:text-[40px] font-bold text-[#F9FAFB] leading-[1.2] tracking-tight">
                        {questions[currentIndex].question}
                    </h3>
                  </div>

                  <div className="py-[12px]">
                    {renderQuestion()}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>


      </div>

      {/* Modern Footer Navigation */}
      {!submitted && !loading && (
        <div className="h-[90px] border-t border-[#1F2937] bg-[#0F172A] flex items-center px-[40px] shrink-0 z-40">
           <div className="max-w-[1400px] mx-auto w-full flex items-center justify-between">
              <button
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className={`flex items-center gap-12 px-24 py-12 rounded-xl text-12 font-bold uppercase tracking-widest transition-all ${
                    currentIndex === 0 ? 'opacity-20 cursor-not-allowed' : 'text-[#9CA3AF] hover:text-white hover:bg-white/5'
                }`}
              >
                <FiChevronLeft size={18} />
                Previous
              </button>

              <div className="flex items-center gap-16">
                {currentIndex === questions.length - 1 ? (
                   <button
                     onClick={handleSubmit}
                     disabled={submitting}
                     className="bg-[#10B981] hover:bg-[#059669] text-white px-32 py-14 rounded-xl font-bold text-12 uppercase tracking-[0.2em] transition-all flex items-center gap-12 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                   >
                     {submitting ? <FiLoader className="animate-spin" /> : <FiCheckCircle />}
                     Commit Mission
                   </button>
                ) : (
                   <button
                     onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                     className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-32 py-14 rounded-xl font-bold text-12 uppercase tracking-[0.2em] transition-all flex items-center gap-12 shadow-[0_0_20px_rgba(124,58,237,0.3)]"
                   >
                     Next Phase
                     <FiChevronRight size={18} />
                   </button>
                )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default QuestionPage;
