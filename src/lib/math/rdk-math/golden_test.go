package rdkmath

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"go.viam.com/test"
)

// goldenDir holds the files the TypeScript suites in src/lib/math/__tests__ check themselves
// against. Regenerate them with `pnpm test:rdk-golden` and commit the result. A change to one of
// these files is a change to the contract between a hand port and the RDK code it was copied from,
// so it belongs in a diff someone reads.
const goldenDir = "testdata"

// writeGolden serializes payload to goldenDir/name, indented and newline-terminated so that a
// regeneration reads as a reviewable diff rather than one reflowed line.
func writeGolden(t *testing.T, name string, payload any) {
	t.Helper()

	err := os.MkdirAll(goldenDir, 0o755)
	test.That(t, err, test.ShouldBeNil)

	encoded, err := json.MarshalIndent(payload, "", "\t")
	test.That(t, err, test.ShouldBeNil)

	err = os.WriteFile(filepath.Join(goldenDir, name), append(encoded, '\n'), 0o644)
	test.That(t, err, test.ShouldBeNil)
}
