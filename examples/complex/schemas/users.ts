import { z } from 'zod/v4';
import { PaginationMeta } from './common';

/**
 * User role enum
 */
export const UserRole = z.enum(['admin', 'user', 'moderator']).meta({
  title: 'User Role',
  description: 'The role of the user in the system',
});

/**
 * User status enum
 */
export const UserStatus = z.enum(['active', 'inactive', 'suspended']).meta({
  title: 'User Status',
  description: 'The current status of the user account',
});

/**
 * Base user schema
 */
export const User = z
  .object({
    id: z.string().uuid().meta({ title: 'User ID', description: 'Unique identifier for the user' }),
    email: z.string().email().meta({ title: 'Email', description: 'User email address' }),
    username: z.string().min(3).max(50).meta({ title: 'Username', description: 'User username' }),
    firstName: z
      .string()
      .min(1)
      .max(100)
      .meta({ title: 'First Name', description: 'User first name' }),
    lastName: z
      .string()
      .min(1)
      .max(100)
      .meta({ title: 'Last Name', description: 'User last name' }),
    role: UserRole.meta({ title: 'Role', description: 'User role' }),
    status: UserStatus.meta({ title: 'Status', description: 'User account status' }),
    createdAt: z
      .string()
      .datetime()
      .meta({ title: 'Created At', description: 'Account creation timestamp' }),
    updatedAt: z
      .string()
      .datetime()
      .meta({ title: 'Updated At', description: 'Last update timestamp' }),
  })
  .meta({ title: 'User', description: 'User account information' });

/**
 * Create user request schema
 */
export const CreateUserRequest = z
  .object({
    email: z.string().email().meta({ title: 'Email', description: 'User email address' }),
    username: z.string().min(3).max(50).meta({ title: 'Username', description: 'User username' }),
    password: z.string().min(8).max(100).meta({ title: 'Password', description: 'User password' }),
    firstName: z
      .string()
      .min(1)
      .max(100)
      .meta({ title: 'First Name', description: 'User first name' }),
    lastName: z
      .string()
      .min(1)
      .max(100)
      .meta({ title: 'Last Name', description: 'User last name' }),
    role: UserRole.default('user').optional().meta({ title: 'Role', description: 'User role' }),
  })
  .meta({ title: 'Create User Request', description: 'Request to create a new user' });

/**
 * Update user request schema
 */
export const UpdateUserRequest = z
  .object({
    email: z
      .string()
      .email()
      .optional()
      .meta({ title: 'Email', description: 'User email address' }),
    username: z
      .string()
      .min(3)
      .max(50)
      .optional()
      .meta({ title: 'Username', description: 'User username' }),
    firstName: z
      .string()
      .min(1)
      .max(100)
      .optional()
      .meta({ title: 'First Name', description: 'User first name' }),
    lastName: z
      .string()
      .min(1)
      .max(100)
      .optional()
      .meta({ title: 'Last Name', description: 'User last name' }),
    role: UserRole.optional().meta({ title: 'Role', description: 'User role' }),
    status: UserStatus.optional().meta({ title: 'Status', description: 'User account status' }),
  })
  .meta({ title: 'Update User Request', description: 'Request to update user information' });

/**
 * User response schema
 */
export const UserResponse = User.meta({
  title: 'User Response',
  description: 'User information response',
});

/**
 * Users list response schema
 */
export const UsersListResponse = z
  .object({
    users: z.array(User).meta({ title: 'Users', description: 'List of users' }),
    meta: PaginationMeta.meta({ title: 'Pagination', description: 'Pagination metadata' }),
  })
  .meta({ title: 'Users List Response', description: 'Paginated list of users' });

/**
 * User query parameters for filtering
 */
export const UserQueryParams = z
  .object({
    role: UserRole.optional().meta({ title: 'Role Filter', description: 'Filter by user role' }),
    status: UserStatus.optional().meta({
      title: 'Status Filter',
      description: 'Filter by user status',
    }),
    search: z
      .string()
      .min(1)
      .max(100)
      .optional()
      .meta({ title: 'Search', description: 'Search by email or username' }),
  })
  .meta({ title: 'User Query Parameters', description: 'Query parameters for filtering users' });
