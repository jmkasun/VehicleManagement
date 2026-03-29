export type VehicleStatus = 'Active' | 'Inactive';

export interface ServiceRecord {
  id: string;
  date: string;
  odometer: number;
  title: string;
  description: string;
  location?: string;
  invoiceNo?: string;
  isVerified?: boolean;
  type: 'Full Service' | 'Tire Rotation' | 'Oil Change' | 'Brake Overhaul' | 'Battery Replacement';
  cost?: number;
  parts?: { name: string; cost: number }[];
  laborCost?: number;
}

export interface VehicleImage {
  id: string;
  vehicleId: string;
  topic: string;
  description: string;
  imageUrl: string;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
  profileImageUrl?: string;
}

export interface Vehicle {
  id: string;
  name: string;
  licensePlate: string;
  status: VehicleStatus;
  imageUrl: string;
  nextServiceDate: string;
  nextServiceOdometer: number;
  currentOdometer: number;
  modelYear: string;
  engineCc: string;
  chassisNo: string;
  ownership: string;
  lastUpdated: string;
  insurancePolicyNo: string;
  insuranceExpiry: string;
  revenueLicenseRegion: string;
  revenueLicenseExpiry: string;
  images?: VehicleImage[];
}

export interface Alert {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  type: 'Expired' | 'Warning';
  message: string;
  daysLeft?: number;
  imageUrl: string;
}

export interface SystemUpdate {
  id: string;
  message: string;
  isNew: boolean;
}

export interface UpcomingService {
  id: string;
  vehicleId: string;
  title: string;
  description: string;
  dueDate: string;
  dueOdometer: number;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Pending' | 'Completed';
}
