import { defineConfig } from "@hey-api/openapi-ts"

export default defineConfig({
    client: "axios",
    input: "https://api.jutge.org/v1/openapi.json",
    base: "https://api.jutge.org/v1",
    output: "src/client",
})
