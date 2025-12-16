import { createContract } from '../../../src/index.ts';
import { z } from 'zod/v4';
import {
  CreateUserRequest,
  UpdateUserRequest,
  UserResponse,
  UsersListResponse,
  UserQueryParams,
  ErrorResponse,
  AuthHeaders,
  IdParam,
  PaginationQuery,
} from '../schemas';

/**
 * Users contract - defines all user-related API endpoints
 */
export const usersContract = createContract({
  getUsers: {
    path: '/users',
    method: 'GET',
    summary: 'List Users',
    description: 'Retrieve a paginated list of users with optional filtering',
    headers: AuthHeaders,
    query: PaginationQuery.extend(UserQueryParams.shape),
    responses: {
      200: {
        'application/json': {
          body: UsersListResponse,
          headers: z.object({ 'content-type': z.literal('application/json') }),
        },
      },
      401: {
        'application/json': {
          body: ErrorResponse,
          headers: z.object({ 'content-type': z.literal('application/json') }),
        },
      },
      403: {
        'application/json': {
          body: ErrorResponse,
          headers: z.object({ 'content-type': z.literal('application/json') }),
        },
      },
    },
    tags: ['Users'],
  },
  getUserById: {
    path: '/users/:id',
    method: 'GET',
    summary: 'Get User by ID',
    description: 'Retrieve a specific user by their ID',
    headers: AuthHeaders,
    pathParams: IdParam,
    responses: {
      200: {
        'application/json': {
          body: UserResponse,
          headers: z.object({ 'content-type': z.literal('application/json') }),
        },
      },
      401: {
        'application/json': {
          body: ErrorResponse,
          headers: z.object({ 'content-type': z.literal('application/json') }),
        },
      },
      404: {
        'application/json': {
          body: ErrorResponse,
          headers: z.object({ 'content-type': z.literal('application/json') }),
        },
      },
    },
    tags: ['Users'],
  },
  createUser: {
    path: '/users',
    method: 'POST',
    summary: 'Create User',
    description: 'Create a new user account',
    headers: AuthHeaders,
    requests: {
      'application/json': {
        body: CreateUserRequest,
      },
    },
    responses: {
      201: {
        'application/json': {
          body: UserResponse,
          headers: z.object({ 'content-type': z.literal('application/json') }),
        },
      },
      400: {
        'application/json': {
          body: ErrorResponse,
          headers: z.object({ 'content-type': z.literal('application/json') }),
        },
      },
      401: {
        'application/json': {
          body: ErrorResponse,
          headers: z.object({ 'content-type': z.literal('application/json') }),
        },
      },
      409: {
        'application/json': {
          body: ErrorResponse,
          headers: z.object({ 'content-type': z.literal('application/json') }),
        },
      },
    },
    tags: ['Users'],
  },
  updateUser: {
    path: '/users/:id',
    method: 'PATCH',
    summary: 'Update User',
    description: 'Update an existing user account',
    headers: AuthHeaders,
    pathParams: IdParam,
    requests: {
      'application/json': {
        body: UpdateUserRequest,
      },
    },
    responses: {
      200: {
        'application/json': {
          body: UserResponse,
          headers: z.object({ 'content-type': z.literal('application/json') }),
        },
      },
      400: {
        'application/json': {
          body: ErrorResponse,
          headers: z.object({ 'content-type': z.literal('application/json') }),
        },
      },
      401: {
        'application/json': {
          body: ErrorResponse,
          headers: z.object({ 'content-type': z.literal('application/json') }),
        },
      },
      403: {
        'application/json': {
          body: ErrorResponse,
          headers: z.object({ 'content-type': z.literal('application/json') }),
        },
      },
      404: {
        'application/json': {
          body: ErrorResponse,
          headers: z.object({ 'content-type': z.literal('application/json') }),
        },
      },
    },
    tags: ['Users'],
  },
  deleteUser: {
    path: '/users/:id',
    method: 'DELETE',
    summary: 'Delete User',
    description: 'Delete a user account',
    headers: AuthHeaders,
    pathParams: IdParam,
    responses: {
      204: {
        'application/json': {
          body: z.void(),
          headers: z.object({ 'content-type': z.literal('application/json') }),
        },
      },
      401: {
        'application/json': {
          body: ErrorResponse,
          headers: z.object({ 'content-type': z.literal('application/json') }),
        },
      },
      403: {
        'application/json': {
          body: ErrorResponse,
          headers: z.object({ 'content-type': z.literal('application/json') }),
        },
      },
      404: {
        'application/json': {
          body: ErrorResponse,
          headers: z.object({ 'content-type': z.literal('application/json') }),
        },
      },
    },
    tags: ['Users'],
  },
});
