## Getting started

1. [Install pnpm](https://pnpm.io/installation)
2. [Install bun](https://bun.sh/docs/installation)
3. Install dependencies: `pnpm i`
4. Run local app server: `pnpm dev`

To visit the visualizer, go to `http://localhost:5173/`

Open the machine config page (bottom right) and enter in connection details to visualize a specific machine.

## Todo

- animated sequence
- double click to set trackball center
- Give error logs
- default pointcloud color
- remote IP access
- ortho points are messed up size-wise
- geometries parented to parent
- end effector pose visualized
- poses of all frames
- bounding boxes should include just the thing and not children
- configure frames from here
- color pallet for resource to color

## Env files

To add a list of connection configs in an env file, use the following format:

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
