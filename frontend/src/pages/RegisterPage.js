import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PasswordInput from '../components/PasswordInput';
import Button from '../components/Button';
import Card from '../components/Card';
import Header from '../components/Header';
import { authAPI } from '../utils/api';
import { FiAlertCircle, FiCheckCircle, FiLoader, FiCloud, FiDollarSign, FiTrendingUp } from 'react-icons/fi';

const RegisterPage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    teamName: '',
    teamLead: { name: '', email: '', phone: '' },
    members: [
      { name: '', role: 'cto', password: '' },
      { name: '', role: 'cfo', password: '' },
      { name: '', role: 'pm', password: '' }
    ],
    college: '',
    department: 'Engineering'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTeamLeadChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      teamLead: { ...prev.teamLead, [name]: value }
    }));
  };

  const handleMemberChange = (index, field, value) => {
    const newMembers = [...formData.members];
    newMembers[index][field] = value;
    setFormData(prev => ({ ...prev, members: newMembers }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setErrors({});
    setSuccess('');

    try {
      const response = await authAPI.register(formData);
      const teamId = response.data.teamId;
      setSuccess(`Registration successful! TEAM ID: ${teamId}. Share this with the team members for login.`);

      // Auto redirect after a longer delay so they can read the ID
      setTimeout(() => navigate('/login'), 5000);
    } catch (err) {
      const errorData = err.response?.data;
      if (errorData?.details) {
        const errorMap = {};
        errorData.details.forEach(item => {
          errorMap[item.role] = item.errors;
        });
        setErrors(errorMap);
        setError('Please check the highlighted fields below.');
      } else {
        setError(errorData?.error || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { role: 'cto', title: 'CTO - Infrastructure', icon: <FiCloud size={20} /> },
    { role: 'cfo', title: 'CFO - Finances', icon: <FiDollarSign size={20} /> },
    { role: 'pm', title: 'PM - Product', icon: <FiTrendingUp size={20} /> }
  ];

  const inputClasses = "w-full bg-[#0F172A] border border-[#1F2937] rounded-[10px] px-[14px] py-[12px] text-[14px] text-[#F9FAFB] focus:border-[#7C3AED] focus:shadow-glow focus:outline-none transition-all placeholder:text-[#9CA3AF]";

  return (
    <div className="min-h-screen bg-[#0B0F14] flex flex-col font-sans selection:bg-[#7C3AED]/30 text-[#D1D5DB]">
      <Header showLeaderboard={false} showBackButton={true} />

      <main className="max-w-[800px] mx-auto px-[24px] py-[64px] w-full flex-1">

        <div className="mb-[48px]">
          <h1 className="text-[32px] font-bold text-[#F9FAFB] tracking-tight mb-[8px]">Deploy Your Unit</h1>
          <p className="text-[16px] text-[#9CA3AF]">Complete the form below to authorize your team for the AWS Tycoon simulation.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-[32px]">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-[16px] rounded-[10px] flex items-center gap-[12px] text-[14px]">
              <FiAlertCircle size={18} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-[16px] rounded-[10px] flex items-center gap-[12px] text-[14px]">
              <FiCheckCircle size={18} className="flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Section: General Info */}
          <Card className="flex flex-col gap-[24px]">
            <div>
              <h2 className="text-[20px] font-semibold text-[#F9FAFB] mb-[4px]">Team Details</h2>
              <p className="text-[14px] text-[#9CA3AF]">Basic information about your deployment unit.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
              <div className="flex flex-col gap-[8px]">
                <label className="text-[14px] font-medium text-[#D1D5DB]">Team Name</label>
                <input
                  type="text"
                  name="teamName"
                  placeholder="e.g. Titan Force"
                  value={formData.teamName}
                  onChange={handleChange}
                  className={inputClasses}
                  required
                />
              </div>
              <div className="flex flex-col gap-[8px]">
                <label className="text-[14px] font-medium text-[#D1D5DB]">Organization / College</label>
                <input
                  type="text"
                  name="college"
                  placeholder="e.g. MIT"
                  value={formData.college}
                  onChange={handleChange}
                  className={inputClasses}
                  required
                />
              </div>
            </div>
          </Card>

          {/* Section: Personnel */}
          <div className="flex flex-col gap-[16px]">
            <div>
              <h2 className="text-[20px] font-semibold text-[#F9FAFB] mb-[4px]">Personnel Configurations</h2>
              <p className="text-[14px] text-[#9CA3AF]">Assign operators and credentials to your core roles.</p>
            </div>

            <div className="space-y-[16px]">
              {formData.members.map((member, idx) => (
                <Card key={idx} className="flex flex-col gap-[16px] p-[24px]">
                  <div className="flex items-center gap-[12px] border-b border-[#1F2937] pb-[16px]">
                    <div className="text-[#7C3AED]">
                      {roles[idx].icon}
                    </div>
                    <h3 className="text-[16px] font-semibold text-[#F9FAFB]">{roles[idx].title}</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
                    <div className="flex flex-col gap-[8px]">
                      <label className="text-[14px] font-medium text-[#D1D5DB]">Party/Spend Name</label>
                      <input
                        type="text"
                        placeholder={`Name of ${roles[idx].role.toUpperCase()}`}
                        value={member.name}
                        onChange={(e) => handleMemberChange(idx, 'name', e.target.value)}
                        className={inputClasses}
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-[8px]">
                      <label className="text-[14px] font-medium text-[#D1D5DB]">Password</label>
                      <PasswordInput
                        value={member.password}
                        onChange={(e) => handleMemberChange(idx, 'password', e.target.value)}
                        placeholder="••••••••"
                        showStrength={false}
                        required={true}
                        name={`password-${member.role}`}
                      />
                    </div>
                  </div>
                  {errors[member.role] && (
                    <div className="p-[12px] bg-red-500/10 rounded-[10px] border border-red-500/20 text-[12px] text-red-500">
                      {errors[member.role].join(', ')}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>

          {/* Section: Contact */}
          <Card className="flex flex-col gap-[24px]">
            <div>
              <h2 className="text-[20px] font-semibold text-[#F9FAFB] mb-[4px]">Primary Contact</h2>
              <p className="text-[14px] text-[#9CA3AF]">The liaison for emergency communications and reporting.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-[16px]">
              <div className="flex flex-col gap-[8px]">
                <label className="text-[14px] font-medium text-[#D1D5DB]">Team Lead Name</label>
                <input
                  type="text"
                  name="name"
                  placeholder="John Doe"
                  value={formData.teamLead.name}
                  onChange={handleTeamLeadChange}
                  className={inputClasses}
                  required
                />
              </div>
              <div className="flex flex-col gap-[8px]">
                <label className="text-[14px] font-medium text-[#D1D5DB]">Team Lead Email</label>
                <input
                  type="email"
                  name="email"
                  placeholder="john@example.com"
                  value={formData.teamLead.email}
                  onChange={handleTeamLeadChange}
                  className={inputClasses}
                  required
                />
              </div>
              <div className="flex flex-col gap-[8px]">
                <label className="text-[14px] font-medium text-[#D1D5DB]">Team Lead Phone</label>
                <div className="flex bg-[#0F172A] border border-[#1F2937] rounded-[10px] focus-within:border-[#7C3AED] focus-within:shadow-glow transition-all">
                  <span className="flex items-center pl-[14px] text-[#D1D5DB] text-[14px] border-r border-[#1F2937] pr-[12px]">
                    +91
                  </span>
                  <input
                    type="tel"
                    name="phone"
                    placeholder="00000 00000"
                    value={formData.teamLead.phone}
                    onChange={handleTeamLeadChange}
                    className="flex-1 bg-transparent px-[14px] py-[12px] text-[14px] text-[#F9FAFB] focus:outline-none placeholder:text-[#9CA3AF]"
                    required
                  />
                </div>
              </div>
            </div>
          </Card>

          <div className="mt-[16px] flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate('/login')}
              className="px-0"
            >
              Already deployed? Log in
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="px-[32px]"
            >
              {loading ? <FiLoader className="animate-spin" size={18} /> : 'Complete Sign Up'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default RegisterPage;
