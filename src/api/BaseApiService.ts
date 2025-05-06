import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { sanitizeForLogging } from '../lib/encryption';

export default abstract class BaseApiService {
  protected client: AxiosInstance;
  protected baseUrl: string;

  constructor(baseUrl: string, config: AxiosRequestConfig = {}) {
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: baseUrl,
      ...config,
    });

    // Add request logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`,
          sanitizeForLogging(config.params || {}),
          sanitizeForLogging(config.data || {})
        );
        return config;
      },
      (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response logging
    this.client.interceptors.response.use(
      (response) => {
        console.log(`API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('API Response Error:', error.response?.status, error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  // Helper methods for standard API operations
  protected async get<T>(url: string, config: AxiosRequestConfig = {}): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  protected async post<T>(url: string, data: any, config: AxiosRequestConfig = {}): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  protected async put<T>(url: string, data: any, config: AxiosRequestConfig = {}): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  protected async delete<T>(url: string, config: AxiosRequestConfig = {}): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  // Error handling helper
  protected handleApiError(error: any): never {
    if (error.response) {
      // Server responded with a status code outside of 2xx range
      const status = error.response.status;

      // Try to extract the most useful error message
      let message = '';
      if (error.response.data?.error?.message) {
        message = error.response.data.error.message;
      } else if (error.response.data?.message) {
        message = error.response.data.message;
      } else if (error.response.data?.error_message) {
        message = error.response.data.error_message;
      } else if (typeof error.response.data === 'string') {
        message = error.response.data;
      } else {
        message = error.response.statusText || 'Unknown error';
      }

      // Handle specific status codes
      if (status === 401 || status === 403) {
        throw new Error(`Authentication error (${status}): ${message}. Your access token may be invalid or expired.`);
      } else if (status === 404) {
        throw new Error(`Resource not found (${status}): ${message}`);
      } else if (status === 400) {
        throw new Error(`Bad request (${status}): ${message}`);
      } else if (status >= 500) {
        throw new Error(`Server error (${status}): ${message}. Please try again later.`);
      } else {
        throw new Error(`API Error (${status}): ${message}`);
      }
    } else if (error.request) {
      // Request was made but no response was received
      throw new Error('Network error: No response received from server. Please check your internet connection.');
    } else {
      // Something else happened while setting up the request
      throw new Error(`API Error: ${error.message || 'Unknown error occurred'}`);
    }
  }
}