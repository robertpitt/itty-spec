import type { OpenAPIV3_1 } from 'openapi-types';

/**
 * We use an embedded elements
 */
export const createSpotlightElementsHtml = (openApiSpecification: OpenAPIV3_1.Document) => `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
      <title>API Documentation</title>
      <script src="https://unpkg.com/@stoplight/elements/web-components.min.js"></script>
      <link rel="stylesheet" href="https://unpkg.com/@stoplight/elements/styles.min.css">
    </head>
    <body>
      <elements-api id="docs" router="hash" layout="sidebar"></elements-api>
      <script>
      (async () => {
        const docs = document.getElementById('docs');
        docs.apiDescriptionDocument = ${JSON.stringify(openApiSpecification)};;
      })();
      </script>
    </body>
  </html>`;

/**
 * Format calculation result as XML
 */
export const formatCalculateResponseXML = (result: number) =>
  `<?xml version="1.0" encoding="UTF-8"?>
<calculate>
  <result>${result}</result>
</calculate>`;

/**
 * Format calculation error as XML
 */
export const formatCalculateErrorXML = (error: string) =>
  `<?xml version="1.0" encoding="UTF-8"?>
<error>
  <message>${error}</message>
</error>`;

/**
 * Format calculation result as HTML
 */
export const formatCalculateResponseHTML = (result: number) =>
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Calculation Result</title>
    <style>
      body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
      .result { background-color: #f0f0f0; padding: 20px; border-radius: 5px; }
      h1 { color: #333; }
    </style>
  </head>
  <body>
    <h1>Calculation Result</h1>
    <div class="result">
      <p><strong>Result:</strong> ${result}</p>
    </div>
  </body>
</html>`;

/**
 * Format calculation error as HTML
 */
export const formatCalculateErrorHTML = (error: string) =>
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Calculation Error</title>
    <style>
      body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
      .error { background-color: #fee; padding: 20px; border-radius: 5px; border: 1px solid #fcc; }
      h1 { color: #c33; }
    </style>
  </head>
  <body>
    <h1>Calculation Error</h1>
    <div class="error">
      <p><strong>Error:</strong> ${error}</p>
    </div>
  </body>
</html>`;

/**
 * Get preferred content type from Accept header
 */
export const getPreferredContentType = (
  acceptHeader: string | null | undefined,
  defaultType: string = 'application/json'
): string => {
  if (!acceptHeader) {
    return defaultType;
  }

  const acceptTypes = acceptHeader.split(',').map((type) => type.split(';')[0].trim());

  if (acceptTypes.some((type) => type.includes('text/html'))) {
    return 'text/html';
  }
  if (acceptTypes.some((type) => type.includes('application/xml') || type.includes('text/xml'))) {
    return 'application/xml';
  }
  if (acceptTypes.some((type) => type.includes('application/json'))) {
    return 'application/json';
  }

  return defaultType;
};
