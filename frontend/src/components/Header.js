import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiLayout } from 'react-icons/fi';
import { useGameStore } from '../utils/store';
import logo from '../assets/logo.png';

const Header = ({ title, showLeaderboard = true, showBackButton = false }) => {
  const navigate = useNavigate();
  const { teamId, isLoggedIn } = useGameStore();

  return (
    <header className="bg-[#0B0F14] border-b border-[#1F2937] sticky top-0 z-[100] transition-all duration-300">
      <div className="max-w-[1200px] w-full mx-auto px-[24px] py-[16px] flex justify-between items-center h-[76px]">
        <div className="flex items-center gap-[16px]">
          {showBackButton && (
            <button
              onClick={() => navigate(-1)}
              className="text-[#9CA3AF] hover:text-[#F9FAFB] transition-colors p-[8px] -ml-[8px]"
            >
              <FiArrowLeft size={20} />
            </button>
          )}
          <div
            className="flex items-center cursor-pointer group"
            onClick={() => navigate('/')}
          >
            <div className="flex items-center gap-12">
              <img src={logo} alt="Cloud Tycoon" className="h-[48px] w-auto rounded-lg object-contain group-hover:scale-110 transition-transform duration-300" />
              <div className="flex flex-col">
                <h1 className="text-[20px] font-bold text-[#F9FAFB] tracking-tight leading-none group-hover:opacity-80 transition-opacity">
                  CLOUD TYCOON
                </h1>
                {title && !showBackButton && (
                  <div className="flex items-center gap-[8px] mt-[4px]">
                    <div className="h-[4px] w-[4px] rounded-full bg-[#7C3AED]"></div>
                    <p className="text-[#9CA3AF] text-[14px] font-medium tracking-wide">{title}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-[24px]">
          {isLoggedIn && (
            <div className="flex items-center gap-16 px-16 py-8 bg-brand-surface rounded-xl border border-brand-border">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-brand-primary uppercase tracking-widest leading-none">TEAM-CONNECTED</span>
                <span className="text-[12px] font-mono font-bold text-brand-text-muted mt-4">ID: {teamId}</span>
              </div>
              <div className="w-32 h-32 rounded-lg bg-brand-primary/20 flex items-center justify-center text-brand-primary border border-brand-primary/30">
                <FiLayout size={18} />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
