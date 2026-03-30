import React, { useState, useEffect } from 'react';
import { TopAppBar, BottomNavBar } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { VehicleList } from './components/VehicleList';
import { VehicleDetails } from './components/VehicleDetails';
import { ServiceHistory } from './components/ServiceHistory';
import { VehicleModal } from './components/VehicleModal';
import { UserManagement } from './components/UserManagement';
import { UserProfile } from './components/UserProfile';
import LoginPage from './components/LoginPage';
import { Vehicle, SystemUpdate, Alert, UpcomingService, User } from './types';
import { AnimatePresence, motion } from 'motion/react';
import { apiService } from './services/apiService';
import { cn } from './lib/utils';

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [systemUpdates, setSystemUpdates] = useState<SystemUpdate[]>([]);
  const [upcomingServices, setUpcomingServices] = useState<(UpcomingService & { vehicleName: string; licensePlate: string; vehicleImageUrl: string })[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [scrollToSection, setScrollToSection] = useState<string | undefined>(undefined);
  const [initialHistoryVehicleId, setInitialHistoryVehicleId] = useState<string | undefined>(undefined);

  const fetchVehicles = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiService.getVehicles();
      setVehicles(data);
      calculateAlerts(data);
    } catch (err: any) {
      console.error('Error fetching vehicles:', err);
      setError(err.message || 'Failed to connect to the database. Please check your configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSystemUpdates = async () => {
    try {
      const data = await apiService.getSystemUpdates();
      setSystemUpdates(data);
    } catch (err: any) {
      console.error('Error fetching system updates:', err);
    }
  };

  const fetchUpcomingServices = async () => {
    try {
      const data = await apiService.getAllUpcomingServices();
      setUpcomingServices(data);
    } catch (err: any) {
      console.error('Error fetching upcoming services:', err);
    }
  };

  const calculateAlerts = (vehicleList: Vehicle[]) => {
    const newAlerts: Alert[] = [];
    const today = new Date();

    vehicleList.forEach(v => {
      // Insurance Expiry
      if (v.insuranceExpiry) {
        const expiry = new Date(v.insuranceExpiry);
        const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) {
          newAlerts.push({
            id: `ins-${v.id}`,
            vehicleId: v.id,
            vehiclePlate: v.licensePlate,
            type: diffDays <= 0 ? 'Expired' : 'Warning',
            message: `Insurance ${diffDays <= 0 ? 'expired' : `expires in ${diffDays} days`}`,
            daysLeft: diffDays > 0 ? diffDays : undefined,
            imageUrl: v.imageUrl
          });
        }
      }

      // Revenue License Expiry
      if (v.revenueLicenseExpiry) {
        const expiry = new Date(v.revenueLicenseExpiry);
        const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) {
          newAlerts.push({
            id: `rev-${v.id}`,
            vehicleId: v.id,
            vehiclePlate: v.licensePlate,
            type: diffDays <= 0 ? 'Expired' : 'Warning',
            message: `Revenue License ${diffDays <= 0 ? 'expired' : `expires in ${diffDays} days`}`,
            daysLeft: diffDays > 0 ? diffDays : undefined,
            imageUrl: v.imageUrl
          });
        }
      }

      // Service Date
      if (v.nextServiceDate) {
        const serviceDate = new Date(v.nextServiceDate);
        const diffDays = Math.ceil((serviceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 7) {
          newAlerts.push({
            id: `srv-date-${v.id}`,
            vehicleId: v.id,
            vehiclePlate: v.licensePlate,
            type: diffDays <= 0 ? 'Expired' : 'Warning',
            message: `Service ${diffDays <= 0 ? 'overdue' : `due in ${diffDays} days`}`,
            daysLeft: diffDays > 0 ? diffDays : undefined,
            imageUrl: v.imageUrl
          });
        }
      }

      // Service Odometer
      if (v.nextServiceOdometer && v.currentOdometer) {
        const diffKm = v.nextServiceOdometer - v.currentOdometer;
        if (diffKm <= 500) {
          newAlerts.push({
            id: `srv-odo-${v.id}`,
            vehicleId: v.id,
            vehiclePlate: v.licensePlate,
            type: diffKm <= 0 ? 'Expired' : 'Warning',
            message: `Service ${diffKm <= 0 ? 'overdue' : `due in ${diffKm} km`}`,
            imageUrl: v.imageUrl
          });
        }
      }
    });

    setAlerts(newAlerts);
  };

  useEffect(() => {
    if (user) {
      fetchVehicles();
      fetchSystemUpdates();
      fetchUpcomingServices();
    }
  }, [user]);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    setSelectedVehicle(null);
    setCurrentPage('dashboard');
  };

  const handleSaveVehicle = async (vehicle: Partial<Vehicle>) => {
    try {
      if (editingVehicle) {
        await apiService.updateVehicle(editingVehicle.id, vehicle);
      } else {
        await apiService.addVehicle(vehicle);
      }
      await fetchVehicles();
      if (selectedVehicle && editingVehicle) {
        // Update selected vehicle if it was the one being edited
        const updated = await apiService.getVehicles();
        const found = updated.find(v => v.id === editingVehicle.id);
        if (found) setSelectedVehicle(found);
      }
    } catch (err: any) {
      console.error('Error saving vehicle:', err);
      alert(`Failed to save vehicle: ${err.message}`);
      throw err;
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    try {
      await apiService.deleteVehicle(id);
      await fetchVehicles();
    } catch (err: any) {
      console.error('Error deleting vehicle:', err);
      alert(`Failed to delete vehicle: ${err.message}`);
    }
  };

  const handleAddSystemUpdate = async (message: string) => {
    try {
      await apiService.addSystemUpdate(message);
      await fetchSystemUpdates();
    } catch (err: any) {
      console.error('Error adding system update:', err);
      alert('Failed to add system update');
    }
  };

  const handleSelectVehicle = (id: string, section?: string) => {
    const vehicle = vehicles.find(v => v.id === id);
    if (vehicle) {
      setScrollToSection(section);
      setSelectedVehicle(vehicle);
    }
  };

  const renderPage = () => {
    if (!user) {
      return <LoginPage onLogin={handleLogin} />;
    }

    if (selectedVehicle) {
      return (
        <VehicleDetails 
          vehicle={selectedVehicle} 
          onBack={() => {
            setSelectedVehicle(null);
            setScrollToSection(undefined);
          }} 
          onEdit={() => {
            setEditingVehicle(selectedVehicle);
            setIsModalOpen(true);
          }}
          onDelete={(id) => {
            handleDeleteVehicle(id);
            setSelectedVehicle(null);
          }}
          onViewHistory={() => {
            setInitialHistoryVehicleId(selectedVehicle.id);
            setSelectedVehicle(null);
            setCurrentPage('history');
          }}
          scrollToSection={scrollToSection}
        />
      );
    }

    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="text-muted-foreground animate-pulse">Connecting to database...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] p-6 text-center space-y-6">
          <div className="bg-destructive/10 p-4 rounded-full">
            <svg className="w-12 h-12 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">Database Error</h2>
            <p className="text-muted-foreground max-w-md mx-auto">{error}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      );
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard 
          vehicles={vehicles} 
          alerts={alerts}
          systemUpdates={systemUpdates}
          upcomingServices={upcomingServices}
          onAddVehicle={() => {
            setEditingVehicle(null);
            setIsModalOpen(true);
          }} 
          onAddSystemUpdate={handleAddSystemUpdate}
          onSelectVehicle={handleSelectVehicle}
        />;
      case 'vehicles':
        return <VehicleList 
          vehicles={vehicles} 
          onSelectVehicle={setSelectedVehicle} 
          onAddVehicle={() => {
            setEditingVehicle(null);
            setIsModalOpen(true);
          }} 
        />;
      case 'history':
        return <ServiceHistory 
          vehicles={vehicles} 
          onServiceAdded={fetchVehicles} 
          initialVehicleId={initialHistoryVehicleId}
        />;
      case 'users':
        return <UserManagement />;
      case 'profile':
        return <UserProfile user={user} onUpdate={handleLogin} />;
      default:
        return <Dashboard 
          vehicles={vehicles} 
          alerts={alerts}
          systemUpdates={systemUpdates}
          upcomingServices={upcomingServices}
          onAddVehicle={() => {
            setEditingVehicle(null);
            setIsModalOpen(true);
          }} 
          onAddSystemUpdate={handleAddSystemUpdate}
          onSelectVehicle={handleSelectVehicle}
        />;
    }
  };

  return (
    <div className="min-h-screen bg-surface selection:bg-primary/20">
      {user && <TopAppBar onLogout={handleLogout} user={user} onProfileClick={() => setCurrentPage('profile')} />}
      
      <main className={cn(
        "max-w-5xl mx-auto min-h-screen",
        user ? "pt-24 px-6 pb-24" : ""
      )}>
        <AnimatePresence mode="wait">
          <motion.div 
            key={!user ? 'login' : (selectedVehicle ? `details-${selectedVehicle.id}` : currentPage)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>

      {user && (
        <>
          <VehicleModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            onSave={handleSaveVehicle}
            vehicle={editingVehicle}
          />

          <BottomNavBar 
            currentPage={currentPage} 
            userRole={user.role}
            onPageChange={(page) => {
              setSelectedVehicle(null);
              setScrollToSection(undefined);
              setInitialHistoryVehicleId(undefined);
              setCurrentPage(page);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }} 
          />
        </>
      )}
    </div>
  );
}
