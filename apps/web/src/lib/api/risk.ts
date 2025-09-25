const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// This is a placeholder. In a real app, you'd fetch this from the session.
const getAuthToken = () => 'your-jwt-token';

async function fetchApi(path: string, options: RequestInit = {}) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getAuthToken()}`,
    ...options.headers,
  };

  const response = await fetch(`${API_URL}/${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    // You might want to handle errors more gracefully here
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return response.json();
}

export const riskApi = {
  list: (tenantId: string, query: string) => {
    return fetchApi(`tenants/${tenantId}/risks?${query}`);
  },
  get: (tenantId: string, riskId: string) => {
    return fetchApi(`tenants/${tenantId}/risks/${riskId}`);
  },
  heatmap: (tenantId: string) => {
    return fetchApi(`tenants/${tenantId}/risk-heatmap`);
  },
  // Add other risk-related API calls here as needed
};