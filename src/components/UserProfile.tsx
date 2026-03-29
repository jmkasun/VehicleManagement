import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { User as UserIcon, Mail, Lock, Shield, RefreshCw, CheckCircle, AlertCircle, Camera } from 'lucide-react';
import { apiService } from '../services/apiService';
import { User } from '../types';
import { cn } from '../lib/utils';

interface UserProfileProps {
  user: User;
  onUpdate: (updatedUser: User) => void;
}

export function UserProfile({ user, onUpdate }: UserProfileProps) {
  const [email, setEmail] = useState(user.email);
  const [profileImageUrl, setProfileImageUrl] = useState(user.profileImageUrl || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image size must be less than 2MB' });
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        const updated = await apiService.updateUser(user.id, {
          email: user.email,
          role: user.role,
          profileImageUrl: base64String
        });
        onUpdate(updated);
        setProfileImageUrl(base64String);
        setMessage({ type: 'success', text: 'Profile picture updated' });
      } catch (err: any) {
        setMessage({ type: 'error', text: err.message || 'Failed to upload image' });
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (password && password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    setIsLoading(true);
    try {
      const updated = await apiService.updateUser(user.id, {
        email,
        password: password || undefined,
        role: user.role,
        profileImageUrl: profileImageUrl || undefined
      });
      onUpdate(updated);
      setMessage({ type: 'success', text: 'Profile updated successfully' });
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-on-surface">Your Profile</h1>
        <p className="text-on-surface-variant font-medium">Manage your account settings and security</p>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-outline-variant/20 shadow-sm space-y-8">
        <div className="flex items-center gap-6">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-4 border-white shadow-xl transition-all group-hover:brightness-75">
              {isUploading ? (
                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
              ) : (
                <img 
                  src={user.profileImageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} 
                  alt="Avatar" 
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              title="Change Profile Picture"
            >
              <Camera className="w-8 h-8 text-white drop-shadow-lg" />
            </button>
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-on-surface">{user.email}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn(
                "text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest",
                user.role === 'admin' ? "bg-primary text-white" : "bg-surface-container-highest text-on-surface-variant"
              )}>
                {user.role}
              </span>
              <span className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest opacity-60">ID: {user.id}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-black text-on-surface uppercase tracking-widest opacity-40">Account Information</h3>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
                <input 
                  required
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-surface-container-low border-none rounded-2xl py-4 pl-12 pr-4 font-bold text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <h3 className="text-sm font-black text-on-surface uppercase tracking-widest opacity-40">Security</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
                  <input 
                    type="password"
                    placeholder="Leave blank to keep current"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-surface-container-low border-none rounded-2xl py-4 pl-12 pr-4 font-bold text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
                  <input 
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full bg-surface-container-low border-none rounded-2xl py-4 pl-12 pr-4 font-bold text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {message && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "p-4 rounded-2xl flex items-center gap-3 text-xs font-bold",
                message.type === 'success' ? "bg-primary/10 text-primary" : "bg-error/10 text-error"
              )}
            >
              {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              {message.text}
            </motion.div>
          )}

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 disabled:opacity-50"
          >
            {isLoading ? (
              <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              'Update Profile Settings'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
