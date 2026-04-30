import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../utils/api';
import { useGameStore } from '../utils/store';
import { FiAlertCircle, FiLoader, FiEye, FiEyeOff, FiChevronDown } from 'react-icons/fi';

const LoginPage = () => {
  const navigate = useNavigate();
  const setAuth = useGameStore((state) => state.setAuth);

  const [showPassword, setShowPassword] = useState(false);
  const [credentials, setCredentials] = useState({
    teamId: '',
    memberName: '',
    role: 'cto',
    password: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!credentials.teamId.trim() || !credentials.memberName.trim() || !credentials.password.trim() || !credentials.role) {
      setError('Required: Team ID, Participant Name, Role, and Password.');
      setLoading(false);
      return;
    }

    try {
      const response = await authAPI.login({
        ...credentials,
        teamId: credentials.teamId.trim(),
        memberName: credentials.memberName.trim(),
        password: credentials.password.trim()
      });

      setAuth({
        token: response.data.token,
        userId: response.data.userId,
        teamId: response.data.teamId,
        teamName: response.data.teamName || 'Your Team',
        memberName: response.data.memberName,
        role: response.data.role,
        currentYear: response.data.currentYear || 0
      });

      if (response.data.role === 'admin' || response.data.teamId === 'ADMIN-EVENT-2026') {
        navigate('/admin');
      } else {
        navigate('/profile');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error;
      if (errorMsg?.includes('Team not found')) {
        setError('Team ID not recognized in current event.');
      } else {
        setError(errorMsg || 'Authentication failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputBase = "w-full bg-[#1A202E] border border-[#2D3748] rounded-[10px] px-[16px] py-[12px] text-[14px] text-white focus:border-[#7C3AED] focus:outline-none transition-all placeholder:text-[#4A5568]";

  return (
    <div className="min-h-screen bg-[#0B0F19] flex flex-col font-sans selection:bg-[#7C3AED]/30 text-[#D1D5DB] relative overflow-hidden">
      {/* Background visual elements */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#7C3AED] blur-[150px] rounded-full"></div>
      </div>

      <header className="h-[80px] flex items-center px-[40px] z-20">
        <div className="flex items-center gap-[12px]">
           <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-full transition-colors mr-2">
              <FiChevronDown className="rotate-90 text-[#9CA3AF]" size={20} />
           </button>
           <div className="w-[32px] h-[32px] bg-gradient-to-br from-[#7C3AED] to-blue-500 rounded-[8px] flex items-center justify-center shadow-lg">
             <div className="w-14 h-14 border-2 border-white rounded-sm opacity-80"></div>
           </div>
           <span className="text-[18px] font-bold text-white tracking-[0.05em] uppercase">Cloud Tycoon</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col justify-center items-center p-[24px] relative z-10">
        <div className="w-full max-w-[420px]">
          <div className="mb-[32px] text-center">
            <h1 className="text-[28px] font-bold text-white mb-[8px]">Welcome back</h1>
            <p className="text-[14px] text-[#9CA3AF]">Enter your credentials to access the console</p>
          </div>

          <div className="bg-[#111827] border border-[#1F2937] rounded-[24px] p-[32px] shadow-2xl">
            <form onSubmit={handleSubmit} className="flex flex-col gap-[20px]">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-[12px] rounded-[10px] flex items-start gap-[10px] text-[13px]">
                  <FiAlertCircle size={16} className="mt-[2px] flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex flex-col gap-[8px]">
                <label className="text-[13px] font-medium text-[#9CA3AF] ml-[2px]">Team ID</label>
                <input
                  type="text"
                  name="teamId"
                  placeholder="e.g. TT-2026-XXXX"
                  value={credentials.teamId}
                  onChange={handleChange}
                  className={inputBase}
                  required
                />
              </div>

              <div className="flex gap-[16px]">
                <div className="w-[120px] flex flex-col gap-[8px]">
                  <label className="text-[13px] font-medium text-[#9CA3AF] ml-[2px]">Role</label>
                  <div className="relative">
                    <select
                      name="role"
                      value={credentials.role}
                      onChange={handleChange}
                      className={inputBase + " appearance-none cursor-pointer pr-[32px] uppercase font-bold text-[12px]"}
                      required
                    >
                      <option value="cto">CTO</option>
                      <option value="cfo">CFO</option>
                      <option value="pm">PM</option>
                    </select>
                    <FiChevronDown className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[#4A5568] pointer-events-none" size={14} />
                  </div>
                </div>

                <div className="flex-1 flex flex-col gap-[8px]">
                  <label className="text-[13px] font-medium text-[#9CA3AF] ml-[2px]">Participant Name</label>
                  <input
                    type="text"
                    name="memberName"
                    placeholder="Enter Name"
                    value={credentials.memberName}
                    onChange={handleChange}
                    className={inputBase}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-[8px]">
                <label className="text-[13px] font-medium text-[#9CA3AF] ml-[2px]">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="••••••••••••••••"
                    value={credentials.password}
                    onChange={handleChange}
                    className={inputBase + " pr-[44px]"}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-[14px] top-1/2 -translate-y-1/2 text-[#4A5568] hover:text-white transition-colors"
                  >
                    {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-[12px] bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold py-[14px] rounded-[12px] shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? <FiLoader className="animate-spin m-auto" size={20} /> : 'Log In'}
              </button>
            </form>
          </div>

          <div className="mt-[32px] text-center">
            <p className="text-[12px] text-[#4A5568] leading-relaxed">
              Event Security Active. New accounts must be provisioned by the<br />Coordinator.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
