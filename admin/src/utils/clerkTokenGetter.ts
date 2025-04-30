/**
 * Get the Clerk session token for API requests
 * @returns Promise with the session token or null if not authenticated
 */
export const getClerkToken = async (): Promise<string | null> => {
  try {
    console.log('getClerkToken: Starting token retrieval');
    
    // In browser environment, get the token from the cookie
    if (typeof window !== 'undefined') {
      console.log('getClerkToken: Browser environment detected');
      
      // Get the __session cookie which contains the Clerk session token
      const cookies = document.cookie.split(';');
      const sessionCookie = cookies.find(cookie => cookie.trim().startsWith('__session='));
      
      if (sessionCookie) {
        console.log('getClerkToken: Found __session cookie');
        // Extract the token from the cookie
        const token = sessionCookie.split('=')[1]?.trim();
        console.log('getClerkToken: Token extracted from cookie:', token ? 'Yes (token exists)' : 'No (null token)');
        return token || null;
      } else {
        console.warn('getClerkToken: No __session cookie found');
        
        // Alternative approach: try to get token from localStorage if Clerk stores it there
        const clerkToken = localStorage.getItem('clerk-session-token');
        if (clerkToken) {
          console.log('getClerkToken: Found token in localStorage');
          return clerkToken;
        }
      }
    } else {
      console.warn('getClerkToken: Not in browser environment');
    }
    
    return null;
  } catch (error) {
    console.error('Error getting Clerk token:', error);
    return null;
  }
};
