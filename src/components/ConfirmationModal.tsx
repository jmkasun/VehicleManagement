import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger'
}: ConfirmationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center",
                  variant === 'danger' ? "bg-error/10 text-error" :
                  variant === 'warning' ? "bg-amber-100 text-amber-600" :
                  "bg-primary/10 text-primary"
                )}>
                  <AlertTriangle className="w-7 h-7" />
                </div>
                <button 
                  onClick={onClose}
                  className="w-10 h-10 rounded-full hover:bg-surface-container-low flex items-center justify-center text-on-surface-variant transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <h3 className="text-2xl font-black tracking-tight text-on-surface mb-2">{title}</h3>
              <p className="text-on-surface-variant font-medium leading-relaxed">{message}</p>

              <div className="mt-10 flex gap-4">
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-4 bg-white border border-outline-variant/30 rounded-2xl text-xs font-black uppercase tracking-widest text-on-surface hover:bg-surface-container-low transition-all"
                >
                  {cancelText}
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className={cn(
                    "flex-1 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-white shadow-xl transition-all",
                    variant === 'danger' ? "bg-error shadow-error/20 hover:bg-error/90" :
                    variant === 'warning' ? "bg-amber-500 shadow-amber-500/20 hover:bg-amber-600" :
                    "bg-primary shadow-primary/20 hover:bg-primary/90"
                  )}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
