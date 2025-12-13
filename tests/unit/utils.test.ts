import { test, expect } from 'vitest';
import { createBasicResponseHelpers, createResponseHelpers } from '../../src/utils.js';
import type { ContractOperation } from '../../src/types.js';
import { z } from 'zod/v4';

test('createBasicResponseHelpers should create json helper', () => {
  const helpers = createBasicResponseHelpers();
  const response = helpers.json({ message: 'test' }, 200);

  expect(response).toEqual({
    status: 200,
    body: { message: 'test' },
  });
});

test('createBasicResponseHelpers should create json helper with headers', () => {
  const helpers = createBasicResponseHelpers();
  const response = helpers.json({ message: 'test' }, 200, {
    'Content-Type': 'application/json',
  });

  expect(response).toEqual({
    status: 200,
    body: { message: 'test' },
    headers: { 'Content-Type': 'application/json' },
  });
});

test('createBasicResponseHelpers should create noContent helper', () => {
  const helpers = createBasicResponseHelpers();
  const response = helpers.noContent(204);

  expect(response).toEqual({
    status: 204,
    body: undefined,
  });
});

test('createBasicResponseHelpers should create error helper', () => {
  const helpers = createBasicResponseHelpers();
  const response = helpers.error(400, { error: 'Bad request' });

  expect(response).toEqual({
    status: 400,
    body: { error: 'Bad request' },
  });
});

test('createBasicResponseHelpers should create error helper with headers', () => {
  const helpers = createBasicResponseHelpers();
  const response = helpers.error(
    400,
    { error: 'Bad request' },
    {
      'X-Error-Code': 'VALIDATION_ERROR',
    }
  );

  expect(response).toEqual({
    status: 400,
    body: { error: 'Bad request' },
    headers: { 'X-Error-Code': 'VALIDATION_ERROR' },
  });
});

test('createResponseHelpers should create json helper that defaults to 200', () => {
  const operation: ContractOperation = {
    operationId: 'test',
    path: '/test',
    method: 'GET',
    responses: {
      200: { body: z.object({ message: z.string() }) },
    },
  };

  const helpers = createResponseHelpers(operation);
  const response = helpers.json({ message: 'test' });

  expect(response).toEqual({
    status: 200,
    body: { message: 'test' },
  });
});

test('createResponseHelpers should create json helper with explicit status', () => {
  const operation: ContractOperation = {
    operationId: 'test',
    path: '/test',
    method: 'GET',
    responses: {
      200: { body: z.object({ message: z.string() }) },
      201: { body: z.object({ id: z.number() }) },
    },
  };

  const helpers = createResponseHelpers(operation);
  const response = helpers.json({ id: 123 }, 201);

  expect(response).toEqual({
    status: 201,
    body: { id: 123 },
  });
});

test('createResponseHelpers should create json helper with headers', () => {
  const operation: ContractOperation = {
    operationId: 'test',
    path: '/test',
    method: 'GET',
    responses: {
      200: {
        body: z.object({ message: z.string() }),
        headers: z.object({ 'Content-Type': z.string() }),
      },
    },
  };

  const helpers = createResponseHelpers(operation);
  const response = helpers.json({ message: 'test' }, 200, { 'Content-Type': 'application/json' });

  expect(response).toEqual({
    status: 200,
    body: { message: 'test' },
    headers: { 'Content-Type': 'application/json' },
  });
});

test('createResponseHelpers should create noContent helper', () => {
  const operation: ContractOperation = {
    operationId: 'test',
    path: '/test',
    method: 'DELETE',
    responses: {
      204: { body: z.never() },
    },
  };

  const helpers = createResponseHelpers(operation);
  const response = helpers.noContent(204);

  expect(response).toEqual({
    status: 204,
    body: undefined,
  });
});

test('createResponseHelpers should create error helper', () => {
  const operation: ContractOperation = {
    operationId: 'test',
    path: '/test',
    method: 'GET',
    responses: {
      200: { body: z.object({ message: z.string() }) },
      400: { body: z.object({ error: z.string() }) },
    },
  };

  const helpers = createResponseHelpers(operation);
  const response = helpers.error(400, { error: 'Bad request' });

  expect(response).toEqual({
    status: 400,
    body: { error: 'Bad request' },
  });
});

test('createResponseHelpers should create error helper with headers', () => {
  const operation: ContractOperation = {
    operationId: 'test',
    path: '/test',
    method: 'GET',
    responses: {
      200: { body: z.object({ message: z.string() }) },
      400: {
        body: z.object({ error: z.string() }),
        headers: z.object({ 'X-Error-Code': z.string() }),
      },
    },
  };

  const helpers = createResponseHelpers(operation);
  const response = helpers.error(
    400,
    { error: 'Bad request' },
    {
      'X-Error-Code': 'VALIDATION_ERROR',
    }
  );

  expect(response).toEqual({
    status: 400,
    body: { error: 'Bad request' },
    headers: { 'X-Error-Code': 'VALIDATION_ERROR' },
  });
});
