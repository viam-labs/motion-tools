package rdkmath

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/golang/geo/r3"
	sm "go.viam.com/rdk/spatialmath"
	"go.viam.com/test"
)

// goldenPath is read by src/lib/math/__tests__/inferGeometry.spec.ts, which asserts that the
// TypeScript port of this inference agrees with what RDK resolved here. Regenerate it with
// `pnpm test:rdk-golden` and commit the result; a change to the file is a change to the contract.
const goldenPath = "testdata/geometry_infer_golden.json"

// goldenCase pairs the wire JSON a config serializes to with the geometry type RDK resolved it to.
// An empty resolvedType means ParseConfig yielded no geometry at all.
type goldenCase struct {
	Name         string          `json:"name"`
	Geometry     json.RawMessage `json:"geometry"`
	ResolvedType string          `json:"resolvedType"`
}

type goldenFile struct {
	Source string       `json:"source"`
	Cases  []goldenCase `json:"cases"`
}

// TestGeometryInferGolden pins how spatialmath.GeometryConfig.ParseConfig resolves a geometry type,
// and writes those verdicts to goldenPath for the TypeScript port to check itself against.
func TestGeometryInferGolden(t *testing.T) {
	translation := r3.Vector{X: 1, Y: 1, Z: 1}

	testCases := []struct {
		name   string
		config sm.GeometryConfig
		want   string
	}{
		{"declared box", sm.GeometryConfig{Type: "box", X: 1, Y: 1, Z: 1, TranslationOffset: translation}, "box"},
		{"declared box with a zero side", sm.GeometryConfig{Type: "box", X: 1, Y: 0, Z: 1}, "box"},
		{"declared box with a negative side", sm.GeometryConfig{Type: "box", X: 1, Y: 0, Z: -1}, ""},
		{"declared sphere", sm.GeometryConfig{Type: "sphere", R: 1, TranslationOffset: translation}, "sphere"},
		{"declared sphere with a negative radius", sm.GeometryConfig{Type: "sphere", R: -1}, ""},
		{"declared capsule", sm.GeometryConfig{Type: "capsule", R: 1, L: 4}, "capsule"},
		{"declared cylinder", sm.GeometryConfig{Type: "cylinder", R: 1, L: 4}, "cylinder"},
		{"declared point", sm.GeometryConfig{Type: "point", TranslationOffset: translation}, "point"},
		{"unrecognized declared type", sm.GeometryConfig{Type: "bad"}, ""},

		{"infer box from all three dimensions", sm.GeometryConfig{X: 1, Y: 1, Z: 1}, "box"},
		{"infer box from a single dimension", sm.GeometryConfig{X: 1}, "box"},
		{"infer box before capsule", sm.GeometryConfig{X: 1, Y: 1, Z: 1, R: 1, L: 4}, "box"},
		{"infer box before sphere", sm.GeometryConfig{X: 1, Y: 1, Z: 1, R: 1}, "box"},
		{"infer capsule from length and radius", sm.GeometryConfig{R: 1, L: 4, TranslationOffset: translation}, "capsule"},
		{"infer capsule with no radius", sm.GeometryConfig{L: 4}, ""},
		{"infer capsule shorter than its diameter", sm.GeometryConfig{R: 1, L: 1}, ""},
		{"infer capsule whose length equals its diameter", sm.GeometryConfig{R: 1, L: 2}, "sphere"},
		{"infer sphere from radius", sm.GeometryConfig{R: 1}, "sphere"},
		{"infer sphere from a negative radius", sm.GeometryConfig{R: -1}, ""},
		{"infer nothing from an empty config", sm.GeometryConfig{}, ""},
	}

	golden := goldenFile{
		Source: "go.viam.com/rdk spatialmath.GeometryConfig.ParseConfig",
		Cases:  make([]goldenCase, 0, len(testCases)),
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			wire, err := json.Marshal(testCase.config)
			test.That(t, err, test.ShouldBeNil)

			test.That(t, resolveGeometryType(t, testCase.config), test.ShouldEqual, testCase.want)

			golden.Cases = append(golden.Cases, goldenCase{
				Name:         testCase.name,
				Geometry:     wire,
				ResolvedType: testCase.want,
			})
		})
	}

	writeGolden(t, golden)
}

// resolveGeometryType reports the type RDK settles a config on, or "" when it builds no geometry.
// ParseConfig returns the shape rather than its name, so the round trip through NewGeometryConfig
// is what recovers the name — including the case where NewCapsule quietly hands back a sphere.
func resolveGeometryType(t *testing.T, config sm.GeometryConfig) string {
	t.Helper()

	geometry, err := config.ParseConfig()
	if err != nil {
		return ""
	}

	resolved, err := sm.NewGeometryConfig(geometry)
	test.That(t, err, test.ShouldBeNil)
	return string(resolved.Type)
}

func writeGolden(t *testing.T, golden goldenFile) {
	t.Helper()

	err := os.MkdirAll(filepath.Dir(goldenPath), 0o755)
	test.That(t, err, test.ShouldBeNil)

	encoded, err := json.MarshalIndent(golden, "", "\t")
	test.That(t, err, test.ShouldBeNil)

	err = os.WriteFile(goldenPath, append(encoded, '\n'), 0o644)
	test.That(t, err, test.ShouldBeNil)
}
