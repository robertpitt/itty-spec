import { createContract } from '../../src/index.ts';
import { z } from 'zod/v4';

/**
 * CalculateRequest schema
 */
const CalculateRequest = z
  .object({
    /* This is the left operand for the calculation */
    a: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().min(0).max(100))
      .meta({ title: 'Left Operand', description: 'The left operand for the calculation' }),
    /* This is the right operand for the calculation */
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
 * CalculateResponseHTML schema
 */
const CalculateResponseHTML = z.string().meta({
  title: 'Calculate Response HTML',
  description: 'The HTML representation of the calculation result',
});

/**
 * CalculateResponseXML schema
 */
const CalculateResponseXML = z.string().meta({
  title: 'Calculate Response XML',
  description: 'The XML representation of the calculation result',
});

/**
 * CalculateErrorHTML schema
 */
const CalculateErrorHTML = z.string().meta({
  title: 'Calculate Error HTML',
  description: 'The HTML representation of the calculation error',
});

/**
 * CalculateErrorXML schema
 */
const CalculateErrorXML = z.string().meta({
  title: 'Calculate Error XML',
  description: 'The XML representation of the calculation error',
});

/**
 * GetDocsResponse schema
 */
const GetDocsResponse = z
  .string()
  .meta({ title: 'OpenAPI Specification', description: 'The OpenAPI specification' })
  .meta({
    title: 'Get Docs Response',
    description: 'The response from the get docs endpoint',
  });

/**
 * Example Hello World contract
 */
export const contract = createContract({
  getCalculate: {
    path: '/calculate',
    method: 'GET',
    summary: 'Calculate',
    description: 'Calculate the sum of two numbers',
    query: CalculateRequest,
    headers: z.object({
      'content-type': z.union([
        z.literal('application/json'),
        z.literal('text/html'),
        z.literal('application/xml'),
      ]),
    }),
    responses: {
      200: {
        'application/json': {
          body: CalculateResponse.extend({ test: z.number().min(0).max(100) }),
          headers: z.object({ 'content-type': z.literal('application/json') }),
        },
        'text/html': {
          body: CalculateResponseHTML,
          headers: z.object({ 'content-type': z.literal('text/html') }),
        },
        'application/xml': {
          body: CalculateResponseXML,
          headers: z.object({ 'content-type': z.literal('application/xml') }),
        },
      },
      400: {
        'application/json': {
          body: CalculateError,
          headers: z.object({ 'content-type': z.literal('application/json') }),
        },
        'text/html': {
          body: CalculateErrorHTML,
          headers: z.object({ 'content-type': z.literal('text/html') }),
        },
        'application/xml': {
          body: CalculateErrorXML,
          headers: z.object({ 'content-type': z.literal('application/xml') }),
        },
      },
    },
    tags: ['Calculate API'],
  },
  postCalculate: {
    path: '/calculate',
    method: 'POST',
    summary: 'Calculate',
    description: 'Calculate the sum of two numbers',
    headers: z.object({
      accept: z.enum(['application/json', 'application/multipart-form-data']).optional(),
    }),
    requests: {
      'application/json': { body: CalculatePostRequest },
      'application/multipart-form-data': {
        body: z.codec(
          z.string().min(1).max(10000),
          z.object({
            a: z.string().transform((val) => parseInt(val, 10)),
            b: z.string().transform((val) => parseInt(val, 10)),
          }),
          {
            decode: (val) =>
              Object.fromEntries(new URLSearchParams(val).entries()) as unknown as {
                a: string;
                b: string;
                [x: string]: string;
              },
            encode: (val) =>
              new URLSearchParams(val as unknown as Record<string, string>).toString(),
          }
        ),
      },
    },
    responses: {
      200: {
        'application/json': { body: CalculateResponse },
        'text/html': { body: CalculateResponseHTML },
        'application/xml': { body: CalculateResponseXML },
      },
      400: {
        'application/json': { body: CalculateError },
        'text/html': { body: CalculateErrorHTML },
        'application/xml': { body: CalculateErrorXML },
      },
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
        'text/html': {
          body: GetDocsResponse,
          headers: z.object({ 'content-type': z.literal('text/html') }),
        },
      },
    },
  },
});

export default contract;
