import React, { useState } from 'react';
import { ShieldCheck, User, Lock } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthPageProps {
  onLogin: (email: string, pass: string) => void;
  error?: string;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLogin, error }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div className="min-h-screen bg-[#f8f9f6] flex items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white p-10 rounded-[2.5rem] border border-[#e2e8e2] shadow-2xl shadow-black/5"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="bg-[#5a6b5d] p-4 rounded-2xl mb-4 shadow-xl shadow-[#5a6b5d]/20">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-[#1a1f1b]">CreditFlow Secure</h2>
          <p className="text-sm text-[#6b776d] mt-2 text-center">Enter credentials to access the AI control panel.</p>
          
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-3 bg-rose-50 border border-rose-100 rounded-xl text-center"
            >
              <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">{error}</p>
            </motion.div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-[10px] font-bold text-[#8a968d] uppercase tracking-widest block mb-1.5 ml-1">Work Email</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a968d]" />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full pl-11 pr-4 py-3.5 bg-[#f0f2f0] border-none rounded-2xl text-sm focus:ring-2 focus:ring-[#5a6b5d] transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-[#8a968d] uppercase tracking-widest block mb-1.5 ml-1">Access Token</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a968d]" />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter secure key..."
                className="w-full pl-11 pr-4 py-3.5 bg-[#f0f2f0] border-none rounded-2xl text-sm focus:ring-2 focus:ring-[#5a6b5d] transition-all"
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-[#1a1f1b] text-white py-4 rounded-2xl font-bold shadow-xl shadow-black/10 hover:bg-[#2a302b] transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            Sign In to Agent
          </button>
        </form>

        <p className="text-center text-[10px] text-[#8a968d] mt-10 uppercase tracking-widest leading-relaxed">
          Protected by multi-factor semantic anchoring <br /> & zero-knowledge processing
        </p>
      </motion.div>
    </div>
  );
};
