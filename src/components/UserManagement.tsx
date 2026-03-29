import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Plus, Trash2, Mail, Lock, Shield, X, RefreshCw, UserPlus } from 'lucide-react';
import { apiService } from '../services/apiService';
import { User } from '../types';
import { cn } from '../lib/utils';

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', role: 'user' as const });
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const data = await apiService.getUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiService.addUser(newUser);
      setNewUser({ email: '', password: '', role: 'user' });
      setIsAddingUser(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to add user');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await apiService.deleteUser(id);
      fetchUsers();
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-on-surface">User Management</h1>
          <p className="text-on-surface-variant font-medium">Manage system access and roles</p>
        </div>
        <button 
          onClick={() => setIsAddingUser(true)}
          className="bg-primary text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
        >
          <UserPlus className="w-4 h-4" />
          Add New User
        </button>
      </div>

      <AnimatePresence>
        {isAddingUser && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleAddUser} className="bg-white p-8 rounded-[2.5rem] border border-outline-variant/20 shadow-sm space-y-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-black tracking-tight">Create New Account</h2>
                <button type="button" onClick={() => setIsAddingUser(false)} className="text-on-surface-variant hover:text-on-surface">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
                    <input 
                      required
                      type="email"
                      placeholder="user@example.com"
                      value={newUser.email}
                      onChange={e => setNewUser({...newUser, email: e.target.value})}
                      className="w-full bg-surface-container-low border-none rounded-2xl py-4 pl-12 pr-4 font-bold text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
                    <input 
                      required
                      type="password"
                      placeholder="••••••••"
                      value={newUser.password}
                      onChange={e => setNewUser({...newUser, password: e.target.value})}
                      className="w-full bg-surface-container-low border-none rounded-2xl py-4 pl-12 pr-4 font-bold text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1">System Role</label>
                  <div className="relative">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
                    <select 
                      value={newUser.role}
                      onChange={e => setNewUser({...newUser, role: e.target.value as 'admin' | 'user'})}
                      className="w-full bg-surface-container-low border-none rounded-2xl py-4 pl-12 pr-4 font-bold text-sm focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                    >
                      <option value="user">Standard User</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-error/10 text-error p-4 rounded-2xl text-xs font-bold">
                  {error}
                </div>
              )}

              <div className="flex gap-4">
                <button 
                  type="submit"
                  className="flex-1 bg-primary text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all shadow-xl shadow-primary/20"
                >
                  Create User Account
                </button>
                <button 
                  type="button"
                  onClick={() => setIsAddingUser(false)}
                  className="px-8 bg-surface-container-high text-on-surface py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-surface-container-highest transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-[2.5rem] border border-outline-variant/20 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant/10">
                <th className="px-8 py-5 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">User</th>
                <th className="px-8 py-5 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Role</th>
                <th className="px-8 py-5 text-[10px] font-black text-on-surface-variant uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="px-8 py-12 text-center">
                    <RefreshCw className="w-6 h-6 text-primary animate-spin mx-auto" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-8 py-12 text-center text-on-surface-variant font-medium">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-surface-container-lowest transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border border-primary/20">
                          <img 
                            src={user.profileImageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} 
                            alt="Avatar" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-bold text-on-surface">{user.email}</p>
                          <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-widest opacity-60">ID: {user.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={cn(
                        "text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest",
                        user.role === 'admin' ? "bg-primary text-white" : "bg-surface-container-highest text-on-surface-variant"
                      )}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button 
                        onClick={() => handleDeleteUser(user.id)}
                        className="w-10 h-10 rounded-xl bg-white border border-outline-variant/20 flex items-center justify-center text-on-surface-variant hover:text-error hover:border-error/20 transition-all opacity-0 group-hover:opacity-100 mx-auto ml-auto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
