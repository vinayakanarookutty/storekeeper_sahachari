import { getToken } from './auth';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export interface ServiceData {
  name: string;
  description?: string;
  images?: string[];
  price: number;
  unit: 'HOUR' | 'DAY' | 'WEEK' | 'MONTH';
  isAvailable?: boolean;
}

export const servicesApi = {
  // Create a new Service Listing
  createService: async (data: ServiceData) => {
    const token = await getToken();
    const response = await fetch(`${API_BASE_URL}/services`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || 'Failed to create service');
    }
    return response.json();
  },

  // Get all services belonging to the logged-in storekeeper
  getMyServices: async () => {
    const token = await getToken();
    const response = await fetch(`${API_BASE_URL}/services/store/my-services`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch your services');
    return response.json();
  },

  // Delete a service item
  deleteService: async (id: string) => {
    const token = await getToken();
    const response = await fetch(`${API_BASE_URL}/services/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('Failed to delete service');
    return response.json();
  },

  async updateService(id: string, data: Partial<ServiceData>) {
    const token = await getToken();
    const response = await fetch(`${API_BASE_URL}/services/${id}`, {
      method: 'PUT', // Matches @Put(':id') in NestJS ServicesController
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update service');
    }
    return response.json();
  },
  
};