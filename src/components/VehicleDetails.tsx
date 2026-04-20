import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Edit3, CheckCircle2, ShieldCheck, 
  FileText, Gauge, History as HistoryIcon, 
  RefreshCw, ChevronRight, FileUp, Download, Car,
  Calendar, Clock, AlertTriangle, Trash2, Plus, Edit2,
  Image as ImageIcon, Camera, X, Wrench, CalendarPlus
} from 'lucide-react';
import { Vehicle, UpcomingService, VehicleImage } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { apiService } from '../services/apiService';
import { LogMaintenanceModal } from './LogMaintenanceModal';
import { ConfirmationModal } from './ConfirmationModal';

interface VehicleDetailsProps {
  vehicle: Vehicle;
  onBack: () => void;
  onEdit: () => void;
  onDelete: (id: string) => void;
  onViewHistory: () => void;
  scrollToSection?: string;
}

export function VehicleDetails({ vehicle, onBack, onEdit, onDelete, onViewHistory, scrollToSection }: VehicleDetailsProps) {
  const [upcomingServices, setUpcomingServices] = useState<UpcomingService[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [isAddingService, setIsAddingService] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [newService, setNewService] = useState({
    title: '',
    description: '',
    dueDate: '',
    dueOdometer: 0,
    priority: 'Medium' as const
  });

  const [vehicleImages, setVehicleImages] = useState<VehicleImage[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [isAddingImage, setIsAddingImage] = useState(false);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [selectedImageForView, setSelectedImageForView] = useState<VehicleImage | null>(null);
  const [newImage, setNewImage] = useState({
    topic: '',
    description: '',
    imageUrl: ''
  });

  const fetchUpcomingServices = async () => {
    setIsLoadingServices(true);
    try {
      const data = await apiService.getUpcomingServices(vehicle.id);
      setUpcomingServices(data);
    } catch (error) {
      console.error('Failed to fetch upcoming services:', error);
    } finally {
      setIsLoadingServices(false);
    }
  };

  const fetchVehicleImages = async () => {
    setIsLoadingImages(true);
    try {
      const data = await apiService.getVehicleImages(vehicle.id);
      setVehicleImages(data);
    } catch (error) {
      console.error('Failed to fetch vehicle images:', error);
    } finally {
      setIsLoadingImages(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchUpcomingServices(),
        fetchVehicleImages()
      ]);
      
      if (scrollToSection) {
        setTimeout(() => {
          const element = document.getElementById(scrollToSection);
          if (element) {
            const yOffset = -100;
            const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
          }
        }, 300); // Wait for AnimatePresence transition (0.2s)
      }
    };
    
    loadData();
  }, [vehicle.id, scrollToSection]);

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingServiceId) {
        await apiService.updateUpcomingService(editingServiceId, {
          ...newService,
          vehicleId: vehicle.id,
          status: 'Pending'
        });
      } else {
        await apiService.addUpcomingService({
          ...newService,
          vehicleId: vehicle.id,
          status: 'Pending'
        });
      }
      setNewService({
        title: '',
        description: '',
        dueDate: '',
        dueOdometer: 0,
        priority: 'Medium'
      });
      setIsAddingService(false);
      setEditingServiceId(null);
      fetchUpcomingServices();
    } catch (error) {
      console.error('Failed to save service:', error);
    }
  };

  const handleEditService = (service: UpcomingService) => {
    setNewService({
      title: service.title,
      description: service.description || '',
      dueDate: service.dueDate || '',
      dueOdometer: service.dueOdometer || 0,
      priority: service.priority
    });
    setEditingServiceId(service.id);
    setIsAddingService(true);
    
    // Scroll to form
    const element = document.getElementById('upcoming-services-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleDeleteService = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Service Task?',
      message: 'Are you sure you want to remove this upcoming service task? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await apiService.deleteUpcomingService(id);
          fetchUpcomingServices();
        } catch (error) {
          console.error('Failed to delete service:', error);
        }
      }
    });
  };

  const handleAddImage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingImageId) {
        await apiService.updateVehicleImage(editingImageId, newImage);
      } else {
        await apiService.addVehicleImage(vehicle.id, newImage);
      }
      setNewImage({ topic: '', description: '', imageUrl: '' });
      setIsAddingImage(false);
      setEditingImageId(null);
      fetchVehicleImages();
    } catch (error) {
      console.error('Failed to save vehicle image:', error);
    }
  };

  const handleEditImage = (img: VehicleImage) => {
    setNewImage({
      topic: img.topic,
      description: img.description || '',
      imageUrl: img.imageUrl
    });
    setEditingImageId(img.id);
    setIsAddingImage(true);

    // Scroll to form
    const element = document.getElementById('documents-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleDeleteImage = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Document/Image?',
      message: 'Are you sure you want to remove this document or image? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await apiService.deleteVehicleImage(id);
          fetchVehicleImages();
        } catch (error) {
          console.error('Failed to delete vehicle image:', error);
        }
      }
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewImage({ ...newImage, imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const [isLogMaintenanceOpen, setIsLogMaintenanceOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const handleGenerateReport = () => {
    const reportData = `
VEHICLE STATUS REPORT
---------------------
Vehicle: ${vehicle.name}
License Plate: ${vehicle.licensePlate}
Model Year: ${vehicle.modelYear}
Engine CC: ${vehicle.engineCc}
Ownership: ${vehicle.ownership}

REGISTRATION & COMPLIANCE
-------------------------
Insurance Expiry: ${vehicle.insuranceExpiry}
Revenue License Region: ${vehicle.revenueLicenseRegion}
Revenue License Expiry: ${vehicle.revenueLicenseExpiry}

MAINTENANCE STATUS
------------------
Current Odometer: ${vehicle.currentOdometer?.toLocaleString() || 0} km
Next Service Due: ${vehicle.nextServiceOdometer?.toLocaleString() || 0} km
Last Updated: ${vehicle.lastUpdated}

Generated on: ${new Date().toLocaleString()}
    `;
    const blob = new Blob([reportData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${vehicle.licensePlate.replace(/\s+/g, '_')}_Report.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSaveMaintenance = async (record: any) => {
    try {
      await apiService.addServiceRecord(record);
      // We might want to refresh vehicle data here, but for now we'll just close
      setIsLogMaintenanceOpen(false);
    } catch (error) {
      console.error('Failed to save maintenance record:', error);
    }
  };

  const [syncedEvents, setSyncedEvents] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('synced_calendar_events');
    return new Set(saved ? JSON.parse(saved) : []);
  });

  const markEventAsSynced = (eventId: string) => {
    const newSynced = new Set(syncedEvents);
    newSynced.add(eventId);
    setSyncedEvents(newSynced);
    localStorage.setItem('synced_calendar_events', JSON.stringify(Array.from(newSynced)));
  };

  const createGoogleCalendarLink = (title: string, dateStr: string, description: string, eventId: string) => {
    if (!dateStr) return '#';
    
    // Parse date and subtract 3 days for the reminder
    const date = new Date(dateStr);
    date.setDate(date.getDate() - 3);
    date.setHours(9, 0, 0);
    
    const formatDate = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, '');
    
    const start = formatDate(date);
    const end = formatDate(new Date(date.getTime() + 60 * 60 * 1000)); // 1 hour duration
    
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `REMINDER: ${title}`,
      dates: `${start}/${end}`,
      details: `${description}\n\nActual Due Date: ${dateStr}`,
      location: vehicle.licensePlate,
    });
    
    return `https://www.google.com/calendar/render?${params.toString()}`;
  };

  return (
    <div className="pb-12">
      {/* Back Button & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-primary font-bold hover:translate-x-[-4px] transition-transform"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Fleet</span>
        </button>

        <div className="flex flex-wrap gap-2">
          <button 
            onClick={onEdit}
            className="bg-primary/10 text-primary px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-colors flex items-center gap-2"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Update Record
          </button>
          <button 
            onClick={() => setIsLogMaintenanceOpen(true)}
            className="bg-primary/10 text-primary px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-colors flex items-center gap-2"
          >
            <HistoryIcon className="w-3.5 h-3.5" />
            Log Maintenance
          </button>
          <button 
            onClick={onViewHistory}
            className="bg-primary/10 text-primary px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-colors flex items-center gap-2"
          >
            <HistoryIcon className="w-3.5 h-3.5" />
            Maintenance History
          </button>
          <button 
            onClick={handleGenerateReport}
            className="bg-surface-container-highest text-on-surface px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-outline-variant/20 transition-colors flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            Generate Report
          </button>
          <button 
            onClick={onEdit}
            className="bg-surface-container-highest text-on-surface px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-outline-variant/20 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Update Expiry
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative w-full aspect-[16/9] md:aspect-[21/9] rounded-3xl overflow-hidden mb-8 shadow-2xl group">
        <img 
          alt={vehicle.name} 
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
          src={vehicle.imageUrl}
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-on-surface/90 via-on-surface/20 to-transparent"></div>
        <div className="absolute bottom-8 left-8 right-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center px-4 py-1.5 bg-primary text-white text-[10px] font-black rounded-full mb-3 tracking-widest uppercase shadow-lg">
              {vehicle.status}
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter">{vehicle.name}</h1>
            <p className="text-white/80 font-bold flex items-center gap-2 mt-2 text-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {vehicle.licensePlate}
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onEdit}
              className="bg-white/10 backdrop-blur-xl hover:bg-white/20 text-white px-6 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 border border-white/20 shadow-xl"
            >
              <Edit3 className="w-4 h-4" />
              Edit Details
            </button>
            <button 
              onClick={() => {
                setConfirmModal({
                  isOpen: true,
                  title: 'Delete Vehicle?',
                  message: 'Are you sure you want to remove this vehicle from your fleet? This action cannot be undone and all associated records will be lost.',
                  onConfirm: () => onDelete(vehicle.id)
                });
              }}
              className="bg-error/10 backdrop-blur-xl hover:bg-error/20 text-error-container px-6 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 border border-error/20 shadow-xl"
            >
              <Trash2 className="w-4 h-4" />
              Delete Vehicle
            </button>
          </div>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Registration Details */}
        <div className="md:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-outline-variant/20 flex flex-col justify-between group hover:shadow-xl transition-all">
          <div>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
                  <FileText className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-black tracking-tight">Registration Details</h2>
              </div>
              <span className="text-emerald-600 flex items-center gap-2 text-xs font-black tracking-widest">
                <CheckCircle2 className="w-5 h-5 fill-current" />
                VERIFIED
              </span>
            </div>
            <div className="grid grid-cols-2 gap-8 mb-8">
              {[
                { label: 'Model Year', value: vehicle.modelYear },
                { label: 'Engine CC', value: vehicle.engineCc },
                { label: 'Ownership', value: vehicle.ownership },
              ].map((item) => (
                <div key={item.label} className="space-y-1.5">
                  <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-60">{item.label}</span>
                  <p className="font-bold text-on-surface text-lg">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-6 border-t border-outline-variant/10 flex justify-between items-center">
            <div>
              <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block opacity-60">Last Updated</span>
              <p className="text-sm font-bold text-on-surface-variant">{vehicle.lastUpdated}</p>
            </div>
            <button 
              onClick={onEdit}
              className="bg-primary/10 text-primary px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary/20 transition-colors"
            >
              Update Record
            </button>
          </div>
        </div>

        {/* Overall Status */}
        <div className="bg-primary p-8 rounded-3xl shadow-2xl text-white flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-6">Overall Status</h3>
            <div className="space-y-5">
              {[
                { label: 'Insurance Valid', color: 'bg-emerald-400' },
                { label: 'Revenue License (Expiring Soon)', color: 'bg-amber-400' },
                { label: 'Documents Verified', color: 'bg-emerald-400' },
              ].map((status) => (
                <div key={status.label} className="flex items-center gap-4">
                  <div className={cn("w-2.5 h-2.5 rounded-full shadow-lg", status.color)} />
                  <span className="text-sm font-bold tracking-tight">{status.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-10 relative z-10">
            <button 
              onClick={handleGenerateReport}
              className="w-full bg-white text-primary py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Generate Report
            </button>
          </div>
          <Car className="absolute -right-12 -bottom-12 w-48 h-48 text-white/5 rotate-[-15deg]" />
        </div>

        {/* Insurance */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-outline-variant/20 flex flex-col justify-between">
          <div className="flex items-start justify-between mb-6">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <span className="text-[9px] font-black px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg tracking-widest">VALID</span>
          </div>
          <div>
            <h3 className="text-xl font-black tracking-tight mb-1">Insurance</h3>
            <div className="bg-surface-container-low p-4 rounded-2xl mb-6 relative group/cal">
              <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest block mb-1 opacity-60">Expires On</span>
              <p className="text-xl font-black text-on-surface">{vehicle.insuranceExpiry}</p>
              <a 
                href={createGoogleCalendarLink(
                  `Insurance Renewal: ${vehicle.name} (${vehicle.licensePlate})`,
                  vehicle.insuranceExpiry,
                  `Vehicle: ${vehicle.name}\nLicense Plate: ${vehicle.licensePlate}\n\nThis insurance policy is due to expire in 3 days. Please arrange for renewal to avoid any coverage gaps.`,
                  `${vehicle.id}_insurance`
                )}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => markEventAsSynced(`${vehicle.id}_insurance`)}
                className={cn(
                  "absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all",
                  syncedEvents.has(`${vehicle.id}_insurance`) 
                    ? "bg-emerald-500/10 text-emerald-600 opacity-100" 
                    : "bg-primary/10 text-primary opacity-0 group-hover/cal:opacity-100 hover:bg-primary hover:text-white"
                )}
                title={syncedEvents.has(`${vehicle.id}_insurance`) ? "Added to Calendar" : "Add to Google Calendar"}
              >
                {syncedEvents.has(`${vehicle.id}_insurance`) ? <CheckCircle2 className="w-4 h-4" /> : <CalendarPlus className="w-4 h-4" />}
              </a>
            </div>
          </div>
          <button 
            onClick={onEdit}
            className="w-full py-3.5 border-2 border-primary/10 text-primary rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Update Expiry
          </button>
        </div>

        {/* Revenue License */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-outline-variant/20 flex flex-col justify-between border-l-4 border-l-amber-500">
          <div className="flex items-start justify-between mb-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
              <FileText className="w-7 h-7" />
            </div>
            <span className="text-[9px] font-black px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg tracking-widest">DUE SOON</span>
          </div>
          <div>
            <h3 className="text-xl font-black tracking-tight mb-1">Revenue License</h3>
            <p className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest mb-6">Region: {vehicle.revenueLicenseRegion}</p>
            <div className="bg-amber-50 p-4 rounded-2xl mb-6 relative group/cal">
              <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest block mb-1 opacity-80">Expires On</span>
              <p className="text-xl font-black text-on-surface">{vehicle.revenueLicenseExpiry}</p>
              <a 
                href={createGoogleCalendarLink(
                  `Revenue License Renewal: ${vehicle.name} (${vehicle.licensePlate})`,
                  vehicle.revenueLicenseExpiry,
                  `Vehicle: ${vehicle.name}\nLicense Plate: ${vehicle.licensePlate}\nRegion: ${vehicle.revenueLicenseRegion}\n\nYour revenue license is due to expire in 3 days. Please ensure you have the necessary documents ready for renewal.`,
                  `${vehicle.id}_license`
                )}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => markEventAsSynced(`${vehicle.id}_license`)}
                className={cn(
                  "absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all",
                  syncedEvents.has(`${vehicle.id}_license`) 
                    ? "bg-emerald-500/10 text-emerald-600 opacity-100" 
                    : "bg-amber-500/10 text-amber-600 opacity-0 group-hover/cal:opacity-100 hover:bg-amber-500 hover:text-white"
                )}
                title={syncedEvents.has(`${vehicle.id}_license`) ? "Added to Calendar" : "Add to Google Calendar"}
              >
                {syncedEvents.has(`${vehicle.id}_license`) ? <CheckCircle2 className="w-4 h-4" /> : <CalendarPlus className="w-4 h-4" />}
              </a>
            </div>
          </div>
          <button 
            onClick={onEdit}
            className="w-full py-4 bg-amber-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-amber-600 shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Renew Now
          </button>
        </div>

        {/* Maintenance Stats */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-outline-variant/20 flex flex-col justify-between">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-surface-container-low flex items-center justify-center text-on-surface-variant">
              <Gauge className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-widest opacity-60">Last Mileage</h3>
              <p className="text-2xl font-black text-primary">{(vehicle.currentOdometer || 0).toLocaleString()} km</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-on-surface-variant uppercase tracking-widest opacity-60">Next Service</span>
              <span className="text-on-surface">{(vehicle.nextServiceOdometer || 0).toLocaleString()} km</span>
            </div>
            <div className="w-full bg-surface-container-low h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-primary h-full transition-all duration-1000" 
                style={{ width: `${(vehicle.currentOdometer / vehicle.nextServiceOdometer) * 100}%` }}
              />
            </div>
          </div>
          <button 
            onClick={onViewHistory}
            className="mt-6 w-full py-3 text-on-surface-variant text-xs font-black uppercase tracking-widest hover:text-primary transition-colors flex items-center justify-center gap-2"
          >
            <HistoryIcon className="w-4 h-4" />
            View Service History
          </button>
        </div>
      </div>

      {/* Upcoming Services Section */}
      <div id="upcoming-services-section" className="mt-10 bg-white p-8 rounded-[2.5rem] border border-outline-variant/20 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">Upcoming Services</h2>
              <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-60">Planned Maintenance Tasks</p>
            </div>
          </div>
          <button 
            onClick={() => {
              if (isAddingService && !editingServiceId) {
                setIsAddingService(false);
              } else {
                setIsAddingService(true);
                setEditingServiceId(null);
                setNewService({
                  title: '',
                  description: '',
                  dueDate: '',
                  dueOdometer: 0,
                  priority: 'Medium'
                });
              }
            }}
            className="bg-primary text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            {isAddingService && !editingServiceId ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isAddingService && !editingServiceId ? 'Cancel' : 'Add Task'}
          </button>
        </div>

        <AnimatePresence>
          {isAddingService && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-8"
            >
              <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/20 space-y-4">
                <h4 className="text-lg font-black tracking-tight mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-primary" />
                  {editingServiceId ? 'Edit Task' : 'Create New Task'}
                </h4>
                <form onSubmit={handleAddService} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input 
                    required
                    placeholder="Task Title (e.g. Brake Pad Replacement)"
                    value={newService.title ?? ''}
                    onChange={e => setNewService({...newService, title: e.target.value})}
                    className="bg-white border-none rounded-xl py-3 px-4 font-bold text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  <select 
                    value={newService.priority ?? 'Medium'}
                    onChange={e => setNewService({...newService, priority: e.target.value as any})}
                    className="bg-white border-none rounded-xl py-3 px-4 font-bold text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                  >
                    <option value="Low">Low Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="High">High Priority</option>
                  </select>
                </div>
                <textarea 
                  placeholder="Task Description"
                  value={newService.description ?? ''}
                  onChange={e => setNewService({...newService, description: e.target.value})}
                  className="w-full bg-white border-none rounded-xl py-3 px-4 font-bold text-sm focus:ring-2 focus:ring-primary/20 transition-all h-24 resize-none"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-outline-variant" />
                    <input 
                      type="date"
                      value={newService.dueDate ?? ''}
                      onChange={e => setNewService({...newService, dueDate: e.target.value})}
                      className="w-full bg-white border-none rounded-xl py-3 pl-12 pr-4 font-bold text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div className="relative">
                    <Gauge className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-outline-variant" />
                    <input 
                      type="number"
                      placeholder="Due Odometer (KM)"
                      value={newService.dueOdometer ?? ''}
                      onChange={e => setNewService({...newService, dueOdometer: parseInt(e.target.value)})}
                      className="w-full bg-white border-none rounded-xl py-3 pl-12 pr-4 font-bold text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    type="submit"
                    className="flex-1 bg-primary text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/90 transition-all"
                  >
                    {editingServiceId ? 'Update Task' : 'Save Task'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setIsAddingService(false);
                      setEditingServiceId(null);
                    }}
                    className="flex-1 bg-white border border-outline-variant text-on-surface py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-surface-container-highest transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          {isLoadingServices ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : upcomingServices.length === 0 ? (
            <div className="text-center py-12 bg-surface-container-low rounded-3xl border border-dashed border-outline-variant/30">
              <Clock className="w-12 h-12 text-outline-variant mx-auto mb-4 opacity-20" />
              <p className="text-on-surface-variant font-bold">No upcoming services planned.</p>
            </div>
          ) : (
            upcomingServices.map((service) => (
              <div key={service.id} className="group bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10 hover:border-primary/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start gap-5">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                    service.priority === 'High' ? "bg-error/10 text-error" : 
                    service.priority === 'Medium' ? "bg-amber-500/10 text-amber-600" : 
                    "bg-primary/10 text-primary"
                  )}>
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-black text-on-surface tracking-tight">{service.title}</h4>
                      <span className={cn(
                        "text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                        service.priority === 'High' ? "bg-error text-white" : 
                        service.priority === 'Medium' ? "bg-amber-500 text-white" : 
                        "bg-primary text-white"
                      )}>
                        {service.priority}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant font-medium line-clamp-1">{service.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="flex gap-6">
                    {service.dueDate && (
                      <div className="text-right relative group/cal">
                        <span className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest block opacity-60">Due Date</span>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-black text-on-surface">{service.dueDate}</p>
                          <a 
                            href={createGoogleCalendarLink(
                              `Service: ${service.title} - ${vehicle.name}`,
                              service.dueDate,
                              `Vehicle: ${vehicle.name}\nLicense Plate: ${vehicle.licensePlate}\nService Task: ${service.title}\nDescription: ${service.description}\nDue Odometer: ${service.dueOdometer} km\n\nThis maintenance task is scheduled for 3 days from now.`,
                              service.id
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => markEventAsSynced(service.id)}
                            className={cn(
                              "p-1 rounded-md transition-colors",
                              syncedEvents.has(service.id) 
                                ? "text-emerald-600 bg-emerald-50" 
                                : "text-primary hover:bg-primary/10"
                            )}
                            title={syncedEvents.has(service.id) ? "Added to Calendar" : "Add to Google Calendar"}
                          >
                            {syncedEvents.has(service.id) ? <CheckCircle2 className="w-3 h-3" /> : <CalendarPlus className="w-3 h-3" />}
                          </a>
                        </div>
                      </div>
                    )}
                    {service.dueOdometer > 0 && (
                      <div className="text-right">
                        <span className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest block opacity-60">Due Odometer</span>
                        <p className="text-xs font-black text-on-surface">{service.dueOdometer.toLocaleString()} KM</p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleEditService(service)}
                      className="w-10 h-10 rounded-xl bg-white border border-outline-variant/20 flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary/20 transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteService(service.id)}
                      className="w-10 h-10 rounded-xl bg-white border border-outline-variant/20 flex items-center justify-center text-on-surface-variant hover:text-error hover:border-error/20 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Documents & Images Section */}
      <div id="documents-section" className="mt-10 bg-white p-8 rounded-[2.5rem] border border-outline-variant/20 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <ImageIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">Documents & Images</h2>
              <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-60">Service Books, Licenses & Records</p>
            </div>
          </div>
          <button 
            onClick={() => {
              if (isAddingImage && !editingImageId) {
                setIsAddingImage(false);
              } else {
                setIsAddingImage(true);
                setEditingImageId(null);
                setNewImage({ topic: '', description: '', imageUrl: '' });
              }
            }}
            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
          >
            {isAddingImage && !editingImageId ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isAddingImage && !editingImageId ? 'Cancel' : 'Add Image'}
          </button>
        </div>

        <AnimatePresence>
          {isAddingImage && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-8"
            >
              <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/20 space-y-4">
                <h4 className="text-lg font-black tracking-tight mb-4 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-indigo-600" />
                  {editingImageId ? 'Edit Image' : 'Upload New Image'}
                </h4>
                <form onSubmit={handleAddImage} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <input 
                      required
                      placeholder="Topic (e.g. Service Book Page 1)"
                      value={newImage.topic ?? ''}
                      onChange={e => setNewImage({...newImage, topic: e.target.value})}
                      className="w-full bg-white border-none rounded-xl py-3 px-4 font-bold text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                    <textarea 
                      placeholder="Description"
                      value={newImage.description ?? ''}
                      onChange={e => setNewImage({...newImage, description: e.target.value})}
                      className="w-full bg-white border-none rounded-xl py-3 px-4 font-bold text-sm focus:ring-2 focus:ring-primary/20 transition-all h-24 resize-none"
                    />
                  </div>
                  <div className="space-y-4">
                    <div className="relative aspect-video bg-white rounded-2xl border-2 border-dashed border-outline-variant/30 flex flex-col items-center justify-center overflow-hidden group">
                      {newImage.imageUrl ? (
                        <>
                          <img src={newImage.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                          <button 
                            type="button"
                            onClick={() => setNewImage({...newImage, imageUrl: ''})}
                            className="absolute top-2 right-2 w-8 h-8 bg-on-surface/80 text-white rounded-full flex items-center justify-center hover:bg-on-surface transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <Camera className="w-8 h-8 text-outline-variant mb-2 opacity-40" />
                          <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-60">Click to upload image</p>
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    type="submit"
                    disabled={!newImage.imageUrl}
                    className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingImageId ? 'Update Image' : 'Save Image'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setIsAddingImage(false);
                      setEditingImageId(null);
                    }}
                    className="flex-1 bg-white border border-outline-variant text-on-surface py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-surface-container-highest transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoadingImages ? (
            <div className="col-span-full flex justify-center py-8">
              <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin" />
            </div>
          ) : vehicleImages.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-surface-container-low rounded-3xl border border-dashed border-outline-variant/30">
              <ImageIcon className="w-12 h-12 text-outline-variant mx-auto mb-4 opacity-20" />
              <p className="text-on-surface-variant font-bold">No documents or images uploaded yet.</p>
            </div>
          ) : (
            vehicleImages.map((img) => (
              <div key={img.id} className="group bg-surface-container-low rounded-3xl border border-outline-variant/10 overflow-hidden hover:shadow-xl transition-all">
                <div className="relative aspect-[4/3] overflow-hidden cursor-pointer" onClick={() => setSelectedImageForView(img)}>
                  <img 
                    src={img.imageUrl} 
                    alt={img.topic} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-on-surface/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4 gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditImage(img);
                      }}
                      className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md text-white hover:bg-primary transition-all flex items-center justify-center"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteImage(img.id);
                      }}
                      className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md text-white hover:bg-error transition-all flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="p-5">
                  <h4 className="font-black text-on-surface tracking-tight mb-1">{img.topic}</h4>
                  <p className="text-xs text-on-surface-variant font-medium line-clamp-2">{img.description}</p>
                  <div className="mt-4 pt-4 border-t border-outline-variant/10 flex justify-between items-center">
                    <span className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest opacity-60">
                      {new Date(img.createdAt).toLocaleDateString()}
                    </span>
                    <a 
                      href={img.imageUrl} 
                      download={`${img.topic}.png`}
                      className="text-indigo-600 hover:text-indigo-700 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Renewal Callout */}
      <div className="mt-10 bg-surface-container-low p-8 rounded-[2.5rem] border-2 border-dashed border-outline-variant/30">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center text-primary">
              <FileUp className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-xl font-black tracking-tight">Just renewed a document?</h4>
              <p className="text-sm text-on-surface-variant font-medium mt-1">Update your expiry dates instantly to keep your status green.</p>
            </div>
          </div>
          <div className="flex gap-4 w-full lg:w-auto">
            <button 
              onClick={onViewHistory}
              className="flex-1 lg:flex-none px-8 py-4 bg-white border border-outline-variant/30 rounded-2xl text-xs font-black uppercase tracking-widest text-on-surface hover:bg-surface-container-low transition-all shadow-sm"
            >
              View History
            </button>
            <button 
              onClick={() => setIsLogMaintenanceOpen(true)}
              className="flex-1 lg:flex-none px-8 py-4 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-primary/30 hover:bg-primary-container transition-all"
            >
              Update After Renewal
            </button>
          </div>
        </div>
      </div>

      {/* Image Lightbox */}
      <AnimatePresence>
        {selectedImageForView && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-on-surface/95 backdrop-blur-sm"
            onClick={() => setSelectedImageForView(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-5xl w-full max-h-full flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setSelectedImageForView(null)}
                className="absolute -top-12 right-0 text-white hover:text-primary transition-colors flex items-center gap-2 font-bold uppercase tracking-widest text-xs"
              >
                <X className="w-6 h-6" />
                Close
              </button>
              
              <div className="w-full bg-white rounded-[2rem] overflow-hidden shadow-2xl">
                <div className="aspect-auto max-h-[70vh] overflow-auto bg-surface-container-lowest">
                  <img 
                    src={selectedImageForView.imageUrl} 
                    alt={selectedImageForView.topic} 
                    className="w-full h-auto object-contain mx-auto"
                  />
                </div>
                <div className="p-8 bg-white">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className="text-2xl font-black tracking-tight text-on-surface mb-2">{selectedImageForView.topic}</h3>
                      <p className="text-on-surface-variant font-medium">{selectedImageForView.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block opacity-60 mb-1">Uploaded On</span>
                      <p className="font-bold text-on-surface">{new Date(selectedImageForView.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="mt-8 flex gap-4">
                    <a 
                      href={selectedImageForView.imageUrl} 
                      download={`${selectedImageForView.topic}.png`}
                      className="flex-1 bg-primary text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                    >
                      <Download className="w-4 h-4" />
                      Download Image
                    </a>
                    <button 
                      onClick={() => {
                        handleDeleteImage(selectedImageForView.id);
                        setSelectedImageForView(null);
                      }}
                      className="px-8 py-4 bg-error/10 text-error rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-error hover:text-white transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <LogMaintenanceModal 
        isOpen={isLogMaintenanceOpen}
        onClose={() => setIsLogMaintenanceOpen(false)}
        onSave={handleSaveMaintenance}
        vehicleId={vehicle.id}
      />

      <ConfirmationModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
      />
    </div>
  );
}
