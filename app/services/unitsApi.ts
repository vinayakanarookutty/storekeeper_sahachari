const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export const DEFAULT_SERVICE_UNITS = [
  'Hour',
  'Day',
  'Week',
  'Month',
  'pcs',
  'Visit',
  'Session',
  'Sq Ft',
  'Km',
];

export const DEFAULT_RENT_UNITS = [
  'Hour',
  'Day',
  'Week',
  'Month',
  'Night',
  'Year',
];

export interface UnitsConfigResponse {
  serviceUnits: string[];
  rentUnits: string[];
}

export const unitsApi = {
  getUnits: async (): Promise<UnitsConfigResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/units`);
      if (!response.ok) {
        throw new Error('Failed to fetch units');
      }
      const data = await response.json();
      return {
        serviceUnits:
          Array.isArray(data?.serviceUnits) && data.serviceUnits.length > 0
            ? data.serviceUnits
            : DEFAULT_SERVICE_UNITS,
        rentUnits:
          Array.isArray(data?.rentUnits) && data.rentUnits.length > 0
            ? data.rentUnits
            : DEFAULT_RENT_UNITS,
      };
    } catch (err) {
      console.warn('Error fetching dynamic units, using fallback defaults:', err);
      return {
        serviceUnits: DEFAULT_SERVICE_UNITS,
        rentUnits: DEFAULT_RENT_UNITS,
      };
    }
  },
};
