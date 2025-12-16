/**
 * Authentication utilities
 * In a real application, this would verify JWT tokens, check permissions, etc.
 */

/**
 * Extract user ID from authorization header
 * This is a simplified version - in production, you'd verify the JWT token
 */
export function extractUserIdFromAuth(authHeader: string | null | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  // In a real app, you'd decode and verify the JWT token here
  // For this example, we'll just extract a mock user ID
  const token = authHeader.replace('Bearer ', '');

  // Mock: if token is "admin", return admin user ID, otherwise return a default user ID
  // In production, decode JWT and extract user ID from claims
  return token === 'admin-token' ? 'admin-user-id' : 'user-id';
}

/**
 * Check if user has required role
 */
export function hasRole(userRole: string, requiredRoles: string[]): boolean {
  return requiredRoles.includes(userRole);
}

/**
 * Check if user can access resource
 */
export function canAccessResource(
  userId: string,
  resourceUserId: string,
  userRole: string
): boolean {
  // Users can access their own resources, admins can access any resource
  return userId === resourceUserId || userRole === 'admin';
}
