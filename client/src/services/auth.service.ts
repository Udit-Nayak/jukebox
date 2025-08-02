import { apiService } from './api';
import { 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse, 
  User, 
} from '../types';

class AuthService {
  // Login user
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse['data']>('/api/auth/login', credentials);
    
    if (response.success && response.data) {
      // Store token and user data
      localStorage.setItem('jukebox_token', response.data.token);
      localStorage.setItem('jukebox_user', JSON.stringify(response.data.user));
      apiService.setAuthToken(response.data.token);
    }

    return {
      success: response.success,
      data: response.data!,
      message: response.message
    };
  }

  // Register user
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse['data']>('/api/auth/register', userData);
    
    if (response.success && response.data) {
      // Store token and user data
      localStorage.setItem('jukebox_token', response.data.token);
      localStorage.setItem('jukebox_user', JSON.stringify(response.data.user));
      apiService.setAuthToken(response.data.token);
    }

    return {
      success: response.success,
      data: response.data!,
      message: response.message
    };
  }

  // Get current user profile
  async getCurrentUser(): Promise<User> {
    const response = await apiService.get<{ user: User }>('/api/auth/me');
    
    if (response.success && response.data) {
      // Update stored user data
      localStorage.setItem('jukebox_user', JSON.stringify(response.data.user));
      return response.data.user;
    }

    throw new Error('Failed to get user profile');
  }

  // Refresh token
  async refreshToken(): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse['data']>('/api/auth/refresh');
    
    if (response.success && response.data) {
      localStorage.setItem('jukebox_token', response.data.token);
      localStorage.setItem('jukebox_user', JSON.stringify(response.data.user));
      apiService.setAuthToken(response.data.token);
    }

    return {
      success: response.success,
      data: response.data!,
      message: response.message
    };
  }

  // Create admin user (for initial setup)
  async createAdmin(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse['data']>('/api/auth/create-admin', userData);
    
    if (response.success && response.data) {
      localStorage.setItem('jukebox_token', response.data.token);
      localStorage.setItem('jukebox_user', JSON.stringify(response.data.user));
      apiService.setAuthToken(response.data.token);
    }

    return {
      success: response.success,
      data: response.data!,
      message: response.message
    };
  }

  // Logout user
  logout(): void {
    localStorage.removeItem('jukebox_token');
    localStorage.removeItem('jukebox_user');
    apiService.removeAuthToken();
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = localStorage.getItem('jukebox_token');
    const user = localStorage.getItem('jukebox_user');
    return !!(token && user);
  }

  // Get stored user data
  getStoredUser(): User | null {
    const userStr = localStorage.getItem('jukebox_user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        this.logout();
        return null;
      }
    }
    return null;
  }

  // Get stored token
  getStoredToken(): string | null {
    return localStorage.getItem('jukebox_token');
  }

  // Check if user is admin
  isAdmin(): boolean {
    const user = this.getStoredUser();
    return user?.role === 'admin';
  }

  // Validate token format (basic check)
  isValidTokenFormat(token: string): boolean {
    try {
      // JWT tokens have 3 parts separated by dots
      const parts = token.split('.');
      return parts.length === 3;
    } catch (error) {
      return false;
    }
  }

  // Auto-login on app start (validate stored token)
  async autoLogin(): Promise<User | null> {
    try {
      const token = this.getStoredToken();
      const user = this.getStoredUser();

      if (!token || !user || !this.isValidTokenFormat(token)) {
        this.logout();
        return null;
      }

      // Verify token is still valid by getting current user
      const currentUser = await this.getCurrentUser();
      return currentUser;
    } catch (error) {
      console.error('Auto-login failed:', error);
      this.logout();
      return null;
    }
  }
}

export const authService = new AuthService();
export default authService;