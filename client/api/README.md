# `client/api` tests

Two suites live here, and they answer different questions.

**`*_test.go`** are unit tests. They assert what a `Draw*` call puts on the wire, using the
`fakeService` harness in `fake_service_test.go`: a recording `DrawServiceHandler` that
`server.Start` attaches to, so `server.GetClient()` reaches the fake without anything inside
`client/api` being stubbed. No draw service, no disk buffers, no rendered scene. Run them with
`pnpm test:client`.

**`scene_*_test.go`** are not tests. They are scene scripts that draw into a running
visualizer, and `e2e/draw-client.test.ts` invokes them by name with `go test -run` to put
entities on screen before taking a screenshot. Their assertions only check that the RPC did not
error. They are scheduled to be replaced by a scripted binary, at which point this whole set is
deleted.

Add coverage for `client/api` behaviour to the unit tests. Add a scene to the `scene_*` files
only when the e2e needs something new on screen.
