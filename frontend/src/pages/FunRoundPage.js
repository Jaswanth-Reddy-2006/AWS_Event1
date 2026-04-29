import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../utils/store';
import { questionsAPI, submissionsAPI, adminAPI, authAPI } from '../utils/api';
import {
  FiZap, FiClock, FiSend, FiCheckCircle, FiLoader,
  FiArrowLeft, FiImage
} from 'react-icons/fi';
import confetti from 'canvas-confetti';

const FunRoundPage = () => {
  const navigate = useNavigate();
  const { role, teamId, answers, setAnswer, resetAnswers } = useGameStore();

  const [settings, setSettingsState] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedTime, setSubmittedTime] = useState(null);
  const [error, setError] = useState('');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [showQuestion, setShowQuestion] = useState(true);
  const timerRef = useRef(null);
  const prevActiveQId = useRef(null);
  const currentRoundRef = useRef(null);
  const questionsRef = useRef([]);

  useEffect(() => {
    resetAnswers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let interval;
    const poll = async () => {
      try {
        const sRes = await adminAPI.getSettings();
        const s = sRes.data;
        setSettingsState(s);

        if (!s.isRoundActive || s.currentRound < 5) {
          if (!submitted) navigate('/profile');
          return;
        }

        if (currentRoundRef.current !== s.currentRound) {
          currentRoundRef.current = s.currentRound;
          questionsRef.current = [];
        }

        if (questionsRef.current.length === 0) {
          try {
            const qRes = await questionsAPI.getByYear(s.currentRound, 'fun');
            const fetched = qRes.data.questions || [];
            if (fetched.length > 0) {
              questionsRef.current = fetched;
              setQuestions(fetched);
            }
          } catch (qErr) {
            console.error('Question fetch error:', qErr);
          }
        }

        const tRes = await authAPI.getTeam(teamId);
        const yearKey = `year${s.currentRound}`;
        const myAnswers = tRes.data?.gameState?.[yearKey]?.answers?.[role?.toLowerCase()] || {};

        if (s.activeFunQuestionId !== prevActiveQId.current) {
          if (prevActiveQId.current !== null && s.activeFunQuestionId) {
            setShowQuestion(false);
            setTimeout(() => {
              setSubmitting(false);
              setSubmitted(false);
              setSubmittedTime(null);
              setImageLoaded(false);
              resetAnswers();
              setQuestionNumber(prev => prev + 1);
              setShowQuestion(true);
            }, 300);
          } else if (s.activeFunQuestionId) {
            setQuestionNumber(1);
          }
          prevActiveQId.current = s.activeFunQuestionId;
        }

        if (s.activeFunQuestionId && myAnswers[s.activeFunQuestionId] !== undefined) {
          setSubmitted(true);
        }

        setLoading(false);
      } catch (err) {
        console.error('Poll error:', err);
        setLoading(false);
      }
    };

    poll();
    interval = setInterval(poll, 1500);
    return () => clearInterval(interval);
  }, [teamId, role, navigate, submitted, resetAnswers]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (settings?.activeFunQuestionId && questions.length > 0) {
      const q = questions.find(q => q.questionId === settings.activeFunQuestionId);
      setActiveQuestion(q || null);
    } else {
      setActiveQuestion(null);
    }
  }, [settings?.activeFunQuestionId, questions]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (settings?.isRoundActive && settings?.roundStartedAt && !submitted) {
      const tick = () => {
        setElapsedMs(Date.now() - new Date(settings.roundStartedAt).getTime());
      };
      tick();
      timerRef.current = setInterval(tick, 100);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [settings?.isRoundActive, settings?.roundStartedAt, submitted]);

  const handleSubmit = useCallback(async () => {
    if (submitting || submitted || !activeQuestion) return;

    const myAnswer = answers[activeQuestion.questionId];
    if (!myAnswer || (typeof myAnswer === 'string' && !myAnswer.trim())) {
      setError('Type your answer before submitting.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const elapsed = Date.now() - new Date(settings.roundStartedAt).getTime();
      await submissionsAPI.submit(settings.currentRound, answers, Math.round(elapsed / 1000));
      setSubmitting(false);
      setSubmitted(true);
      setSubmittedTime(elapsed);

      const end = Date.now() + 1500;
      const burst = () => {
        confetti({
          particleCount: 60, spread: 80,
          origin: { x: Math.random(), y: Math.random() * 0.4 },
          colors: ['#facc15', '#f59e0b', '#7C3AED', '#10b981', '#3b82f6']
        });
        if (Date.now() < end) requestAnimationFrame(burst);
      };
      burst();
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed. Try again.');
      setSubmitting(false);
    }
  }, [submitting, submitted, activeQuestion, answers, settings]);

  const formatElapsed = (ms) => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const tenths = Math.floor((ms % 1000) / 100);
    return `${mins}:${String(secs).padStart(2, '0')}.${tenths}`;
  };

  const renderAnswerInput = () => {
    if (!activeQuestion) return null;

    if (activeQuestion.type === 'mcq') {
      return (
        <div className="w-full max-w-[480px] space-y-[10px]">
          {activeQuestion.options?.map((opt) => {
            const isSelected = answers[activeQuestion.questionId] === opt.optionId;
            return (
              <button
                key={opt.optionId}
                onClick={() => { setAnswer(activeQuestion.questionId, opt.optionId); setError(''); }}
                className="w-full text-left"
              >
                <div
                  className="flex items-center gap-[14px] p-[16px] rounded-[12px] border-2 transition-all duration-200"
                  style={{
                    background: isSelected ? 'rgba(234,179,8,0.08)' : '#111827',
                    borderColor: isSelected ? '#facc15' : '#1F2937',
                    boxShadow: isSelected ? '0 0 20px rgba(234,179,8,0.1)' : 'none',
                  }}
                >
                  <div
                    className="w-[28px] h-[28px] rounded-[8px] flex items-center justify-center font-bold text-[13px] shrink-0 transition-all"
                    style={{
                      background: isSelected ? '#facc15' : '#1F2937',
                      color: isSelected ? '#070B14' : '#9CA3AF',
                    }}
                  >
                    {opt.optionId}
                  </div>
                  <span className={`text-[14px] leading-[1.6] ${isSelected ? 'text-[#F9FAFB] font-medium' : 'text-[#D1D5DB]'}`}>
                    {opt.text}
                  </span>
                  {isSelected && <FiCheckCircle className="text-yellow-500 shrink-0 ml-auto" size={16} />}
                </div>
              </button>
            );
          })}
        </div>
      );
    }

    return (
      <div className="w-full max-w-[480px]">
        <input
          type="text"
          value={answers[activeQuestion.questionId] || ''}
          onChange={(e) => { setAnswer(activeQuestion.questionId, e.target.value); setError(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
          className="w-full bg-[#111827] border-2 border-[#1F2937] rounded-[16px] py-[18px] px-[24px] text-[20px] font-bold text-center text-[#F9FAFB] focus:border-yellow-500 outline-none transition-all placeholder-[#4B5563] focus:shadow-[0_0_30px_rgba(234,179,8,0.1)]"
          placeholder="Type your answer..."
          autoFocus
        />
        <p className="text-[10px] text-[#6B7280] text-center mt-[8px] uppercase tracking-widest">
          Case & spacing don't matter
        </p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070B14] flex flex-col items-center justify-center gap-[20px]">
        <FiLoader className="w-[40px] h-[40px] text-yellow-500 animate-spin" />
        <p className="text-[13px] font-medium text-[#9CA3AF] tracking-wider">Connecting to fun round...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070B14] text-[#F9FAFB] font-sans flex flex-col">
      {/* Top Bar */}
      <div className="h-[56px] border-b border-[#1F2937] bg-[#0B0F14] flex items-center justify-between px-[24px] shrink-0">
        <div className="flex items-center gap-[16px]">
          <button onClick={() => navigate('/profile')} className="text-[#6B7280] hover:text-white transition-colors">
            <FiArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-[10px]">
            <FiZap className="text-yellow-500" size={18} />
            <span className="text-[15px] font-bold text-yellow-500">Fun Round</span>
          </div>
          <div className="h-[16px] w-[1px] bg-[#1F2937]" />
          <span className="text-[11px] text-[#6B7280] font-medium uppercase tracking-wider">{role}</span>
        </div>

        <div className="flex items-center gap-[16px]">
          {error && <span className="text-red-400 text-[11px] font-medium max-w-[300px] truncate">{error}</span>}
          <div className="flex items-center gap-[8px] px-[14px] py-[6px] rounded-[8px] bg-yellow-500/10 border border-yellow-500/20">
            <FiClock size={14} className="text-yellow-500" />
            <span className="text-[16px] font-bold tabular-nums text-yellow-500">{formatElapsed(elapsedMs)}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-[24px] overflow-y-auto">
        {!activeQuestion ? (
          <div className="text-center max-w-[500px]">
            <div className="w-[80px] h-[80px] rounded-[20px] bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto mb-[24px]">
              <FiImage className="text-yellow-500 animate-pulse" size={36} />
            </div>
            <h2 className="text-[24px] font-bold text-[#F9FAFB] mb-[12px]">Waiting for Question...</h2>
            <p className="text-[14px] text-[#9CA3AF] leading-relaxed">
              The host will push the next question live. Stay on this page.
            </p>
            <div className="flex items-center justify-center gap-[8px] mt-[24px]">
              <div className="w-[6px] h-[6px] bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-[6px] h-[6px] bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-[6px] h-[6px] bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        ) : submitted ? (
          <div className="text-center max-w-[500px]">
            <div className="w-[80px] h-[80px] rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-[24px]">
              <FiCheckCircle className="text-emerald-500" size={40} />
            </div>
            <h2 className="text-[28px] font-bold text-emerald-400 mb-[12px]">Answer Submitted!</h2>
            {submittedTime && (
              <div className="inline-flex items-center gap-[8px] px-[20px] py-[10px] bg-[#111827] border border-[#1F2937] rounded-[12px] mb-[16px]">
                <FiClock size={16} className="text-yellow-500" />
                <span className="text-[18px] font-bold tabular-nums text-[#F9FAFB]">{formatElapsed(submittedTime)}</span>
              </div>
            )}
            <p className="text-[14px] text-[#9CA3AF]">Waiting for the next question...</p>
            <div className="flex items-center justify-center gap-[8px] mt-[20px]">
              <div className="w-[6px] h-[6px] bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-[6px] h-[6px] bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-[6px] h-[6px] bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        ) : (
          <div className={`w-full max-w-[700px] flex flex-col items-center transition-all duration-500 ${showQuestion ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[20px]'}`}>
            {questionNumber > 0 && (
              <div className="mb-[16px]">
                <span className="text-[11px] font-black text-yellow-500 bg-yellow-500/10 px-[14px] py-[5px] rounded-full border border-yellow-500/20 uppercase tracking-[0.2em]">
                  Question {questionNumber}
                </span>
              </div>
            )}
            <h2 className="text-[20px] md:text-[24px] font-bold text-[#F9FAFB] text-center mb-[24px] leading-[1.4]">
              {activeQuestion.question}
            </h2>

            {activeQuestion.assetUrl && (
              <div className="w-full max-w-[560px] rounded-[16px] overflow-hidden border border-[#1F2937] bg-[#111827] mb-[28px] relative">
                {!imageLoaded && (
                  <div className="flex items-center justify-center py-[60px]">
                    <FiLoader className="w-[32px] h-[32px] text-yellow-500 animate-spin" />
                  </div>
                )}
                {activeQuestion.assetUrl.includes('video') || activeQuestion.assetUrl.endsWith('.mp4') ? (
                  <video
                    src={activeQuestion.assetUrl}
                    controls
                    className="w-full max-h-[400px] mx-auto"
                    onLoadedData={() => setImageLoaded(true)}
                  />
                ) : (
                  <img
                    src={activeQuestion.assetUrl}
                    alt=""
                    className={`w-full object-contain max-h-[400px] transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setImageLoaded(true)}
                    onError={() => setImageLoaded(true)}
                  />
                )}
              </div>
            )}
            {renderAnswerInput()}

            <button
              onClick={handleSubmit}
              disabled={submitting || !(answers[activeQuestion.questionId]?.toString()?.trim())}
              className="mt-[24px] flex items-center gap-[10px] bg-yellow-500 hover:bg-yellow-400 text-[#070B14] px-[32px] py-[14px] rounded-[14px] font-black text-[15px] uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/40 hover:scale-105 active:scale-95"
            >
              {submitting ? <FiLoader className="animate-spin" size={18} /> : <FiSend size={18} />}
              {submitting ? 'Submitting...' : 'Submit Answer'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FunRoundPage;
