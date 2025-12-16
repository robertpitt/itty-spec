import fs from 'fs';

const filePath = 'tests/integration/router.integration.test.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Replace old response format with new content-type map format
// Pattern: responses: { 200: { body: ... } }
// Replace with: responses: { 200: { 'application/json': { body: ... } } }
content = content.replace(
  /responses:\s*{\s*(\d+):\s*{\s*body:/g,
  "responses: { $1: { 'application/json': { body:"
);

// Replace request.json() calls
content = content.replace(
  /request\.json\((\{[^}]*\}),\s*(\d+)\)/g,
  "request.respond({ status: $2, contentType: 'application/json', body: $1 })"
);

// Replace request.error() calls
content = content.replace(
  /request\.error\((\d+),\s*(\{[^}]*\})\)/g,
  "request.respond({ status: $1, contentType: 'application/json', body: $2 })"
);

// Replace request.noContent() calls
content = content.replace(
  /request\.noContent\((\d+)\)/g,
  "request.respond({ status: $1, contentType: 'application/json', body: undefined })"
);

// Handle request.json() with headers (third parameter)
content = content.replace(
  /request\.json\((\{[^}]*\}),\s*(\d+),\s*(\{[^}]*\})\)/g,
  "request.respond({ status: $2, contentType: 'application/json', body: $1, headers: $3 })"
);

// Handle multi-line request.json calls
content = content.replace(
  /request\.json\(\s*(\{[^}]*\}),\s*(\d+)\s*\)/g,
  "request.respond({ status: $2, contentType: 'application/json', body: $1 })"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated test file');

