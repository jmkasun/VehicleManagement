import React, { useState } from 'react';
import { X, Camera, Car, Hash, Calendar, Shield, MapPin, Gauge } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Vehicle, VehicleStatus } from '../types';

interface VehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (vehicle: Partial<Vehicle>) => Promise<void>;
  vehicle?: Vehicle | null;
}

export function VehicleModal({ isOpen, onClose, onSave, vehicle }: VehicleModalProps) {
  const [formData, setFormData] = useState<Partial<Vehicle>>(vehicle || {
    name: '',
    licensePlate: '',
    status: 'Active',
    imageUrl: `https://picsum.photos/seed/${Math.random()}/800/600`,
    nextServiceDate: '',
    nextServiceOdometer: 0,
    currentOdometer: 0,
    chassisNo: '',
    insurancePolicyNo: '',
    insuranceExpiry: '',
    revenueLicenseExpiry: '',
    revenueLicenseRegion: 'Western',
  });

  React.useEffect(() => {
    if (vehicle) {
      setFormData(vehicle);
    } else {
      setFormData({
        name: '',
        licensePlate: '',
        status: 'Active',
        imageUrl: `https://picsum.photos/seed/${Math.random()}/800/600`,
        nextServiceDate: '',
        nextServiceOdometer: 0,
        currentOdometer: 0,
        chassisNo: '',
        insurancePolicyNo: '',
        insuranceExpiry: '',
        revenueLicenseExpiry: '',
        revenueLicenseRegion: 'Western',
      });
    }
  }, [vehicle, isOpen]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save vehicle:', error);
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
                  <Car className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-on-surface leading-none">
                    {vehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
                  </h2>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">
                    {vehicle ? 'Update vehicle details' : 'Register a new asset to your fleet'}
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full hover:bg-surface-container-highest flex items-center justify-center transition-colors"
              >
                <X className="w-6 h-6 text-on-surface-variant" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
              {/* Basic Info Section */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-4 bg-primary rounded-full" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-primary">Basic Information</h3>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">Vehicle Name</label>
                    <div className="relative">
                      <Car className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-outline-variant" />
                      <input 
                        required
                        type="text"
                        placeholder="e.g. Toyota Land Cruiser"
                        className="w-full pl-11 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">License Plate</label>
                    <div className="relative">
                      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-outline-variant" />
                      <input 
                        required
                        type="text"
                        placeholder="e.g. WP CAS-9022"
                        className="w-full pl-11 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-mono font-bold uppercase"
                        value={formData.licensePlate}
                        onChange={e => setFormData({ ...formData, licensePlate: e.target.value.toUpperCase() })}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">Initial Status</label>
                    <select 
                      className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium"
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value as VehicleStatus })}
                    >
                      <option value="Active">Active</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Storage">Storage</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">Next Service Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-outline-variant" />
                      <input 
                        type="date"
                        className="w-full pl-11 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium"
                        value={formData.nextServiceDate}
                        onChange={e => setFormData({ ...formData, nextServiceDate: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Technical Details Section */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-4 bg-primary rounded-full" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-primary">Technical & Compliance</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">Current Odometer (KM)</label>
                    <div className="relative">
                      <Gauge className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-outline-variant" />
                      <input 
                        type="number"
                        placeholder="e.g. 45000"
                        className="w-full pl-11 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium"
                        value={formData.currentOdometer}
                        onChange={e => setFormData({ ...formData, currentOdometer: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">Next Service Odometer (KM)</label>
                    <div className="relative">
                      <Gauge className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-outline-variant" />
                      <input 
                        type="number"
                        placeholder="e.g. 50000"
                        className="w-full pl-11 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium"
                        value={formData.nextServiceOdometer}
                        onChange={e => setFormData({ ...formData, nextServiceOdometer: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">Chassis Number</label>
                    <input 
                      type="text"
                      placeholder="Enter chassis number"
                      className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium"
                      value={formData.chassisNo}
                      onChange={e => setFormData({ ...formData, chassisNo: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">Insurance Policy #</label>
                    <div className="relative">
                      <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-outline-variant" />
                      <input 
                        type="text"
                        placeholder="Enter policy number"
                        className="w-full pl-11 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium"
                        value={formData.insurancePolicyNo}
                        onChange={e => setFormData({ ...formData, insurancePolicyNo: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">Insurance Expiry</label>
                    <input 
                      type="date"
                      className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium"
                      value={formData.insuranceExpiry}
                      onChange={e => setFormData({ ...formData, insuranceExpiry: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">Revenue License Expiry</label>
                    <input 
                      type="date"
                      className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium"
                      value={formData.revenueLicenseExpiry}
                      onChange={e => setFormData({ ...formData, revenueLicenseExpiry: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">Revenue License Region</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-outline-variant" />
                    <input 
                      type="text"
                      placeholder="e.g. Western"
                      className="w-full pl-11 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium"
                      value={formData.revenueLicenseRegion}
                      onChange={e => setFormData({ ...formData, revenueLicenseRegion: e.target.value })}
                    />
                  </div>
                </div>
              </section>

              {/* Image Preview */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-4 bg-primary rounded-full" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-primary">Vehicle Image</h3>
                </div>
                <div className="relative h-48 rounded-3xl overflow-hidden border-2 border-dashed border-outline-variant bg-surface-container-lowest flex items-center justify-center group">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileChange}
                  />
                  {formData.imageUrl ? (
                    <>
                      <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button 
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 py-2 bg-white rounded-full text-xs font-bold flex items-center gap-2"
                        >
                          <Camera className="w-4 h-4" />
                          Upload Image
                        </button>
                        <button 
                          type="button"
                          onClick={() => setFormData({ ...formData, imageUrl: `https://picsum.photos/seed/${Math.random()}/800/600` })}
                          className="px-4 py-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-full text-xs font-bold text-white flex items-center gap-2 hover:bg-white/30"
                        >
                          Random
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center">
                      <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-4 rounded-full bg-primary/10 text-primary mb-2 hover:bg-primary/20 transition-colors"
                      >
                        <Camera className="w-8 h-8" />
                      </button>
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Click to upload image</p>
                    </div>
                  )}
                </div>
              </section>
            </form>

            {/* Footer */}
            <div className="p-6 border-t border-outline-variant bg-surface-container-lowest flex gap-3">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 py-4 rounded-2xl border border-outline-variant text-sm font-black uppercase tracking-widest hover:bg-surface-container-low transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting || !formData.name || !formData.licensePlate}
                className="flex-[2] py-4 rounded-2xl bg-primary text-white text-sm font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Registering...
                  </>
                ) : (
                  vehicle ? 'Update Vehicle' : 'Register Vehicle'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
