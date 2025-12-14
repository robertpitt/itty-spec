import { contract } from './contract';
import { contractRouter } from '../../src/index.ts';

const router = contractRouter({
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
