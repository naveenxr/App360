import apiClient from './api';
import { User } from '../types/auth';

export interface LoginApiResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: User;
  };
}

export const authService = {
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const response = await apiClient.post<LoginApiResponse>('/auth/login', {
      email,
      password
    });
    const { token, user } = response.data.data;
    if (typeof window !== 'undefined') {
      localStorage.setItem('app360_token', token);
      localStorage.setItem('app360_user', JSON.stringify(user));
    }
    return { token, user };
  },

  async getMe(): Promise<User> {
    const response = await apiClient.get<{ success: boolean; data: User }>('/auth/me');
    return response.data.data;
  },

  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('app360_token');
      localStorage.removeItem('app360_user');
    }
  },

  getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('app360_token');
  },

  getStoredUser(): User | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('app360_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }
};

export default authService;

