import { defineConfig } from "@hey-api/openapi-ts"

export default defineConfig({
    client: "axios",
    input: "https://api.jutge.org/openapi.json",
    base: "https://api.jutge.org",
    output: "src/client",
})
