import axios from 'axios';
import { useGameStore } from './store';

const API_URL = process.env.REACT_APP_API_URL || 'https://aws-event1.linkpc.net/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});


apiClient.interceptors.request.use((config) => {
  const token = useGameStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

export const authAPI = {
  register: (teamData) => apiClient.post('/auth/register', teamData),
  login: (credentials) => apiClient.post('/auth/login', credentials),
  logout: () => apiClient.post('/auth/logout'),
  getTeam: (teamId) => apiClient.get(`/auth/team/${teamId}`)
};

export const questionsAPI = {
  getByYear: (year, role) => apiClient.get(`/questions/${year}/${role}`),
  getById: (questionId) => apiClient.get(`/questions/question/${questionId}`)
};

export const submissionsAPI = {
  submit: (year, answers, timeSpent) => 
    apiClient.post(`/submissions/${year}`, { answers, timeSpent }),
  get: (teamId, year) => apiClient.get(`/submissions/${teamId}/${year}`),
  disqualify: (year, reason) => apiClient.post(`/submissions/disqualify/${year}`, { reason })
};

export const leaderboardAPI = {
  getAll: () => apiClient.get('/leaderboard'),
  getTeamPosition: (teamId) => apiClient.get(`/leaderboard/team/${teamId}`)
};

export const adminAPI = {
  getSettings: () => apiClient.get('/admin/settings'),
  updateSettings: (settings) => apiClient.post('/admin/settings', settings),
  resetGame: (resetType) => apiClient.post('/admin/reset-game', { resetType }),
  getTeams: () => apiClient.get('/admin/teams'),
  getQuestions: () => apiClient.get('/admin/questions'),
  createQuestion: (qData) => apiClient.post('/admin/questions', qData),
  updateQuestion: (id, qData) => apiClient.put(`/admin/questions/${id}`, qData),
  deleteQuestion: (id) => apiClient.delete(`/admin/questions/${id}`),
  createAdmin: (adminData) => apiClient.post('/admin/create-admin', adminData),
  registerTeam: (teamData) => apiClient.post('/auth/register', teamData)
};

export default apiClient;
