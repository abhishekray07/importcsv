/**
 * API client with axios for communicating with the ImportCSV backend
 * Includes automatic token refresh functionality
 */
import axios from 'axios';
import { getApiBaseUrl } from '../config';

// Base URL for API requests
const API_BASE_URL = getApiBaseUrl();

// Create axios instance
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Storage keys
const AUTH_TOKEN_KEY = 'authToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
// Queue of requests to retry after token refresh
let failedQueue = [];

// Process the queue of failed requests
const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Function to refresh the access token
const refreshAccessToken = async () => {
  try {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

    if (!refreshToken) {
      return Promise.reject('No refresh token available');
    }

    const response = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
      refresh_token: refreshToken
    });

    const { access_token } = response.data;

    // Update the token in localStorage
    localStorage.setItem(AUTH_TOKEN_KEY, access_token);

    return access_token;
  } catch (error) {
    // If refresh fails, clear tokens and redirect to login
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);

    // Redirect to login page if in browser environment
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
};

// Request interceptor to add auth token to requests
apiClient.interceptors.request.use(
  config => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Response interceptor to handle token refresh on 401 errors
apiClient.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    // If the error is not 401 or we've already tried to refresh, reject
    if (!error.response || error.response.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Set flag to prevent retrying this request again
    originalRequest._retry = true;

    // If we're already refreshing, add this request to the queue
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(token => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return apiClient(originalRequest);
        })
        .catch(err => Promise.reject(err));
    }

    isRefreshing = true;

    try {
      // Attempt to refresh the token
      const newToken = await refreshAccessToken();

      // Update the authorization header
      originalRequest.headers['Authorization'] = `Bearer ${newToken}`;

      // Process any queued requests with the new token
      processQueue(null, newToken);

      return apiClient(originalRequest);
    } catch (refreshError) {
      // If refresh fails, process queue with error
      processQueue(refreshError, null);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

/**
 * Authentication API
 */
export const authApi = {
  /**
   * Login to get access token
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} - Response with access token
   */
  login: async (email, password) => {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const response = await axios.post(`${API_BASE_URL}/api/v1/auth/jwt/login`, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    // Store tokens in localStorage
    if (response.data.access_token) {
      localStorage.setItem(AUTH_TOKEN_KEY, response.data.access_token);
    }

    if (response.data.refresh_token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, response.data.refresh_token);
    }

    return response.data;
  },

  /**
   * Logout the current user
   */
  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local storage
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  },

  /**
   * Get current user information
   * @returns {Promise<Object>} - User information
   */
  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
};

/**
 * Schema API
 */
export const schemaApi = {
  /**
   * Get all schemas
   * @returns {Promise<Array>} - List of schemas
   */
  getSchemas: async () => {
    const response = await apiClient.get('/schemas/');
    return response.data;
  },

  /**
   * Get schema template for CSV importer
   * @param {number} schemaId - Schema ID
   * @returns {Promise<Object>} - Schema template
   */
  getSchemaTemplate: async (schemaId) => {
    const response = await apiClient.get(`/frontend/schema-template/${schemaId}`);
    return response.data;
  },
};

/**
 * Import API
 */
export const importApi = {
  /**
   * Process CSV data from the frontend importer
   * @param {number} schemaId - Schema ID
   * @param {Object} importData - Data from CSV importer
   * @returns {Promise<Object>} - Import job information
   */
  processCSVData: async (schemaId, importData) => {
    const response = await apiClient.post('/frontend/process-csv-data', {
      schema_id: schemaId,
      validData: importData.validData,
      invalidData: importData.invalidData,
    });

    return response.data;
  },

  /**
   * Get import job status
   * @param {number} jobId - Import job ID
   * @returns {Promise<Object>} - Import job status
   */
  getImportJobStatus: async (jobId) => {
    const response = await apiClient.get(`/imports/${jobId}`);
    return response.data;
  },
};

// Export all APIs and the axios instance
export default {
  client: apiClient,
  auth: authApi,
  schema: schemaApi,
  import: importApi,
};
