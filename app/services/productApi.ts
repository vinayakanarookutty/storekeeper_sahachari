import { getToken } from './auth';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export async function fetchItems(): Promise<any[]> {
  const authToken = await getToken();
  const response = await fetch(`${API_BASE_URL}/storekeeper/products`, {
    headers: { 'Authorization': `Bearer ${authToken}` },
  });
  if (!response.ok) throw new Error('Failed to fetch items');
  return response.json();
}

export async function fetchMyRentals(): Promise<any[]> {
  const authToken = await getToken();
  const response = await fetch(`${API_BASE_URL}/rentals/store/my-rentals`, {
    headers: { 'Authorization': `Bearer ${authToken}` },
  });
  if (!response.ok) throw new Error('Failed to fetch rentals');
  return response.json();
}

export async function fetchMyServices(): Promise<any[]> {
  const authToken = await getToken();
  const response = await fetch(`${API_BASE_URL}/services/store/my-services`, {
    headers: { 'Authorization': `Bearer ${authToken}` },
  });
  if (!response.ok) throw new Error('Failed to fetch services');
  return response.json();
}