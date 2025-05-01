/**
 * Configuration file for environment-specific settings
 */

// Determine the current environment
const getEnvironment = () => {
  // For browser environments
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV) {
    return process.env.NODE_ENV;
  }
  
  // Check if we're in a build for npm package (set in package.json scripts)
  if (process.env.NPM_PACKAGE_BUILD === 'true') {
    return 'production';
  }

  // Default to development if environment can't be determined
  return 'development';
};

// API URL configuration for different environments
const API_URLS = {
  development: 'https://abhishekray07.ngrok.io',
  production: 'https://api.importcsv.com',
};

// Get the current API URL based on environment
export const getApiBaseUrl = () => {
  const env = getEnvironment();
  return API_URLS[env] || API_URLS.development;
};

// Export configuration
export default {
  apiBaseUrl: getApiBaseUrl(),
  // Add other configuration settings here
};
