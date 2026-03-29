import React, { useState, useEffect } from 'react';
import { 
  History as HistoryIcon, Search, Plus, 
  CheckCircle2, Wrench, Settings2, Droplets, 
  Battery, ChevronDown, AlertCircle, Leaf,
  Car, RefreshCw
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { Vehicle, ServiceRecord } from '../types';
import { apiService } from '../services/apiService';
import { LogMaintenanceModal } from './LogMaintenanceModal';

interface ServiceHistoryProps {
  vehicles: Vehicle[];
  onServiceAdded?: () => void;
  initialVehicleId?: string;
}

export function ServiceHistory({ vehicles, onServiceAdded, initialVehicleId }: ServiceHistoryProps) {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(initialVehicleId || vehicles[0]?.id || '');
  const [history, setHistory] = useState<ServiceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchHistory = async () => {
    if (selectedVehicleId) {
      setIsLoading(true);
      try {
        const data = await apiService.getServiceHistory(selectedVehicleId);
        setHistory(data);
      } catch (error) {
        console.error('Failed to fetch history:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [selectedVehicleId]);

  const handleSaveMaintenance = async (record: Partial<ServiceRecord>) => {
    try {
      await apiService.addServiceRecord(record);
      await fetchHistory();
      if (onServiceAdded) onServiceAdded();
    } catch (error) {
      console.error('Error saving maintenance:', error);
      alert('Failed to log maintenance record');
      throw error;
    }
  };

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);

  return (
    <div className="pb-12">
      {/* Header */}
      <section className="mb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div className="flex items-center gap-6">
            {selectedVehicle && (
              <div className="w-20 h-20 rounded-2xl bg-surface-container-highest overflow-hidden border border-outline-variant shadow-sm shrink-0">
                <img 
                  src={selectedVehicle.imageUrl} 
                  alt={selectedVehicle.name} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            <div>
              <h1 className="text-4xl font-black tracking-tighter text-on-surface mb-2">Service History</h1>
              <div className="flex items-center gap-3">
                <select 
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="bg-surface-container-low border-none rounded-xl py-2 px-4 font-bold text-sm text-primary focus:ring-2 focus:ring-primary/20 transition-all"
                >
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.name} • {v.licensePlate}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-primary hover:bg-primary-container text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-2xl shadow-primary/20"
          >
            <Plus className="w-5 h-5" />
            Log New Maintenance
          </button>
        </div>

        {/* Search */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-outline-variant" />
          </div>
          <input 
            className="w-full bg-surface-container-low border-none rounded-2xl py-5 pl-14 pr-6 focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-outline-variant font-bold text-sm" 
            placeholder="Search by parts, tasks or service type..." 
            type="text"
          />
        </div>
      </section>

      {/* Timeline */}
      <div className="relative">
        {/* Central Line */}
        <div className="absolute left-[11px] top-4 bottom-0 w-[2px] bg-outline-variant/20" />

        <div className="space-y-12">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-outline-variant">
              <HistoryIcon className="w-12 h-12 text-outline-variant mx-auto mb-4 opacity-20" />
              <p className="text-on-surface-variant font-bold">No service records found for this vehicle.</p>
            </div>
          ) : history.map((record, index) => (
            <div key={record.id} className="relative pl-12 group">
              {/* Node */}
              <div className={cn(
                "absolute left-0 top-1 w-6 h-6 rounded-full bg-white border-4 shadow-sm z-10 transition-all duration-500 group-hover:scale-125",
                index === 0 ? "border-primary" : "border-outline-variant/40"
              )} />

              <div className={cn(
                "bg-white rounded-[2rem] p-8 transition-all hover:shadow-2xl hover:shadow-primary/5 border border-outline-variant/10",
                index > 1 && "opacity-60 hover:opacity-100"
              )}>
                <div className="flex flex-col lg:flex-row justify-between items-start gap-6 mb-8">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary">{record.date}</span>
                      {record.type === 'Brake Overhaul' && (
                        <span className="bg-tertiary-container text-on-tertiary-fixed text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-widest">Critical</span>
                      )}
                      {record.type === 'Full Service' && (
                        <span className="bg-primary-container text-white text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-widest">Routine</span>
                      )}
                    </div>
                    <h2 className="text-2xl font-black tracking-tight text-on-surface">{record.title}</h2>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-on-surface">LKR {record.cost?.toLocaleString() || '0'}.00</div>
                    <div className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-60 mt-1">Odometer: {(record.odometer || 0).toLocaleString()} KM</div>
                  </div>
                </div>

                {index < 2 && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div>
                      <h3 className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-5 opacity-60">Tasks Performed</h3>
                      <ul className="space-y-4">
                        {record.description.split(',').map((task, i) => (
                          <li key={i} className="flex items-center gap-4 text-on-surface font-bold text-sm">
                            <CheckCircle2 className="w-5 h-5 text-primary fill-primary/10" />
                            {task.trim()}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    {record.parts && (
                      <div className="bg-surface-container-low rounded-3xl p-6">
                        <h3 className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-5 opacity-60">Spare Parts Inventory</h3>
                        <div className="space-y-4">
                          {record.parts.map((part, i) => (
                            <div key={i} className="flex justify-between items-center text-sm font-bold">
                              <span className="text-on-surface">{part.name}</span>
                              <span className="text-on-surface-variant">LKR {(part.cost || 0).toLocaleString()}</span>
                            </div>
                          ))}
                          <div className="flex justify-between items-center text-sm pt-4 border-t border-outline-variant/20">
                            <span className="text-on-surface-variant text-[10px] font-black uppercase tracking-widest italic opacity-60">Labor & Service Fees</span>
                            <span className="text-on-surface-variant font-bold">LKR {record.laborCost?.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {index >= 2 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-on-surface-variant font-medium">{record.description}</p>
                    <button className="p-2 hover:bg-surface-container-low rounded-full transition-colors">
                      <ChevronDown className="w-5 h-5 text-outline-variant" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Advisory Section */}
      <section className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-3xl flex gap-5">
          <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-amber-600 shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h5 className="font-black text-amber-900 text-sm uppercase tracking-widest">Upcoming: Brake Pads</h5>
            <p className="text-xs text-amber-800/80 mt-2 font-medium leading-relaxed">Based on your driving patterns, brake pads may need inspection in approximately 3,000 km.</p>
          </div>
        </div>
        <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-3xl flex gap-5">
          <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-emerald-600 shrink-0">
            <Leaf className="w-6 h-6" />
          </div>
          <div>
            <h5 className="font-black text-emerald-900 text-sm uppercase tracking-widest">Efficiency Update</h5>
            <p className="text-xs text-emerald-800/80 mt-2 font-medium leading-relaxed">Your last service improved overall range efficiency by 4.2% over the last 1,000 km.</p>
          </div>
        </div>
      </section>

      {/* Decorative Engine View */}
      <div className="mt-20 flex justify-center opacity-20 hover:opacity-40 transition-opacity duration-1000">
        <img 
          alt="Engine detail" 
          className="w-full max-w-2xl h-48 object-cover rounded-[4rem] grayscale" 
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBY7FJhU31UaTgFxmmR4Zl5wZJwyjlc5HzGbqkT3BQ3TVwyevzSGJDtfW2y0aop7a9ni7QnzFt8HNx1NjE0PwbjPRgfUk5Qi8e4euqwAS8s4j-NhT4L4BjzwQfRIDNub1v4cMe9rhvo37BD-_l_rTzbLqi0tU40Qf7HgllLnOIujk0fzeCaIxFmNQXynzrNl_0PoYHZZVxeJjdMqQXZNzqpYnFKBNGpcodO6lzxQjzmYHu7KJYRDu2EXZuntjvkiVvwclAMF_4up8c"
          referrerPolicy="no-referrer"
        />
      </div>

      <LogMaintenanceModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveMaintenance}
        vehicleId={selectedVehicleId}
      />
    </div>
  );
}
