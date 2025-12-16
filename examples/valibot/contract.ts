import { createContract } from '../../src/index';
import * as v from 'valibot';

/**
 * CalculateRequest schema
 */
const CalculateRequest = v.pipe(
  v.object({
    /* This is the left operand for the calculation */
    a: v.pipe(
      v.string(),
      v.toNumber(),
      v.minValue(0),
      v.maxValue(100),
      v.title('Left Operand'),
      v.description('The left operand for the calculation')
    ),
    /* This is the right operand for the calculation */
    b: v.pipe(
      v.string(),
      v.toNumber(),
      v.minValue(0),
      v.maxValue(100),
      v.title('Right Operand'),
      v.description('The right operand for the calculation')
    ),
  }),
  v.title('Calculate Request'),
  v.description('The request to calculate the sum of two numbers')
);

/**
 * CalculatePostRequest schema
 */
const CalculatePostRequest = v.pipe(
  v.object({
    a: v.pipe(
      v.number(),
      v.minValue(0),
      v.maxValue(100),
      v.title('Left Operand'),
      v.description('The left operand for the calculation')
    ),
    b: v.pipe(
      v.number(),
      v.minValue(0),
      v.maxValue(100),
      v.title('Right Operand'),
      v.description('The right operand for the calculation')
    ),
  }),
  v.title('Calculate Post Request'),
  v.description('The request to calculate the sum of two numbers')
);

/**
 * CalculateResponse schema
 */
const CalculateResponse = v.pipe(
  v.object({
    result: v.pipe(v.number(), v.title('Result'), v.description('The result of the calculation')),
  }),
  v.title('Calculate Response'),
  v.description('The response from the calculation')
);

/**
 * CalculateError schema
 */
const CalculateError = v.pipe(
  v.object({
    error: v.pipe(v.string(), v.title('Calculation Error'), v.description('The error message')),
  }),
  v.title('Calculate Error'),
  v.description('The error from the calculation')
);

/**
 * CalculateResponseHTML schema
 */
const CalculateResponseHTML = v.pipe(
  v.string(),
  v.title('Calculate Response HTML'),
  v.description('The HTML representation of the calculation result')
);

/**
 * CalculateResponseXML schema
 */
const CalculateResponseXML = v.pipe(
  v.string(),
  v.title('Calculate Response XML'),
  v.description('The XML representation of the calculation result')
);

/**
 * CalculateErrorHTML schema
 */
const CalculateErrorHTML = v.pipe(
  v.string(),
  v.title('Calculate Error HTML'),
  v.description('The HTML representation of the calculation error')
);

/**
 * CalculateErrorXML schema
 */
const CalculateErrorXML = v.pipe(
  v.string(),
  v.title('Calculate Error XML'),
  v.description('The XML representation of the calculation error')
);

/**
 * GetDocsResponse schema
 */
const GetDocsResponse = v.pipe(
  v.string(),
  v.title('Get Docs Response'),
  v.description('The response from the get docs endpoint')
);

/**
 * Example Hello World contract using Valibot
 */
export const contract = createContract({
  getCalculate: {
    path: '/calculate',
    method: 'GET',
    summary: 'Calculate',
    description: 'Calculate the sum of two numbers',
    query: CalculateRequest,
    headers: v.object({
      'content-type': v.union([
        v.literal('application/json'),
        v.literal('text/html'),
        v.literal('application/xml'),
      ]),
    }),
    responses: {
      200: {
        'application/json': {
          body: CalculateResponse,
          headers: v.object({ 'content-type': v.literal('application/json') }),
        },
        'text/html': {
          body: CalculateResponseHTML,
          headers: v.object({ 'content-type': v.literal('text/html') }),
        },
        'application/xml': {
          body: CalculateResponseXML,
          headers: v.object({ 'content-type': v.literal('application/xml') }),
        },
      },
      400: {
        'application/json': {
          body: CalculateError,
          headers: v.object({ 'content-type': v.literal('application/json') }),
        },
        'text/html': {
          body: CalculateErrorHTML,
          headers: v.object({ 'content-type': v.literal('text/html') }),
        },
        'application/xml': {
          body: CalculateErrorXML,
          headers: v.object({ 'content-type': v.literal('application/xml') }),
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
    headers: v.object({
      accept: v.optional(
        v.union([v.literal('application/json'), v.literal('application/multipart-form-data')])
      ),
    }),
    requests: {
      'application/json': { body: CalculatePostRequest },
      'application/multipart-form-data': {
        body: v.pipe(
          v.string(),
          v.transform((val) => {
            const params = new URLSearchParams(val);
            return {
              a: parseInt(params.get('a') || '0', 10),
              b: parseInt(params.get('b') || '0', 10),
            };
          }),
          CalculatePostRequest
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
          headers: v.object({ 'content-type': v.literal('text/html') }),
        },
      },
    },
  },
});

export default contract;
