import { contract } from './contract';
import { createRouter } from '../../src/index.ts';

const router = createRouter({
  contract,
  handlers: {
    getCalculate: async (request) => {
      const result = request.validatedQuery.a + request.validatedQuery.b;
      return result > 100
        ? request.json({ error: 'Invalid request' }, 400)
        : request.json({ result: result }, 200);
    },
    postCalculate: async (request) => {
      const result = request.validatedBody.a + request.validatedBody.b;
      return result > 100
        ? request.json({ error: 'Invalid request' }, 400)
        : request.json({ result: result }, 200);
    },
  },
});

/**
 * Example of incoming request
 */
router.fetch(new Request('http://localhost:3000/calculate?a=1&b=2'), {
  method: 'GET',
});
