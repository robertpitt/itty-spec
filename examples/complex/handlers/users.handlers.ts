import { userDb } from '../utils/database';
import { paginate } from '../utils/pagination';
import type { AuthenticatedRequest } from '../middleware/auth.middleware';

/**
 * User handlers - implement all user-related endpoints
 */

export const userHandlers = {
  getUsers: async (request: AuthenticatedRequest) => {
    const { page = 1, limit = 20, role, status, search } = request.validatedQuery || {};

    const filters = { role, status, search };
    const allUsers = userDb.findAll(filters);
    const result = paginate(allUsers, { page, limit });

    return request.respond({
      status: 200,
      contentType: 'application/json',
      body: {
        users: result.items,
        meta: result.meta,
      },
    });
  },

  getUserById: async (request: AuthenticatedRequest) => {
    const { id } = request.validatedPathParams;
    const user = userDb.findById(id);

    if (!user) {
      return request.respond({
        status: 404,
        contentType: 'application/json',
        body: {
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        },
      });
    }

    return request.respond({
      status: 200,
      contentType: 'application/json',
      body: user,
    });
  },

  createUser: async (request: AuthenticatedRequest) => {
    const data = request.validatedBody;

    // Check if email already exists
    const existingUser = userDb.findByEmail(data.email);
    if (existingUser) {
      return request.respond({
        status: 409,
        contentType: 'application/json',
        body: {
          error: 'User with this email already exists',
          code: 'USER_EXISTS',
        },
      });
    }

    const user = userDb.create({
      email: data.email,
      username: data.username,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role || 'user',
      status: 'active',
    });

    return request.respond({
      status: 201,
      contentType: 'application/json',
      body: user,
    });
  },

  updateUser: async (request: AuthenticatedRequest) => {
    const { id } = request.validatedPathParams;
    const data = request.validatedBody;

    const user = userDb.findById(id);
    if (!user) {
      return request.respond({
        status: 404,
        contentType: 'application/json',
        body: {
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        },
      });
    }

    const updated = userDb.update(id, data);
    if (!updated) {
      return request.respond({
        status: 404,
        contentType: 'application/json',
        body: {
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        },
      });
    }

    return request.respond({
      status: 200,
      contentType: 'application/json',
      body: updated,
    });
  },

  deleteUser: async (request: AuthenticatedRequest) => {
    const { id } = request.validatedPathParams;

    const user = userDb.findById(id);
    if (!user) {
      return request.respond({
        status: 404,
        contentType: 'application/json',
        body: {
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        },
      });
    }

    userDb.delete(id);

    return request.respond({
      status: 204,
      contentType: 'application/json',
      body: undefined,
    });
  },
};
