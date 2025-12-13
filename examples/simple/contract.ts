import { createContract } from '../../src/index.ts';
import { z } from 'zod/v4';

/**
 * Example Hello World contract
 */
export const contract = createContract({
  getCalculate: {
    operationId: 'helloWorld',
    path: '/calculate',
    method: 'GET',
    query: z.object({
      a: z.number().min(0).max(100).meta({ description: 'The first number' }),
      b: z.number().min(0).max(100).meta({ description: 'The second number' }),
    }),
    responses: {
      200: { body: z.object({ result: z.number() }) },
      400: { body: z.object({ error: z.string() }) },
    },
  },
  postCalculate: {
    operationId: 'postCalculate',
    path: '/calculate',
    method: 'POST',
    body: z.object({ a: z.number().min(0).max(100), b: z.number().min(0).max(100) }),
    responses: {
      200: { body: z.object({ result: z.number() }) },
      400: { body: z.object({ error: z.string() }) },
    },
  },
});

export default contract;
