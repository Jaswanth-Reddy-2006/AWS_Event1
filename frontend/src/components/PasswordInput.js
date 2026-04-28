import React from 'react';
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';

/**
 * PasswordInput Component
 * Shows/hides password with strength indicator
 */
export default function PasswordInput({
  value,
  onChange,
  placeholder = 'Password',
  showStrength = false,
  required = false,
  name = 'password',
  strengthMessage = '',
  className = ''
}) {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <div className="w-full">
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          name={name}
          className={`w-full bg-brand-bg border border-brand-border rounded-xl px-14 py-12 text-14 text-brand-text-primary focus:border-brand-primary focus:shadow-glow focus:outline-none transition-all placeholder:text-brand-text-muted ${className}`}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-14 top-1/2 transform -translate-y-1/2 text-brand-text-muted hover:text-brand-text-primary transition-colors focus:outline-none"
          title={showPassword ? 'Hide Access Key' : 'Show Access Key'}
        >
          {showPassword ? (
            <AiOutlineEyeInvisible size={20} />
          ) : (
            <AiOutlineEye size={20} />
          )}
        </button>
      </div>

      {/* Password strength indicator */}
      {showStrength && value && (
        <div className="mt-8 p-16 bg-brand-elevated border border-brand-border rounded-lg text-12 animate-in fade-in duration-300">
          <div className="font-semibold text-brand-text-primary mb-8 uppercase tracking-widest text-[10px]">Security Requirements:</div>
          <ul className="space-y-4 text-brand-text-muted">
            <li className={`flex items-center space-x-8 ${value.length >= 8 ? 'text-emerald-400' : 'text-brand-text-muted opacity-50'}`}>
              <div className="w-4 h-4 rounded-full bg-current" />
              <span>At least 8 characters</span>
            </li>
            <li className={`flex items-center space-x-8 ${/[A-Z]/.test(value) ? 'text-emerald-400' : 'text-brand-text-muted opacity-50'}`}>
              <div className="w-4 h-4 rounded-full bg-current" />
              <span>At least 1 uppercase (A-Z)</span>
            </li>
            <li className={`flex items-center space-x-8 ${/[a-z]/.test(value) ? 'text-emerald-400' : 'text-brand-text-muted opacity-50'}`}>
              <div className="w-4 h-4 rounded-full bg-current" />
              <span>At least 1 lowercase (a-z)</span>
            </li>
            <li className={`flex items-center space-x-8 ${/[0-9]/.test(value) ? 'text-emerald-400' : 'text-brand-text-muted opacity-50'}`}>
              <div className="w-4 h-4 rounded-full bg-current" />
              <span>At least 1 number (0-9)</span>
            </li>
            <li className={`flex items-center space-x-8 ${/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value) ? 'text-emerald-400' : 'text-brand-text-muted opacity-50'}`}>
              <div className="w-4 h-4 rounded-full bg-current" />
              <span>At least 1 special char</span>
            </li>
          </ul>
        </div>
      )}

      {/* Strength message */}
      {strengthMessage && (
        <div className="mt-8 text-12 font-medium text-brand-primary" dangerouslySetInnerHTML={{ __html: strengthMessage }} />
      )}
    </div>
  );
}

