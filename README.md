## Getting started

1. [Install pnpm](https://pnpm.io/installation)
2. [Install bun](https://bun.sh/docs/installation)
3. Install dependencies: `pnpm i`
4. Run local app server: `pnpm dev`

To visit the visualizer, go to `http://localhost:5173/`

Open the machine config page (bottom right) and enter in connection details to visualize a specific machine.

## Env files

To add a list of connection configs in an `.env.local` file, use the following format:

```
VITE_CONFIGS='
{
  "fleet-rover-01": {
    "host": "fleet-rover-01-main.ve4ba7w5qr.viam.cloud",
    "partId": "myPartID",
    "apiKeyId": "myApiKeyId",
    "apiKeyValue": "MyApiKeyValue",
    "signalingAddress": "https://app.viam.com:443"
  }
}
```
