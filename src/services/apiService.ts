import { Vehicle, ServiceRecord, UpcomingService, VehicleImage, User } from '../types';

export const apiService = {
  // ... existing methods ...
  async getVehicleImages(vehicleId: string): Promise<VehicleImage[]> {
    const response = await fetch(`/api/vehicles/${vehicleId}/images`);
    if (!response.ok) throw new Error('Failed to fetch vehicle images');
    return response.json();
  },

  async addVehicleImage(vehicleId: string, image: Partial<VehicleImage>): Promise<VehicleImage> {
    const response = await fetch(`/api/vehicles/${vehicleId}/images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(image),
    });
    if (!response.ok) throw new Error('Failed to add vehicle image');
    return response.json();
  },

  async deleteVehicleImage(id: string): Promise<void> {
    const response = await fetch(`/api/vehicle-images/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete vehicle image');
  },
  async getVehicles(): Promise<Vehicle[]> {
    const response = await fetch('/api/vehicles');
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || 'Failed to fetch vehicles');
    }
    return response.json();
  },

  async getServiceHistory(vehicleId: string): Promise<ServiceRecord[]> {
    const response = await fetch(`/api/service-history/${vehicleId}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || 'Failed to fetch service history');
    }
    return response.json();
  },

  async addVehicle(vehicle: Partial<Vehicle>): Promise<Vehicle | null> {
    const response = await fetch('/api/vehicles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vehicle),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || 'Failed to add vehicle');
    }
    return response.json();
  },

  async updateVehicle(id: string, vehicle: Partial<Vehicle>): Promise<Vehicle | null> {
    const response = await fetch(`/api/vehicles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vehicle),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || 'Failed to update vehicle');
    }
    return response.json();
  },

  async addServiceRecord(record: Partial<ServiceRecord>): Promise<ServiceRecord | null> {
    const response = await fetch('/api/service-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || 'Failed to add service record');
    }
    return response.json();
  },

  async getSystemUpdates(): Promise<any[]> {
    const response = await fetch('/api/system-updates');
    if (!response.ok) throw new Error('Failed to fetch system updates');
    return response.json();
  },

  async addSystemUpdate(message: string): Promise<any> {
    const response = await fetch('/api/system-updates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    if (!response.ok) throw new Error('Failed to add system update');
    return response.json();
  },

  async getUpcomingServices(vehicleId: string): Promise<UpcomingService[]> {
    const response = await fetch(`/api/upcoming-services/${vehicleId}`);
    if (!response.ok) throw new Error('Failed to fetch upcoming services');
    return response.json();
  },

  async getAllUpcomingServices(): Promise<(UpcomingService & { vehicleName: string; licensePlate: string; vehicleImageUrl: string })[]> {
    const response = await fetch('/api/upcoming-services');
    if (!response.ok) throw new Error('Failed to fetch all upcoming services');
    return response.json();
  },

  async addUpcomingService(service: Partial<UpcomingService>): Promise<UpcomingService> {
    const response = await fetch('/api/upcoming-services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(service),
    });
    if (!response.ok) throw new Error('Failed to add upcoming service');
    return response.json();
  },

  async deleteUpcomingService(id: string): Promise<void> {
    const response = await fetch(`/api/upcoming-services/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete upcoming service');
  },

  async login(credentials: any): Promise<User> {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }
    return response.json();
  },

  async getUsers(): Promise<User[]> {
    const response = await fetch('/api/users');
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  },

  async addUser(user: Partial<User> & { password?: string }): Promise<User> {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add user');
    }
    return response.json();
  },

  async updateUser(id: string, user: Partial<User> & { password?: string }): Promise<User> {
    const response = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    if (!response.ok) throw new Error('Failed to update user');
    return response.json();
  },

  async deleteUser(id: string): Promise<void> {
    const response = await fetch(`/api/users/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete user');
  }
};
