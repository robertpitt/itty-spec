/**
 * Create HTML documentation page using Stoplight Elements
 */
export const createSpotlightElementsHtml = () => `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
      <title>Complex API Documentation</title>
      <script src="https://unpkg.com/@stoplight/elements/web-components.min.js"></script>
      <link rel="stylesheet" href="https://unpkg.com/@stoplight/elements/styles.min.css">
    </head>
    <body>
      <elements-api id="docs" router="hash" layout="sidebar" apiDescriptionUrl="/spec"></elements-api>
    </body>
  </html>`;
