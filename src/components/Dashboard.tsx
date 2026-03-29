import React, { useState } from 'react';
import { PlusCircle, RefreshCw, Car, BellRing, ChevronRight, Megaphone, Send, X, Wrench, Calendar, Gauge } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Vehicle, Alert, SystemUpdate, UpcomingService } from '../types';

interface DashboardProps {
  vehicles: Vehicle[];
  alerts: Alert[];
  systemUpdates: SystemUpdate[];
  upcomingServices: (UpcomingService & { vehicleName: string; licensePlate: string; vehicleImageUrl: string })[];
  onAddVehicle: () => void;
  onAddSystemUpdate: (message: string) => Promise<void>;
  onSelectVehicle: (id: string, section?: string) => void;
}

export function Dashboard({ vehicles, alerts, systemUpdates, upcomingServices, onAddVehicle, onAddSystemUpdate, onSelectVehicle }: DashboardProps) {
  const [isAddingUpdate, setIsAddingUpdate] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);

  const expiringSoonCount = vehicles.filter(v => {
    const expiryDate = new Date(v.insuranceExpiry);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 30;
  }).length;

  const scrollToAlerts = () => {
    const element = document.getElementById('renewal-alerts-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateMessage.trim()) return;
    setIsSubmittingUpdate(true);
    try {
      await onAddSystemUpdate(updateMessage);
      setUpdateMessage('');
      setIsAddingUpdate(false);
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Quick Actions */}
      <section className="grid grid-cols-2 gap-3">
        <button 
          onClick={onAddVehicle}
          className="flex flex-col items-center justify-center p-5 bg-primary text-white rounded-2xl shadow-lg shadow-primary/10 active:scale-95 transition-transform"
        >
          <PlusCircle className="w-8 h-8 mb-2" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Add Vehicle</span>
        </button>
        <button 
          onClick={() => setIsAddingUpdate(true)}
          className="flex flex-col items-center justify-center p-5 bg-white border border-outline-variant rounded-2xl shadow-sm active:scale-95 transition-transform"
        >
          <Megaphone className="w-8 h-8 mb-2 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface">Add Update</span>
        </button>
      </section>

      {/* Summary Cards */}
      <section className="grid grid-cols-2 gap-3">
        <div className="col-span-2 p-6 bg-white rounded-3xl border border-outline-variant shadow-sm flex items-center justify-between overflow-hidden relative group">
          <div className="relative z-10">
            <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest">Total Vehicles</p>
            <h2 className="text-4xl font-black text-on-surface mt-1">{vehicles.length.toString().padStart(2, '0')}</h2>
          </div>
          <Car className="absolute -right-4 -bottom-4 w-32 h-32 text-primary/5 group-hover:scale-110 transition-transform duration-500" />
          <div className="relative z-10 flex -space-x-2">
            {vehicles.slice(0, 2).map((v) => (
              <div key={v.id} className="w-10 h-10 rounded-full border-2 border-white bg-slate-100 overflow-hidden shadow-sm">
                <img src={v.imageUrl} alt={v.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
            ))}
            {vehicles.length > 2 && (
              <div className="w-10 h-10 rounded-full border-2 border-white bg-primary/5 flex items-center justify-center text-[10px] font-bold text-primary shadow-sm">+{vehicles.length - 2}</div>
            )}
          </div>
        </div>

        <button 
          onClick={scrollToAlerts}
          className="p-5 bg-amber-50 rounded-2xl border border-amber-100 text-left active:scale-95 transition-transform hover:shadow-md hover:shadow-amber-200/20"
        >
          <div className="flex items-center gap-2 mb-2">
            <BellRing className="w-4 h-4 text-amber-600" />
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-tighter">Expiring Soon</span>
          </div>
          <p className="text-3xl font-black text-amber-900">{expiringSoonCount.toString().padStart(2, '0')}</p>
        </button>

        <button 
          onClick={scrollToAlerts}
          className="p-5 bg-primary/5 rounded-2xl border border-primary/10 text-primary text-left active:scale-95 transition-transform hover:shadow-md hover:shadow-primary/10"
        >
          <div className="flex items-center gap-2 mb-2">
            <BellRing className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Active Alerts</span>
          </div>
          <p className="text-3xl font-black">{alerts.length.toString().padStart(2, '0')}</p>
        </button>
      </section>

      {/* Upcoming Maintenance */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-black uppercase tracking-widest text-on-surface">Upcoming Maintenance</h3>
          </div>
          <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest bg-surface-container-low px-2 py-0.5 rounded-full">
            Next 30 Days
          </span>
        </div>
        <div className="space-y-3">
          {upcomingServices.length > 0 ? upcomingServices.slice(0, 3).map((service) => (
            <div 
              key={service.id}
              onClick={() => onSelectVehicle(service.vehicleId, 'upcoming-services-section')}
              className="group relative flex items-center p-4 bg-white rounded-2xl border border-outline-variant shadow-sm transition-all hover:shadow-md cursor-pointer active:scale-[0.98]"
            >
              <div className={cn(
                "flex-shrink-0 w-14 h-14 rounded-xl bg-surface-container-highest overflow-hidden border border-outline-variant",
                service.priority === 'High' && "ring-2 ring-error/20"
              )}>
                {service.vehicleImageUrl ? (
                  <img src={service.vehicleImageUrl} alt={service.vehicleName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className={cn(
                    "w-full h-full flex items-center justify-center",
                    service.priority === 'High' ? "bg-error/10 text-error" : "bg-primary/10 text-primary"
                  )}>
                    <Wrench className="w-6 h-6" />
                  </div>
                )}
              </div>
              <div className="ml-4 flex-1">
                <div className="flex justify-between items-start">
                  <h4 className="text-sm font-bold text-on-surface">{service.title}</h4>
                  <div className="flex items-center gap-2 text-primary font-black text-[10px]">
                    <Calendar className="w-3 h-3" />
                    {service.dueDate}
                  </div>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest opacity-60">
                    {service.vehicleName} • {service.licensePlate}
                  </p>
                  {service.dueOdometer > 0 && (
                    <div className="flex items-center gap-1 text-on-surface-variant font-bold text-[9px] uppercase tracking-widest opacity-60">
                      <Gauge className="w-3 h-3" />
                      {service.dueOdometer.toLocaleString()} KM
                    </div>
                  )}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-outline-variant group-hover:text-primary transition-colors ml-2" />
            </div>
          )) : (
            <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-outline-variant">
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">No upcoming tasks</p>
            </div>
          )}
        </div>
      </section>

      {/* Renewal Alerts */}
      <section id="renewal-alerts-section" className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-black uppercase tracking-widest text-on-surface">Renewal Alerts</h3>
          <button className="text-[10px] font-bold text-primary uppercase hover:underline">View All</button>
        </div>
        <div className="space-y-6">
          {alerts.length > 0 ? (
            Object.entries(
              alerts.reduce((acc, alert) => {
                if (!acc[alert.vehicleId]) acc[alert.vehicleId] = [];
                acc[alert.vehicleId].push(alert);
                return acc;
              }, {} as Record<string, Alert[]>)
            ).map(([vehicleId, vehicleAlerts]) => {
              const vehicle = vehicles.find(v => v.id === vehicleId);
              return (
                <div key={vehicleId} className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-1 h-4 bg-primary rounded-full" />
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                      {vehicle?.name || 'Unknown Vehicle'} • {vehicle?.licensePlate || vehicleAlerts[0].vehiclePlate}
                    </h4>
                  </div>
                  <div className="space-y-3">
                    {vehicleAlerts.map((alert) => (
                      <div 
                        key={alert.id}
                        onClick={() => onSelectVehicle(alert.vehicleId)}
                        className={cn(
                          "group relative flex items-center p-4 bg-white rounded-2xl border-l-4 border-outline-variant shadow-sm transition-all hover:shadow-md cursor-pointer active:scale-[0.98]",
                          alert.type === 'Expired' ? "border-l-error" : "border-l-amber-500"
                        )}
                      >
                        <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-surface-container-highest overflow-hidden">
                          <img src={alert.imageUrl} alt={alert.vehiclePlate} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div className="ml-4 flex-1">
                          <div className="flex justify-between items-start">
                            <h4 className="text-sm font-bold text-on-surface">{alert.type}</h4>
                            <span className={cn(
                              "px-2 py-0.5 text-[9px] font-black rounded-full uppercase",
                              alert.type === 'Expired' 
                                ? "bg-error-container text-on-error-container" 
                                : "bg-amber-100 text-amber-700"
                            )}>
                              {alert.daysLeft !== undefined ? `${alert.daysLeft} Days Left` : alert.type}
                            </span>
                          </div>
                          <p className="text-[11px] text-on-surface-variant font-medium mt-1">{alert.message}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-outline-variant group-hover:text-primary transition-colors ml-2" />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-outline-variant">
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">No active alerts</p>
            </div>
          )}
        </div>
      </section>

      {/* System Updates */}
      <section className="bg-surface-container-low rounded-3xl p-6 border border-outline-variant">
        <div className="flex items-center gap-3 mb-5">
          <Megaphone className="w-5 h-5 text-primary" />
          <h3 className="text-xs font-black uppercase tracking-widest text-primary">System Updates</h3>
        </div>
        <div className="space-y-5">
          {systemUpdates.length > 0 ? systemUpdates.map((update) => (
            <div key={update.id} className="flex gap-4">
              <div className={cn(
                "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                update.isNew ? "bg-primary" : "bg-outline-variant"
              )} />
              <p className="text-xs text-on-surface-variant leading-relaxed font-medium">{update.message}</p>
            </div>
          )) : (
            <p className="text-xs text-on-surface-variant font-medium text-center py-4">No new system updates</p>
          )}
        </div>
      </section>

      {/* Add Update Modal */}
      <AnimatePresence>
        {isAddingUpdate && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingUpdate(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black text-on-surface uppercase tracking-tight">Post System Update</h3>
                <button 
                  onClick={() => setIsAddingUpdate(false)}
                  className="p-2 hover:bg-surface-container-highest rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleUpdateSubmit} className="space-y-4">
                <textarea
                  value={updateMessage}
                  onChange={(e) => setUpdateMessage(e.target.value)}
                  placeholder="Enter update message (e.g. Fuel price news, system maintenance...)"
                  className="w-full h-32 p-4 bg-surface-container-low border border-outline-variant rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                  required
                />
                <button
                  type="submit"
                  disabled={isSubmittingUpdate}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {isSubmittingUpdate ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Post Update
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
