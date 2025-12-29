# File Upload Example

Demonstrates handling file uploads with multipart form data.

## Overview

This example shows:
- Handling multipart form data
- File validation
- File storage patterns
- Response with file metadata

## Contract Definition

```ts
const contract = createContract({
  uploadFile: {
    path: "/files",
    method: "POST",
    requests: {
      "multipart/form-data": {
        body: z.object({
          file: z.instanceof(File),
          description: z.string().optional(),
        }),
      },
    },
    responses: {
      201: {
        "application/json": {
          body: z.object({
            id: z.string(),
            filename: z.string(),
            size: z.number(),
            uploadedAt: z.string(),
          }),
        },
      },
      400: {
        "application/json": {
          body: z.object({ error: z.string() }),
        },
      },
    },
  },
});
```

## Handler Implementation

```ts
const handler = async (request) => {
  const formData = await request.formData();
  const file = formData.get("file") as File;
  const description = formData.get("description") as string;
  
  // Validate file
  if (!file) {
    return request.respond({
      status: 400,
      contentType: "application/json",
      body: { error: "File is required" },
    });
  }
  
  // Validate file size
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return request.respond({
      status: 400,
      contentType: "application/json",
      body: { error: "File too large. Maximum size is 10MB" },
    });
  }
  
  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return request.respond({
      status: 400,
      contentType: "application/json",
      body: { error: "Invalid file type. Allowed types: JPEG, PNG, GIF" },
    });
  }
  
  // Save file
  const fileId = await saveFile(file, description);
  
  return request.respond({
    status: 201,
    contentType: "application/json",
    body: {
      id: fileId,
      filename: file.name,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    },
  });
};
```

## File Storage

```ts
async function saveFile(file: File, description?: string): Promise<string> {
  const fileId = crypto.randomUUID();
  const buffer = await file.arrayBuffer();
  
  // Save to storage (implementation depends on environment)
  // Cloudflare Workers: Use R2
  // Node.js: Use filesystem or S3
  // etc.
  
  await storage.put(fileId, buffer, {
    metadata: {
      filename: file.name,
      contentType: file.type,
      description,
    },
  });
  
  return fileId;
}
```

## Testing

### Upload File

```bash
curl -X POST "http://localhost:3000/files" \
  -F "file=@image.jpg" \
  -F "description=Profile picture"
```

### With JavaScript

```ts
const formData = new FormData();
formData.append("file", fileInput.files[0]);
formData.append("description", "Profile picture");

const response = await fetch("/files", {
  method: "POST",
  body: formData,
});

const result = await response.json();
```

## Related

- [Content Types Guide](/guide/content-types) - Learn about content types
- [Advanced Patterns](/guide/advanced-patterns) - More advanced patterns

