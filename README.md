## Getting started

1. [Install pnpm](https://pnpm.io/installation)
2. [Install bun](https://bun.sh/docs/installation)
3. Install dependencies: `pnpm i`
4. Run local app server: `pnpm dev`

To visit the visualizer, go to `http://localhost:5173/`

Open the machine config page (bottom right) and enter in connection details to visualize a specific machine.

## Todo

----- hard -----

- animated sequence of motion plan
- Give better fetching / connection state info
- configure frames in app
- embed in teleop

----- medium -----

- remote IP access when custom drawing, to draw on remote computers
- geometries need to be parented to parent
- color pallet for resource to color
- measurement tool

----- easy ------

- double click to set trackball center in object view
- Set default pointcloud color in settings
- points are not sized right in ortho cam view
- bounding boxes should include just the thing and not children

--- action items ----

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
