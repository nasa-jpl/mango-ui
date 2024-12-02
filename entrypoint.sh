#!/bin/sh

# Replace the API URL placeholder in the distribution files with the runtime API URL
find /app/dist/assets -type f -name "*.js" -exec sed -i \
  -e "s@{PLACEHOLDER_MANGO_DOCS_URL}@${VITE_MANGO_DOCS_URL}@g" \
  -e "s@{PLACEHOLDER_API_URL}@${VITE_API_URL}@g" {} +

exec "$@"
