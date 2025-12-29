import { userDb } from '../utils/database';
import { paginate } from '../utils/pagination';
import { usersContract } from '../contracts/users.contract';
import { defineHandlers } from '../../../src/handler';

/**
 * User handlers - implement all user-related endpoints
 * Each handler is typed against its contract operation for full type safety
 */

export const userHandlers = defineHandlers(usersContract, {
  getUsers: async (request) => {
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

  getUserById: async (request) => {
    const { id } = request.validatedParams;
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

  createUser: async (request) => {
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

  updateUser: async (request) => {
    const { id } = request.validatedParams;
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

  deleteUser: async (request) => {
    const { id } = request.validatedParams;

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
});
