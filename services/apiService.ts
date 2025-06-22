import axios from "axios";

const API_BASE_URL = "http://192.168.1.73:3001/api/v1";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Optionally set token for authenticated requests
export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
};

// Generic GET
export const apiGet = async (url: string, params?: any) => {
  try {
    const response = await api.get(url, { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Generic GET for public endpoints (no auth token)
export const apiGetPublic = async (url: string, params?: any) => {
  try {
    const response = await api.get(url, {
      params,
      headers: {
        Authorization: null,
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Generic POST
export const apiPost = async (url: string, data?: any) => {
  try {
    const response = await api.post(url, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Generic POST for public endpoints (no auth token)
export const apiPostPublic = async (url: string, data?: any) => {
  try {
    const response = await api.post(url, data, {
      headers: {
        Authorization: null,
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Generic PUT
export const apiPut = async (url: string, data?: any) => {
  try {
    const response = await api.put(url, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Generic DELETE
export const apiDelete = async (url: string) => {
  try {
    const response = await api.delete(url);
    return response.data;
  } catch (error) {
    throw error;
  }
};
