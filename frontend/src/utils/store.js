import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useGameStore = create(
  persist(
    (set, get) => ({
      // Auth state
      isLoggedIn: false,
      token: null,
      userId: null,
      teamId: null,
      teamName: null,
      memberName: null,
      role: null, // 'cto', 'cfo', 'pm'

      // Game state
      currentYear: 1,
      gameStatus: 'not-started', // 'not-started', 'in-progress', 'completed'
      nextRoundSettings: null,
      tabSwitchWarnings: 0,
      
      // Company state
      companyState: {
        monthlyBill: 0,
        monthlyRevenue: 0,
        cumulativeProfit: 0,
        runwayMonths: 0
      },

      // Questions and answers
      currentQuestions: [],
      answers: {},
      
      // Leaderboard
      leaderboard: [],
      teamRank: null,

      // Actions
      setAuth: (authData) => set({
        isLoggedIn: true,
        token: authData.token,
        userId: authData.userId,
        teamId: authData.teamId,
        teamName: authData.teamName,
        memberName: authData.memberName,
        role: authData.role,
        currentYear: authData.currentYear
      }),

      setLogout: () => set({
        isLoggedIn: false,
        token: null,
        userId: null,
        teamId: null,
        teamName: null,
        memberName: null,
        role: null,
        answers: {}
      }),

      setCurrentYear: (year) => set({ currentYear: year }),
      
      setCompanyState: (state) => set({ companyState: state }),
      
      setCurrentQuestions: (questions) => set({ currentQuestions: questions }),
      
      setAnswer: (questionId, answer) => set((state) => ({
        answers: {
          ...state.answers,
          [questionId]: answer
        }
      })),

      setLeaderboard: (leaderboard) => set({ leaderboard }),
      
      setTeamRank: (rank) => set({ teamRank: rank }),

      resetAnswers: () => set({ answers: {} }),

      setGameStatus: (status) => set({ gameStatus: status }),

      setNextRoundSettings: (settings) => set({ nextRoundSettings: settings }),

      setTabSwitchWarnings: (count) => set({ tabSwitchWarnings: count })
    }),
    {
      name: 'cloud-tycoon-store',
      partialize: (state) => ({
        token: state.token,
        userId: state.userId,
        teamId: state.teamId,
        teamName: state.teamName,
        memberName: state.memberName,
        role: state.role,
        currentYear: state.currentYear
      })
    }
  )
);
