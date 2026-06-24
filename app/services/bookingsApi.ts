import { getToken } from './auth';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export interface BookingAddress {
  street: string;
  city: string;
  zipCode: string;
  place: string;
  phone: string;
  notes?: string;
}

export interface BookingItem {
  itemId: string;
  itemName: string;
  description?: string;
  images?: string[];
  category: string;
  unit: string;
  price: number;
  quantity: number;
}

export interface Booking {
  _id: string;
  storeId: string;
  userId: string;
  bookingType: 'SERVICE' | 'RENTAL';
  item: BookingItem;
  startDate: string;
  endDate?: string;
  totalAmount: number;
  bookingAddress: BookingAddress;
  status: 'PLACED' | 'ACCEPTED' | 'REJECTED' | 'IN_PROGRESS' | 'COMPLETED' | 'RETURNED' | 'CANCELLED';
  paymentMethod: string;
  paymentStatus: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch all bookings placed for the authenticated storekeeper's shop
 */
export async function fetchStoreBookings(): Promise<Booking[]> {
  const authToken = await getToken();
  const response = await fetch(`${API_BASE_URL}/bookings/store/list`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch store bookings');
  }
  return response.json();
}

/**
 * Fetch detailed context for a single specific booking by ID
 */
export async function fetchStoreBookingById(bookingId: string): Promise<Booking> {
  const authToken = await getToken();
  const response = await fetch(`${API_BASE_URL}/bookings/store/list/${bookingId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch booking details for ID: ${bookingId}`);
  }
  return response.json();
}

/**
 * Update a booking status transition (e.g. ACCEPTED, IN_PROGRESS, COMPLETED, REJECTED)
 */
export async function updateBookingStatus(
  bookingId: string,
  status: Booking['status']
): Promise<Booking> {
  const authToken = await getToken();
  const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/status`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to update booking status');
  }
  return response.json();
}