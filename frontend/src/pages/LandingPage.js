import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Button from '../components/Button';
import Card from '../components/Card';
import { FiArrowRight, FiCloud } from 'react-icons/fi';
import { useGameStore } from '../utils/store';

const LandingPage = () => {
  const navigate = useNavigate();
  const { isLoggedIn, teamId } = useGameStore();
  const isAdmin = teamId === 'ADMIN-EVENT-2026';

  return (
    <div className="min-h-screen bg-[#0B0F14] flex flex-col font-sans selection:bg-[#7C3AED]/30 text-[#D1D5DB]">
      <Header />

      <main className="max-w-[1200px] mx-auto px-[24px] flex-1 w-full flex flex-col">
        {/* Hero Section */}
        <section className="py-[120px] flex flex-col items-center text-center">
          <h1 className="text-[48px] md:text-[64px] font-bold text-[#F9FAFB] tracking-tight leading-[1.1] mb-[24px] max-w-[800px]">
            Welcome to the <span className="text-[#7C3AED]">AWS Tycoon</span> Competition.
          </h1>

          <p className="text-[18px] md:text-[20px] text-[#9CA3AF] mb-[48px] max-w-[600px] leading-[1.6]">
            Hosted by the AWS Cloud Club, this is a high-stakes strategic simulation. Build your team, optimize your infrastructure, and dominate the global leaderboard.
          </p>

          <div className="flex flex-col sm:flex-row gap-[16px] justify-center items-center w-full max-w-[400px]">
            {isLoggedIn ? (
              <Button
                onClick={() => navigate(isAdmin ? '/admin' : '/profile')}
                className="w-full"
                variant="primary"
              >
                Go to Dashboard
                <FiArrowRight size={16} className="ml-[4px]" />
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => navigate('/login')}
                  className="w-full"
                  variant="primary"
                >
                  Log in
                </Button>
              </>
            )}
          </div>
        </section>

        {/* Section 1: Team Members */}
        <section className="py-[64px]">
          <div className="mb-[48px] text-center">
            <h2 className="text-[32px] font-bold text-[#F9FAFB] tracking-tight mb-[8px]">The Three Pillars</h2>
            <p className="text-[16px] text-[#9CA3AF] max-w-[600px] mx-auto">Every successful startup needs a strong foundation. Form a team of three members, each taking on a critical role in your simulated company.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-[24px]">
            <Card className="flex flex-col gap-[16px] items-center text-center">
              <div className="w-[64px] h-[64px] rounded-full bg-[#111827] border border-[#1F2937] flex items-center justify-center text-[#7C3AED] shadow-glow">
                <FiCloud size={32} />
              </div>
              <div>
                <h4 className="text-[20px] font-semibold text-[#F9FAFB] mb-[8px]">Chief Technology Officer</h4>
                <p className="text-[14px] text-[#9CA3AF] leading-[1.6]">
                  The CTO manages the infrastructure. You'll make critical decisions about which AWS services to deploy, ensuring scalability and avoiding technical debt.
                </p>
              </div>
            </Card>

            <Card className="flex flex-col gap-[16px] items-center text-center">
              <div className="w-[64px] h-[64px] rounded-full bg-[#111827] border border-[#1F2937] flex items-center justify-center text-[#10b981] shadow-glow">
                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="32" width="32" xmlns="http://www.w3.org/2000/svg"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
              <div>
                <h4 className="text-[20px] font-semibold text-[#F9FAFB] mb-[8px]">Chief Financial Officer</h4>
                <p className="text-[14px] text-[#9CA3AF] leading-[1.6]">
                  The CFO controls the burn rate. You'll allocate budgets, monitor expenses, and ensure the company remains profitable through every fiscal year.
                </p>
              </div>
            </Card>

            <Card className="flex flex-col gap-[16px] items-center text-center">
              <div className="w-[64px] h-[64px] rounded-full bg-[#111827] border border-[#1F2937] flex items-center justify-center text-[#f59e0b] shadow-glow">
                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="32" width="32" xmlns="http://www.w3.org/2000/svg"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>
              </div>
              <div>
                <h4 className="text-[20px] font-semibold text-[#F9FAFB] mb-[8px]">Product Manager</h4>
                <p className="text-[14px] text-[#9CA3AF] leading-[1.6]">
                  The PM drives the product vision. You'll analyze user demands, prioritize features, and navigate the team through random market shifts.
                </p>
              </div>
            </Card>
          </div>
        </section>

        {/* Section 2: How It Works */}
        <section className="py-[64px] mb-[64px]">
          <div className="mb-[48px]">
            <h2 className="text-[32px] font-bold text-[#F9FAFB] tracking-tight mb-[8px]">Step-by-Step Competition Guide</h2>
            <p className="text-[16px] text-[#9CA3AF]">A continuous 5-year simulation where every decision shapes your valuation.</p>
          </div>

          <div className="flex flex-col gap-[24px]">
            {[
              { num: "01", title: "Form & Register", desc: "Gather your trio (CTO, CFO, PM) and assign a team lead to officially register your startup in the system." },
              { num: "02", title: "Analyze The Initial State", desc: "Upon logging in, review your initial funds, user base, and the random event that kicks off Year 0." },
              { num: "03", title: "Strategic Operations", desc: "Each member completes their specific challenges. The CTO selects architectures, the CFO manages funding options, and the PM chooses product trajectories." },
              { num: "04", title: "End of Year Processing", desc: "Submit your decisions. The core engine will calculate your net revenue, user satisfaction, and system uptime based on how well your choices synergize." },
              { num: "05", title: "Climb the Leaderboard", desc: "After 5 rounds (years), the startup with the highest calculated Net Valuation wins the AWS Tycoon competition." }
            ].map((item, idx) => (
              <Card key={idx} className="flex items-start gap-[24px]">
                <div className="text-[32px] font-bold text-[#1F2937] leading-none">
                  {item.num}
                </div>
                <div>
                  <h4 className="text-[20px] font-bold text-[#F9FAFB] mb-[8px]">{item.title}</h4>
                  <p className="text-[16px] text-[#9CA3AF] leading-[1.5] max-w-[800px]">{item.desc}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Bottom CTA Removed as requested */}

        <footer className="py-[32px] text-center border-t border-[#1F2937]">
          <p className="text-[14px] text-[#9CA3AF]">AWS Cloud Club Tycoon &copy; 2026</p>
        </footer>
      </main>
    </div>
  );
};

export default LandingPage;
