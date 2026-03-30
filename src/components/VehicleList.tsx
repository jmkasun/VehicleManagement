import React from 'react';
import { MoreVertical, Calendar, AlertTriangle, Info, PlusCircle, Trash2, Edit3, Search, Filter, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { Vehicle } from '../types';
import { ConfirmationModal } from './ConfirmationModal';

interface VehicleListProps {
  vehicles: Vehicle[];
  onSelectVehicle: (vehicle: Vehicle) => void;
  onAddVehicle: () => void;
}

export function VehicleList({ vehicles, onSelectVehicle, onAddVehicle }: VehicleListProps) {
  const [filter, setFilter] = React.useState('All Vehicles');

  const filteredVehicles = vehicles.filter(vehicle => {
    if (filter === 'All Vehicles') return true;
    return vehicle.status === filter;
  });

  return (
    <div className="space-y-6 pb-8">
      <div className="py-2 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-6 bg-primary rounded-full" />
            <h2 className="text-3xl font-black tracking-tight text-on-surface">Fleet Assets</h2>
          </div>
          <p className="text-on-surface-variant text-sm font-medium">Manage and track your registered vehicle inventory</p>
        </div>
        <button 
          onClick={onAddVehicle}
          className="bg-primary text-white p-3 rounded-2xl shadow-lg shadow-primary/20 active:scale-95 transition-transform"
        >
          <PlusCircle className="w-6 h-6" />
        </button>
      </div>

      <div className="flex gap-2 mt-6 overflow-x-auto pb-2 no-scrollbar">
          {['All Vehicles', 'Active', 'Inactive'].map((f) => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all",
                filter === f 
                  ? "bg-primary text-white shadow-lg shadow-primary/20" 
                  : "bg-white border border-outline-variant text-on-surface-variant hover:border-primary"
              )}
            >
              {f}
            </button>
          ))}
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredVehicles.map((vehicle) => (
          <div 
            key={vehicle.id}
            onClick={() => onSelectVehicle(vehicle)}
            className="bg-white rounded-2xl overflow-hidden border border-outline-variant/30 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all group cursor-pointer"
          >
            <div className="flex h-full">
              <div className="w-32 sm:w-44 relative overflow-hidden">
                <img 
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" 
                  src={vehicle.imageUrl} 
                  alt={vehicle.name}
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-3 left-3">
                  <span className={cn(
                    "text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-wider shadow-sm",
                    vehicle.status === 'Active' ? "bg-emerald-400 text-white" : "bg-slate-500 text-white"
                  )}>
                    {vehicle.status}
                  </span>
                </div>
              </div>
              <div className="flex-1 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="font-black text-on-surface text-lg leading-tight">{vehicle.name}</h3>
                    <div className="flex gap-2">
                      <button className="text-outline-variant hover:text-primary transition-colors">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="bg-surface-container-low inline-block px-2 py-1 rounded-lg border border-outline-variant/20 mt-2">
                    <span className="text-[10px] font-mono font-black text-primary uppercase tracking-tighter">{vehicle.licensePlate}</span>
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-outline-variant/10 flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-outline-variant" />
                  <div className="flex flex-col">
                    <span className="text-[9px] text-on-surface-variant font-black leading-none uppercase tracking-widest">Next Service</span>
                    <span className="text-xs font-bold mt-1 text-on-surface">
                      {vehicle.nextServiceDate}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
