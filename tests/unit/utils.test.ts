import { test, expect } from 'vitest';
import {
  createBasicResponseHelpers,
  createResponseHelpers,
  getResponseSchemaForContentType,
} from '../../src/utils.js';
import type { ContractOperation, ResponseByContentType } from '../../src/types.js';
import * as v from 'valibot';

test('createBasicResponseHelpers should create respond helper', () => {
  const helpers = createBasicResponseHelpers();
  const response = helpers.respond({
    status: 200,
    contentType: 'application/json',
    body: { message: 'test' },
  });

  expect(response.status).toBe(200);
  expect(response.body).toEqual({ message: 'test' });
  expect(response.headers).toBeDefined();
  const headers = response.headers as Headers;
  expect(headers.get('content-type')).toBe('application/json');
});

test('createBasicResponseHelpers should create respond helper with headers', () => {
  const helpers = createBasicResponseHelpers();
  const response = helpers.respond({
    status: 200,
    contentType: 'application/json',
    body: { message: 'test' },
    headers: {
      'x-custom-header': 'value',
    },
  });

  expect(response.status).toBe(200);
  expect(response.body).toEqual({ message: 'test' });
  expect(response.headers).toBeDefined();
  const headers = response.headers as Headers;
  expect(headers.get('content-type')).toBe('application/json');
  expect(headers.get('x-custom-header')).toBe('value');
});

test('createBasicResponseHelpers should handle no content response', () => {
  const helpers = createBasicResponseHelpers();
  const response = helpers.respond({
    status: 204,
    contentType: 'application/json',
  });

  expect(response.status).toBe(204);
  expect(response.body).toBeUndefined();
});

test('createResponseHelpers should create respond helper', () => {
  const operation: ContractOperation = {
    operationId: 'test',
    path: '/test',
    method: 'GET',
    responses: {
      200: { 'application/json': { body: v.object({ message: v.string() }) } },
    },
  };

  const helpers = createResponseHelpers(operation);
  const response = helpers.respond({
    status: 200,
    contentType: 'application/json',
    body: { message: 'test' },
  });

  expect(response.status).toBe(200);
  expect(response.body).toEqual({ message: 'test' });
  expect(response.headers).toBeDefined();
  const headers = response.headers as Headers;
  expect(headers.get('content-type')).toBe('application/json');
});

test('createResponseHelpers should create respond helper with explicit status', () => {
  const operation: ContractOperation = {
    operationId: 'test',
    path: '/test',
    method: 'GET',
    responses: {
      200: { 'application/json': { body: v.object({ message: v.string() }) } },
      201: { 'application/json': { body: v.object({ id: v.number() }) } },
    },
  };

  const helpers = createResponseHelpers(operation);
  const response = helpers.respond({
    status: 201,
    contentType: 'application/json',
    body: { id: 123 },
  });

  expect(response.status).toBe(201);
  expect(response.body).toEqual({ id: 123 });
  expect(response.headers).toBeDefined();
  const headers = response.headers as Headers;
  expect(headers.get('content-type')).toBe('application/json');
});

test('createResponseHelpers should create respond helper with headers', () => {
  const operation: ContractOperation = {
    operationId: 'test',
    path: '/test',
    method: 'GET',
    responses: {
      200: {
        'application/json': {
          body: v.object({ message: v.string() }),
          headers: v.object({ 'content-type': v.string() }),
        },
      },
    },
  };

  const helpers = createResponseHelpers(operation);
  const response = helpers.respond({
    status: 200,
    contentType: 'application/json',
    body: { message: 'test' },
    headers: { 'content-type': 'application/json' },
  });

  expect(response.status).toBe(200);
  expect(response.body).toEqual({ message: 'test' });
  expect(response.headers).toBeDefined();
  const headers = response.headers as Headers;
  expect(headers.get('content-type')).toBe('application/json');
});

test('createResponseHelpers should handle no content response', () => {
  const operation: ContractOperation = {
    operationId: 'test',
    path: '/test',
    method: 'DELETE',
    responses: {
      204: { 'application/json': { body: v.never() } },
    },
  };

  const helpers = createResponseHelpers(operation);
  const response = helpers.respond({
    status: 204,
    contentType: 'application/json',
  });

  expect(response.status).toBe(204);
  expect(response.body).toBeUndefined();
});

test('createResponseHelpers should create error response', () => {
  const operation: ContractOperation = {
    operationId: 'test',
    path: '/test',
    method: 'GET',
    responses: {
      200: { 'application/json': { body: v.object({ message: v.string() }) } },
      400: { 'application/json': { body: v.object({ error: v.string() }) } },
    },
  };

  const helpers = createResponseHelpers(operation);
  const response = helpers.respond({
    status: 400,
    contentType: 'application/json',
    body: { error: 'Bad request' },
  });

  expect(response.status).toBe(400);
  expect(response.body).toEqual({ error: 'Bad request' });
  expect(response.headers).toBeDefined();
  const headers = response.headers as Headers;
  expect(headers.get('content-type')).toBe('application/json');
});

test('createResponseHelpers should create error response with headers', () => {
  const operation: ContractOperation = {
    operationId: 'test',
    path: '/test',
    method: 'GET',
    responses: {
      200: { 'application/json': { body: v.object({ message: v.string() }) } },
      400: {
        'application/json': {
          body: v.object({ error: v.string() }),
          headers: v.object({ 'X-Error-Code': v.string() }),
        },
      },
    },
  };

  const helpers = createResponseHelpers(operation);
  const response = helpers.respond({
    status: 400,
    contentType: 'application/json',
    body: { error: 'Bad request' },
    headers: {
      'X-Error-Code': 'VALIDATION_ERROR',
    },
  });

  expect(response.status).toBe(400);
  expect(response.body).toEqual({ error: 'Bad request' });
  expect(response.headers).toBeDefined();
  const headers = response.headers as Headers;
  expect(headers.get('X-Error-Code')).toBe('VALIDATION_ERROR');
  expect(headers.get('content-type')).toBe('application/json');
});

describe('Content type helpers', () => {
  test('getResponseSchemaForContentType should extract schema for content type', () => {
    const contentTypeMap: ResponseByContentType = {
      'application/json': { body: v.object({ result: v.number() }) },
      'text/html': { body: v.string() },
    };

    const jsonSchema = getResponseSchemaForContentType(contentTypeMap, 'application/json');
    expect(jsonSchema).toBeDefined();
    expect(jsonSchema?.body).toBe(contentTypeMap['application/json'].body);

    const htmlSchema = getResponseSchemaForContentType(contentTypeMap, 'text/html');
    expect(htmlSchema).toBeDefined();
    expect(htmlSchema?.body).toBe(contentTypeMap['text/html'].body);
  });

  test('getResponseSchemaForContentType should return null for missing content type', () => {
    const contentTypeMap: ResponseByContentType = {
      'application/json': { body: v.object({ result: v.number() }) },
    };

    const schema = getResponseSchemaForContentType(contentTypeMap, 'text/xml');
    expect(schema).toBeNull();
  });
});

describe('Content-type-specific response helpers', () => {
  test('createResponseHelpers should support multiple content types', () => {
    const operation: ContractOperation = {
      operationId: 'test',
      path: '/test',
      method: 'GET',
      responses: {
        200: {
          'application/json': { body: v.object({ result: v.number() }) },
          'text/html': { body: v.string() },
          'application/xml': { body: v.string() },
        },
      },
    };

    const helpers = createResponseHelpers(operation);
    const jsonResponse = helpers.respond({
      status: 200,
      contentType: 'application/json',
      body: { result: 42 },
    });
    expect(jsonResponse.status).toBe(200);
    expect(jsonResponse.body).toEqual({ result: 42 });
    expect(jsonResponse.headers).toBeDefined();
    const jsonHeaders = jsonResponse.headers as Headers;
    expect(jsonHeaders.get('content-type')).toBe('application/json');

    const htmlResponse = helpers.respond({
      status: 200,
      contentType: 'text/html',
      body: '<div>Hello</div>',
    });
    expect(htmlResponse.status).toBe(200);
    expect(htmlResponse.body).toBe('<div>Hello</div>');
    expect(htmlResponse.headers).toBeDefined();
    const htmlHeaders = htmlResponse.headers as Headers;
    expect(htmlHeaders.get('content-type')).toBe('text/html; charset=utf-8');
  });

  test('createResponseHelpers should set content-type header correctly', () => {
    const operation: ContractOperation = {
      operationId: 'test',
      path: '/test',
      method: 'GET',
      responses: {
        200: {
          'application/xml': { body: v.string() },
        },
      },
    };

    const helpers = createResponseHelpers(operation);
    const response = helpers.respond({
      status: 200,
      contentType: 'application/xml',
      body: '<xml></xml>',
    });
    const headers = response.headers as Headers;
    expect(headers.get('content-type')).toBe('application/xml');
  });
});
