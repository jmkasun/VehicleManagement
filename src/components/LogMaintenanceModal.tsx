import React, { useState } from 'react';
import { X, Wrench, Calendar, Gauge, FileText, DollarSign, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ServiceRecord } from '../types';

interface LogMaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: Partial<ServiceRecord>) => Promise<void>;
  vehicleId: string;
}

export function LogMaintenanceModal({ isOpen, onClose, onSave, vehicleId }: LogMaintenanceModalProps) {
  const [formData, setFormData] = useState<Partial<ServiceRecord>>({
    date: new Date().toISOString().split('T')[0],
    odometer: 0,
    title: '',
    description: '',
    type: 'Full Service',
    cost: 0,
    laborCost: 0,
    parts: [],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPart, setNewPart] = useState({ name: '', cost: 0 });

  const handleAddPart = () => {
    if (newPart.name && newPart.cost >= 0) {
      const updatedParts = [...(formData.parts || []), { ...newPart }];
      const totalPartsCost = updatedParts.reduce((sum, p) => sum + p.cost, 0);
      setFormData({
        ...formData,
        parts: updatedParts,
        cost: totalPartsCost + (formData.laborCost || 0)
      });
      setNewPart({ name: '', cost: 0 });
    }
  };

  const handleRemovePart = (index: number) => {
    const updatedParts = (formData.parts || []).filter((_, i) => i !== index);
    const totalPartsCost = updatedParts.reduce((sum, p) => sum + p.cost, 0);
    setFormData({
      ...formData,
      parts: updatedParts,
      cost: totalPartsCost + (formData.laborCost || 0)
    });
  };

  const handleLaborCostChange = (val: number) => {
    const totalPartsCost = (formData.parts || []).reduce((sum, p) => sum + p.cost, 0);
    setFormData({
      ...formData,
      laborCost: val,
      cost: totalPartsCost + val
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave({ ...formData, vehicleId } as any);
      onClose();
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        odometer: 0,
        title: '',
        description: '',
        type: 'Full Service',
        cost: 0,
        laborCost: 0,
        parts: [],
      });
    } catch (error) {
      console.error('Failed to log maintenance:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-6 border-b border-outline-variant flex items-center justify-between bg-surface-container-low">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Wrench className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-on-surface leading-none">Log Maintenance</h2>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">Record a new service entry</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full hover:bg-surface-container-highest flex items-center justify-center transition-colors"
              >
                <X className="w-6 h-6 text-on-surface-variant" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1">Service Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline-variant" />
                    <input
                      type="date"
                      required
                      value={formData.date ?? ''}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full bg-surface-container-low border-none rounded-2xl py-4 pl-12 pr-4 font-bold text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1">Odometer Reading (KM)</label>
                  <div className="relative">
                    <Gauge className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline-variant" />
                    <input
                      type="number"
                      required
                      value={formData.odometer ?? 0}
                      onChange={(e) => setFormData({ ...formData, odometer: parseInt(e.target.value) })}
                      className="w-full bg-surface-container-low border-none rounded-2xl py-4 pl-12 pr-4 font-bold text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1">Service Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 50,000 KM Routine Service"
                  value={formData.title ?? ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-surface-container-low border-none rounded-2xl py-4 px-6 font-bold text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1">Service Type</label>
                  <select
                    value={formData.type ?? 'Full Service'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full bg-surface-container-low border-none rounded-2xl py-4 px-6 font-bold text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                  >
                    <option value="Full Service">Full Service</option>
                    <option value="Tire Rotation">Tire Rotation</option>
                    <option value="Oil Change">Oil Change</option>
                    <option value="Brake Overhaul">Brake Overhaul</option>
                    <option value="Battery Replacement">Battery Replacement</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1">Labor Cost (LKR)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline-variant" />
                    <input
                      type="number"
                      value={formData.laborCost ?? 0}
                      onChange={(e) => handleLaborCostChange(parseFloat(e.target.value))}
                      className="w-full bg-surface-container-low border-none rounded-2xl py-4 pl-12 pr-4 font-bold text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1">Description / Tasks (Comma separated)</label>
                <textarea
                  required
                  placeholder="e.g. Oil filter replaced, Brake pads checked, Air filter cleaned"
                  value={formData.description ?? ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-surface-container-low border-none rounded-2xl py-4 px-6 font-bold text-sm focus:ring-2 focus:ring-primary/20 transition-all h-24 resize-none"
                />
              </div>

              {/* Parts Section */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1">Spare Parts Used</label>
                <div className="bg-surface-container-low rounded-3xl p-4 space-y-4">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Part Name"
                      value={newPart.name}
                      onChange={(e) => setNewPart({ ...newPart, name: e.target.value })}
                      className="flex-1 bg-white border-none rounded-xl py-3 px-4 font-bold text-xs focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                    <input
                      type="number"
                      placeholder="Cost"
                      value={newPart.cost || ''}
                      onChange={(e) => setNewPart({ ...newPart, cost: parseFloat(e.target.value) })}
                      className="w-32 bg-white border-none rounded-xl py-3 px-4 font-bold text-xs focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={handleAddPart}
                      className="w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center hover:bg-primary/90 transition-all"
                    >
                      <Plus className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {formData.parts?.map((part, index) => (
                      <div key={index} className="flex items-center justify-between bg-white p-3 rounded-xl border border-outline-variant/10">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-on-surface">{part.name}</span>
                          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">LKR {part.cost.toLocaleString()}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePart(index)}
                          className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Total Summary */}
              <div className="p-6 bg-primary/5 rounded-3xl border border-primary/10 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest">Total Service Cost</p>
                  <h3 className="text-2xl font-black text-primary mt-1">LKR {(formData.cost || 0).toLocaleString()}.00</h3>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Parts: LKR {(formData.parts?.reduce((s, p) => s + p.cost, 0) || 0).toLocaleString()}</p>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Labor: LKR {(formData.laborCost || 0).toLocaleString()}</p>
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="p-6 bg-surface-container-low border-t border-outline-variant flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-4 bg-white border border-outline-variant text-on-surface rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-surface-container-highest transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Save Record
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function RefreshCw(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}
