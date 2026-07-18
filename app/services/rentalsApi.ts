import { getToken } from './auth';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export interface RentalOffer {
  type: 'PERCENTAGE' | 'FLAT';
  value: number;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
}

export interface RentalData {
  name: string;
  description?: string;
  images?: string[];
  quantity: number;
  rentalPrice: number;
  unit: 'HOUR' | 'DAY' | 'WEEK' | 'MONTH';

  offers?: RentalOffer[]; // add this
}

export const rentalsApi = {
  // Create a new Rental Listing
  createRental: async (data: RentalData) => {
    const token = await getToken();
    const response = await fetch(`${API_BASE_URL}/rentals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || 'Failed to create rental listing');
    }
    return response.json();
  },

  // Get all rentals for the currently logged-in storekeeper
  getMyRentals: async () => {
    const token = await getToken();
    const response = await fetch(`${API_BASE_URL}/rentals/store/my-rentals`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch your rentals');
    return response.json();
  },

  // Delete a rental item
  deleteRental: async (id: string) => {
    const token = await getToken();
    const response = await fetch(`${API_BASE_URL}/rentals/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('Failed to delete rental item');
    return response.json();
  },

  async updateRental(id: string, data: Partial<RentalData>) {
    const token = await getToken();
    const response = await fetch(`${API_BASE_URL}/rentals/${id}`, {
      method: 'PUT', // Matches your @Put(':id') in NestJS controller
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update rental');
    }
    return response.json();
  },
  
};