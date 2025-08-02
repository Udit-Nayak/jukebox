import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { ApiResponse } from '../types';

class ApiService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('jukebox_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle common errors
    this.api.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: AxiosError) => {
        // Handle 401 errors globally
        if (error.response?.status === 401) {
          localStorage.removeItem('jukebox_token');
          localStorage.removeItem('jukebox_user');
          window.location.href = '/login';
        }

        // Handle network errors
        if (!error.response) {
          console.error('Network error:', error.message);
          throw new Error('Network error. Please check your connection.');
        }

        return Promise.reject(error);
      }
    );
  }

  // Generic GET request
  async get<T = any>(url: string, params?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.get(url, { params });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Generic POST request
  async post<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.post(url, data);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Generic PUT request
  async put<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.put(url, data);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Generic DELETE request
  async delete<T = any>(url: string): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.delete(url);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Handle API errors
  private handleError(error: AxiosError): Error {
    if (error.response?.data) {
      const apiError = error.response.data as ApiResponse;
      throw new Error(apiError.error || 'An error occurred');
    }

    if (error.message) {
      throw new Error(error.message);
    }

    throw new Error('An unexpected error occurred');
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.api.get('/health');
      return response.data.success;
    } catch (error) {
      return false;
    }
  }

  // Set auth token
  setAuthToken(token: string) {
    localStorage.setItem('jukebox_token', token);
  }

  // Remove auth token
  removeAuthToken() {
    localStorage.removeItem('jukebox_token');
    localStorage.removeItem('jukebox_user');
  }

  // Get current auth token
  getAuthToken(): string | null {
    return localStorage.getItem('jukebox_token');
  }
}

export const apiService = new ApiService();
export default apiService;