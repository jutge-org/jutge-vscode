#!/bin/bash
set -e
http -d GET https://api.jutge.org/clients/download/typescript -o jutge_api_client.ts
# Prepend `// @ts-nocheck` so type errors in this auto-generated file
# do not leak into our own type-check output. The matching ESLint ignore
# lives in eslint.config.js.
{ echo '// @ts-nocheck'; cat jutge_api_client.ts; } > jutge_api_client.ts.tmp
mv jutge_api_client.ts.tmp jutge_api_client.ts
