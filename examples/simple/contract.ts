import { createContract } from '../../src/index.ts';
import { z } from 'zod/v4';

/**
 * CalculateRequest schema
 */
const CalculateRequest = z
  .object({
    a: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().min(0).max(100))
      .meta({ title: 'Left Operand', description: 'The left operand for the calculation' }),
    b: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().min(0).max(100))
      .meta({ title: 'Right Operand', description: 'The right operand for the calculation' }),
  })
  .meta({
    title: 'Calculate Request',
    description: 'The request to calculate the sum of two numbers',
  });

/**
 * CalculatePostRequest schema
 */
const CalculatePostRequest = z
  .object({
    a: z
      .number()
      .min(0)
      .max(100)
      .meta({ title: 'Left Operand', description: 'The left operand for the calculation' }),
    b: z
      .number()
      .min(0)
      .max(100)
      .meta({ title: 'Right Operand', description: 'The right operand for the calculation' }),
  })
  .meta({
    title: 'Calculate Post Request',
    description: 'The request to calculate the sum of two numbers',
  });

/**
 * CalculateResponse schema
 */
const CalculateResponse = z
  .object({
    result: z.number().meta({ title: 'Result', description: 'The result of the calculation' }),
  })
  .meta({ title: 'Calculate Response', description: 'The response from the calculation' });

/**
 * CalculateError schema
 */
const CalculateError = z
  .object({
    error: z.string().meta({ title: 'Calculation Error', description: 'The error message' }),
  })
  .meta({ title: 'Calculate Error', description: 'The error from the calculation' });

/**
 * Example Hello World contract
 */
export const contract = createContract({
  getCalculate: {
    path: '/calculate',
    summary: 'Calculate',
    description: 'Calculate the sum of two numbers',
    query: CalculateRequest,
    responses: {
      200: { body: CalculateResponse },
      400: { body: CalculateError },
    },
    tags: ['Calculate API'],
  },
  postCalculate: {
    path: '/calculate',
    method: 'POST',
    summary: 'Calculate',
    description: 'Calculate the sum of two numbers',
    headers: z.object({
      'Content-Type': z.literal('application/json'),
    }),
    request: CalculatePostRequest,
    responses: {
      200: { body: CalculateResponse },
      400: { body: CalculateError },
    },
    tags: ['Calculate API'],
  },
  getDocs: {
    path: '/docs',
    method: 'GET',
    title: 'OpenAPI Documentation',
    description: 'This endpoints provides a public API for the OpenAPI specification',
    summary: 'Get the OpenAPI specification',
    tags: ['Misc'],
    responses: {
      200: {
        body: z
          .string()
          .meta({ description: 'The HTML representation of the OpenAPI specification' }),
      },
    },
  },
});

export default contract;
