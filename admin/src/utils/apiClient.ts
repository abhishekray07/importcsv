/**
 * API client with axios for communicating with the ImportCSV backend
 * Includes automatic token refresh functionality
 */
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";


// Base URL for API requests
const API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

// Create axios instance
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Storage keys - exported for use in other files
export const AUTH_TOKEN_KEY = "authToken";
export const REFRESH_TOKEN_KEY = "refreshToken";

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
// Queue of requests to retry after token refresh
let failedQueue: {
  resolve: (value: unknown) => void;
  reject: (reason?: any) => void;
}[] = [];

// Process the queue of failed requests
const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Function to refresh the access token
const refreshAccessToken = async (): Promise<string> => {
  try {
    // Only run in browser environment
    if (typeof window === "undefined") {
      return Promise.reject("Not in browser environment");
    }

    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

    if (!refreshToken) {
      console.error("No refresh token available in localStorage");
      return Promise.reject("No refresh token available");
    }

    // Use a direct axios instance without interceptors to avoid circular dependencies
    // Make sure to set the proper Content-Type header
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/auth/refresh`,
      {
        refresh_token: refreshToken,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    // Verify the response contains the expected tokens
    if (!response.data || !response.data.access_token) {
      console.error("Invalid refresh response:", response.data);
      return Promise.reject("Invalid refresh response");
    }

    // Extract both tokens from the response
    const { access_token, refresh_token } = response.data;

    // Update the access token in localStorage
    localStorage.setItem(AUTH_TOKEN_KEY, access_token);

    // Also update the refresh token if a new one was provided
    if (refresh_token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
    }

    return access_token;
  } catch (error: any) {
    console.error(
      "Token refresh failed:",
      error?.response?.status,
      error?.response?.data || error.message,
    );

    // If refresh fails, clear tokens and redirect to login
    if (typeof window !== "undefined") {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);

      // Redirect to login page
      // Redirect to login page due to failed token refresh
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
};



// Global token getter function that can be set from outside
let globalTokenGetter: () => Promise<string | null> = async () => {
  return null;
};

// Function to set the token getter
export const setTokenGetter = (getter: () => Promise<string | null>) => {
  globalTokenGetter = getter;
};

// Request interceptor to add auth token to requests
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // Get the token using the global token getter
      const token = await globalTokenGetter();
      
      // Add the token to the request headers if available
      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
    } catch (error) {
      // Token retrieval failed, continue without token
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor to handle token refresh on 401 errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    // If the error is not 401 or we've already tried to refresh, reject
    if (
      !error.response ||
      error.response.status !== 401 ||
      originalRequest._retry
    ) {
      return Promise.reject(error);
    }

    // Only run in browser environment
    if (typeof window === "undefined") {
      return Promise.reject(error);
    }

    // Set flag to prevent retrying this request again
    originalRequest._retry = true;

    // If we're already refreshing, add this request to the queue
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers["Authorization"] = `Bearer ${
              token as string
            }`;
          }
          return apiClient(originalRequest);
        })
        .catch((err) => {
          return Promise.reject(err);
        });
    }

    isRefreshing = true;

    try {
      // Attempt to refresh the token
      const newToken = await refreshAccessToken();

      // Update the authorization header
      if (originalRequest.headers) {
        originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
      }

      // Process any queued requests with the new token
      processQueue(null, newToken);

      // Retry the original request with the new token
      return apiClient(originalRequest);
    } catch (refreshError) {
      // If refresh fails, process queue with error
      processQueue(refreshError as Error, null);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

/**
 * Authentication API
 */
export const authApi = {
  /**
   * Login to get access token
   * @param email - User email
   * @param password - User password
   * @returns Response with access token
   */
  login: async (email: string, password: string) => {
    try {
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      // Try the new endpoint that returns both access and refresh tokens
      const response = await axios
        .post(`${API_BASE_URL}/api/v1/auth/jwt/login-with-refresh`, formData, {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        })
        .catch(async (error) => {
          // Log login endpoint failure
          // "New login endpoint failed, falling back to standard login:" + error?.response?.status
          // Fall back to the standard login endpoint if the new one fails
          return await axios.post(
            `${API_BASE_URL}/api/v1/auth/login`,
            formData,
            {
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
            },
          );
        });

      // Store tokens in localStorage
      if (response.data.access_token) {
        localStorage.setItem(AUTH_TOKEN_KEY, response.data.access_token);
      } else {
        console.warn("No access token received from login response");
      }

      // Check if we received a refresh token directly
      if (response.data.refresh_token) {
        localStorage.setItem(REFRESH_TOKEN_KEY, response.data.refresh_token);
      } else {
        // Create a refresh token by calling our custom endpoint
        try {
          // Get the current user ID first
          const userResponse = await axios.get(
            `${API_BASE_URL}/api/v1/auth/me`,
            {
              headers: {
                Authorization: `Bearer ${response.data.access_token}`,
              },
            },
          );

          if (userResponse.data && userResponse.data.id) {
            // Try to create a refresh token
            const refreshToken = await axios
              .post(`${API_BASE_URL}/api/v1/auth/refresh`, {
                refresh_token: response.data.access_token, // Use access token as temporary refresh token
              })
              .catch((e) => {
                console.warn(
                  "Could not create refresh token:",
                  e?.response?.status,
                );
                return null;
              });

            if (
              refreshToken &&
              refreshToken.data &&
              refreshToken.data.refresh_token
            ) {
              localStorage.setItem(
                REFRESH_TOKEN_KEY,
                refreshToken.data.refresh_token,
              );
            }
          }
        } catch (refreshError) {
          console.error("Error creating refresh token:", refreshError);
          // Continue with login even if refresh token creation fails
        }
      }

      return response.data;
    } catch (error: any) {
      console.error(
        "Login error:",
        error?.response?.status,
        error?.response?.data || error,
      );
      throw error;
    }
  },

  /**
   * Register a new user
   * @param email - User email
   * @param password - User password
   * @param fullName - User's full name
   * @returns Response with user data
   */
  register: async (email: string, password: string, fullName: string) => {
    const response = await axios.post(`${API_BASE_URL}/api/v1/auth/register`, {
      email,
      password,
      full_name: fullName,
      is_superuser: false,
      is_active: true,
    });

    return response.data;
  },

  /**
   * Logout the current user
   * @returns Promise that resolves when logout is complete
   */
  logout: async () => {
    try {
      // Get the current token to send in the logout request
      const token = localStorage.getItem(AUTH_TOKEN_KEY);

      if (token) {
        // Make sure we send the token in the request so it can be properly revoked
        await apiClient.post(
          "/auth/logout",
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
      }
    } catch (error) {
      console.error("Logout error:", error);
      // Continue with local logout even if API call fails
    } finally {
      // Always clear local storage
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  },

  /**
   * Get current user information
   * @returns User information
   */
  getCurrentUser: async () => {
    const response = await apiClient.get("/auth/me");
    return response.data;
  },

  /**
   * Validate a token with the backend
   * @param token - Access token to validate
   * @returns Whether the token is valid
   */
  validateToken: async (token: string): Promise<boolean> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  },

  /**
   * Refresh the access token
   * @returns New access token
   */
  refreshAccessToken,
};

/**
 * Importers API
 */
export const importersApi = {
  /**
   * Get all importers
   * @returns List of importers
   */
  getImporters: async () => {
    const response = await apiClient.get("/importers/");
    return response.data;
  },

  /**
   * Get a single importer by ID
   * @param importerId - Importer ID
   * @returns Importer details
   */
  getImporter: async (importerId: string) => {
    const response = await apiClient.get(`/importers/${importerId}`);
    return response.data;
  },

  /**
   * Create a new importer
   * @param importerData - Importer data
   * @returns Created importer
   */
  createImporter: async (importerData: any) => {
    const response = await apiClient.post("/importers/", importerData);
    return response.data;
  },

  /**
   * Update an existing importer
   * @param importerId - Importer ID
   * @param importerData - Updated importer data
   * @returns Updated importer
   */
  updateImporter: async (importerId: string, importerData: any) => {
    const response = await apiClient.put(
      `/importers/${importerId}`,
      importerData,
    );
    return response.data;
  },

  /**
   * Delete an importer
   * @param importerId - Importer ID
   * @returns Success message
   */
  deleteImporter: async (importerId: string) => {
    const response = await apiClient.delete(`/importers/${importerId}`);
    return response.data;
  },
};

/**
 * Imports API
 */
export const importsApi = {
  /**
   * Get all import jobs
   * @returns List of import jobs
   */
  getImports: async () => {
    const response = await apiClient.get("/imports");
    return response.data;
  },

  /**
   * Get a single import job by ID
   * @param importId - Import job ID
   * @returns Import job details
   */
  getImport: async (importId: string) => {
    const response = await apiClient.get(`/imports/${importId}`);
    return response.data;
  },
};

// Export all APIs and the axios instance
export default {
  client: apiClient,
  auth: authApi,
  importers: importersApi,
  imports: importsApi,
};
