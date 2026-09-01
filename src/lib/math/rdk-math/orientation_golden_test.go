package rdkmath

import (
	"encoding/json"
	"io"
	"math"
	"os"
	"testing"

	"go.viam.com/utils"

	"go.viam.com/test"

	sm "go.viam.com/rdk/spatialmath"
)

// orientationGoldenName is read by src/lib/math/__tests__/orientationJson.spec.ts, which asserts
// that `quatFromJson` builds the same rotation OrientationConfig.ParseConfig does.
const orientationGoldenName = "orientation_json_golden.json"

// goldenQuaternion names the components of a quat.Number, whose own fields are Real/Imag/Jmag/Kmag.
// Three.js orders a quaternion (x, y, z, w) and RDK writes the scalar first, so spelling each one
// out is what keeps a reader of the golden file from having to know which convention it used.
type goldenQuaternion struct {
	W float64 `json:"w"`
	X float64 `json:"x"`
	Y float64 `json:"y"`
	Z float64 `json:"z"`
}

// orientationGoldenCase pairs an orientation config, byte for byte as RDK read it, with the
// rotation RDK derived from it. A nil Quaternion means ParseConfig returned an error.
type orientationGoldenCase struct {
	Name        string            `json:"name"`
	Orientation json.RawMessage   `json:"orientation"`
	Quaternion  *goldenQuaternion `json:"quaternion"`
}

type orientationGoldenFile struct {
	Source string                  `json:"source"`
	Cases  []orientationGoldenCase `json:"cases"`
}

// orientationCase is either a typed orientation RDK will encode itself, or raw config JSON for the
// inputs no Go value can express, paired with the rotation RDK has to derive from it.
type orientationCase struct {
	name  string
	value sm.Orientation
	raw   json.RawMessage
	// expected is nil when ParseConfig has to derive no orientation at all. Four of these are
	// quat_test.go's own literals, independent of anything RDK computes today. The rest are frozen
	// from rdk v1.5.0, because quat_test.go round-trips those values rather than naming the
	// quaternion it wants, so they catch RDK's math moving rather than confirming it is right.
	expected *goldenQuaternion
}

// TestOrientationGolden pins the rotation RDK derives from each orientation encoding and writes it
// out for the TypeScript port to check itself against.
//
// The values come from spatialmath/quat_test.go, which is where RDK exercises its own conversions
// into and out of a quaternion, and each group below names the test it was taken from. Rather than
// hand-writing config JSON, every typed value goes through NewOrientationConfig, so the type tag
// and the field names are RDK's rather than this file's guess at them. That encoding is verbatim,
// which is what lets an unnormalized vector or quaternion still arrive unnormalized.
//
// A zero-axis `axis_angles` is deliberately absent, whether the axis is zero outright or left out
// and defaulted. ParseConfig accepts such a config and R4AA.Normalize panics later, on the way to a
// quaternion, so a case for it would kill this process instead of failing an assertion.
// orientationJson.spec.ts pins the port's answer for that input directly.
func TestOrientationGolden(t *testing.T) {
	testCases := orientationCases(t)

	golden := orientationGoldenFile{
		Source: "go.viam.com/rdk spatialmath.OrientationConfig.ParseConfig, over the values in spatialmath/quat_test.go",
		Cases:  make([]orientationGoldenCase, 0, len(testCases)),
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			encoded := encodeOrientation(t, testCase)

			quaternion := resolveQuaternion(t, encoded)
			assertQuaternion(t, quaternion, testCase.expected)

			golden.Cases = append(golden.Cases, orientationGoldenCase{
				Name:        testCase.name,
				Orientation: encoded,
				Quaternion:  quaternion,
			})
		})
	}

	writeGolden(t, orientationGoldenName, golden)
}

func orientationCases(t *testing.T) []orientationCase {
	t.Helper()

	fixture := loadOrientationTests(t)

	return []orientationCase{
		{
			name:     "unsupported type, from the fixture",
			raw:      fixture["wrong"],
			expected: nil, // ParseConfig derives no orientation from this config
		},
		{
			name:     "ov_degrees with a non-numeric value, from the fixture",
			raw:      fixture["wrongvalue"],
			expected: nil, // ParseConfig derives no orientation from this config
		},
		{
			name: "empty config, from the fixture",
			raw:  fixture["empty"],
			// frozen from rdk v1.5.0; quat_test.go only round-trips this value
			expected: quatOf(1, 0, 0, 0),
		},
		{
			name: "ov_degrees about +Z, from the fixture",
			raw:  fixture["ovdegrees"],
			// frozen from rdk v1.5.0; quat_test.go only round-trips this value
			expected: quatOf(0.9238795325112867, 0, 0, 0.3826834323650898),
		},
		{
			name: "ov_radians about +Y, from the fixture",
			raw:  fixture["ovradians"],
			// frozen from rdk v1.5.0; quat_test.go only round-trips this value
			expected: quatOf(0.27059805118284364, -0.27059805118284347, 0.6532814819785168, 0.6532814819785169),
		},
		{
			name: "euler_angles about Z, from the fixture",
			raw:  fixture["euler"],
			// frozen from rdk v1.5.0; quat_test.go only round-trips this value
			expected: quatOf(-0.8733046400935157, 0, 0, -0.4871745124605095),
		},
		{
			name: "axis_angles about +X, from the fixture",
			raw:  fixture["axisangle"],
			// frozen from rdk v1.5.0; quat_test.go only round-trips this value
			expected: quatOf(0.9238795331613604, 0.3826834307956733, 0, 0),
		},
		{
			name: "quaternion needing normalization, from the fixture",
			raw:  fixture["quaternion"],
			// frozen from rdk v1.5.0; quat_test.go only round-trips this value
			expected: quatOf(0.7302967433402214, 0.18257418583505536, 0.3651483716701107, 0.5477225575051661),
		},

		// TestEulerAnglesConversion
		{
			name:  "euler_angles away from any edge case, from TestEulerAnglesConversion",
			value: euler(math.Pi/4, math.Pi/4, 3*math.Pi/4),
			// quat_test.go's own literal for this EulerAngles value
			expected: quatOf(0.46193978734586505, -0.19134171618254486, 0.4619397662556434, 0.7325378046916491),
		},
		{
			name:  "euler_angles negated away from any edge case, from TestEulerAnglesConversion",
			value: euler(-math.Pi/4, -math.Pi/4, math.Pi/4),
			// quat_test.go's own literal for this EulerAngles value
			expected: quatOf(0.8446231850190303, -0.19134170056642805, -0.461939798632522, 0.19134170056642805),
		},
		{
			name:  "euler_angles gimbal locked at pitch pi/2, from TestEulerAnglesConversion",
			value: euler(-3*math.Pi/4, math.Pi/2, 0),
			// quat_test.go's own literal for this EulerAngles value
			expected: quatOf(0.2705980500730985, -0.6532814824381882, 0.27059805007309856, 0.6532814824381883),
		},
		{
			name:  "euler_angles carrying heading only, from TestEulerAnglesConversion",
			value: euler(0, 0, math.Pi/3),
			// quat_test.go's own literal for this EulerAngles value
			expected: quatOf(0.8660254042574935, 0, 0, 0.5),
		},

		// TestQuatConversion, the quatConvert half
		{
			name:  "quaternion a quarter turn about +X, from TestQuatConversion",
			value: quaternionOf(0.7071067811865476, 0.7071067811865476, 0, 0),
			// frozen from rdk v1.5.0; quat_test.go only round-trips this value
			expected: quatOf(0.7071067811865476, 0.7071067811865476, 0, 0),
		},
		{
			name:  "quaternion a quarter turn about -X, from TestQuatConversion",
			value: quaternionOf(0.7071067811865476, -0.7071067811865476, 0, 0),
			// frozen from rdk v1.5.0; quat_test.go only round-trips this value
			expected: quatOf(0.7071067811865476, -0.7071067811865476, 0, 0),
		},
		{
			name:  "quaternion about -Y, from TestQuatConversion",
			value: quaternionOf(0.96, 0, -0.28, 0),
			// frozen from rdk v1.5.0; quat_test.go only round-trips this value
			expected: quatOf(0.96, 0, -0.28, 0),
		},
		{
			name:  "quaternion about -Z, from TestQuatConversion",
			value: quaternionOf(0.96, 0, 0, -0.28),
			// frozen from rdk v1.5.0; quat_test.go only round-trips this value
			expected: quatOf(0.96, 0, 0, -0.28),
		},
		{
			name:  "quaternion at a negative theta, from TestQuatConversion",
			value: quaternionOf(0.96, -0.28, 0, 0),
			// frozen from rdk v1.5.0; quat_test.go only round-trips this value
			expected: quatOf(0.96, -0.28, 0, 0),
		},
		{
			name:  "quaternion at the complementary angle, from TestQuatConversion",
			value: quaternionOf(0.96, 0.28, 0, 0),
			// frozen from rdk v1.5.0; quat_test.go only round-trips this value
			expected: quatOf(0.96, 0.28, 0, 0),
		},
		{
			name:  "quaternion at an odd angle, from TestQuatConversion",
			value: quaternionOf(0.5, -0.5, -0.5, -0.5),
			// frozen from rdk v1.5.0; quat_test.go only round-trips this value
			expected: quatOf(0.5, -0.5, -0.5, -0.5),
		},

		// TestQuatConversion, the ovConvert half
		{
			name:  "ov_radians about +X, from TestQuatConversion",
			value: ov(2.47208, 1, 0, 0),
			// frozen from rdk v1.5.0; quat_test.go only round-trips this value
			expected: quatOf(0.23231217785607852, 0.6678555622436378, 0.23231217785607847, 0.667855562243638),
		},
		{
			name:  "ov_radians about -X, from TestQuatConversion",
			value: ov(2.47208, -1, 0, 0),
			// frozen from rdk v1.5.0; quat_test.go only round-trips this value
			expected: quatOf(-0.667855562243638, -0.23231217785607844, 0.667855562243638, 0.23231217785607855),
		},
		{
			name:  "ov_radians about +Y, from TestQuatConversion",
			value: ov(2.47208, 0, 1, 0),
			// frozen from rdk v1.5.0; quat_test.go only round-trips this value
			expected: quatOf(-0.30797568060138236, 0.3079756806013824, 0.6365147132298791, 0.6365147132298793),
		},
		{
			name:  "ov_radians about -Y, from TestQuatConversion",
			value: ov(2.47208, 0, -1, 0),
			// frozen from rdk v1.5.0; quat_test.go only round-trips this value
			expected: quatOf(0.6365147132298792, 0.6365147132298792, -0.30797568060138225, 0.3079756806013825),
		},
		{
			name:  "ov_radians at a small angle that once tripped the pole epsilon, from TestQuatConversion",
			value: ov(0.02, 0.5048437942940054, 0.5889844266763397, 0.631054742867507),
			// frozen from rdk v1.5.0; quat_test.go only round-trips this value
			expected: quatOf(0.8166322122704431, -0.1755596602541314, 0.3919839719397981, 0.38553754851640015),
		},
		{
			name:  "ov_radians that once gave trouble, at theta zero, from TestQuatConversion",
			value: ov(0, -0.32439089809469324, -0.9441256803955101, -0.05828588895294498),
			// frozen from rdk v1.5.0; quat_test.go only round-trips this value
			expected: quatOf(0.3986572455869837, 0.5920660484957303, 0.42261180614734833, -0.5585064512291035),
		},
		{
			name:  "ov_radians that once gave trouble, rotated, from TestQuatConversion",
			value: ov(-0.5732162806942777, -0.32439089809469324, -0.9441256803955101, -0.05828588895294498),
			// frozen from rdk v1.5.0; quat_test.go only round-trips this value
			expected: quatOf(0.22450535384545364, 0.44844214211454825, 0.5727500237033498, -0.6484245535282075),
		},

		// TestOVConversionPoles
		{
			name:  "ov_radians at the north pole, rotated, from TestOVConversionPoles",
			value: ov(2.47208, 0, 0, 1),
			// frozen from rdk v1.5.0; quat_test.go only round-trips this value
			expected: quatOf(0.3285390326284968, 0, 0, 0.9444903938312615),
		},
		{
			name:  "ov_radians at the north pole, unrotated, from TestOVConversionPoles",
			value: ov(0, 0, 0, 1),
			// frozen from rdk v1.5.0; quat_test.go only round-trips this value
			expected: quatOf(1, 0, 0, 0),
		},
		{
			name:  "ov_radians at the north pole, rotated the other way, from TestOVConversionPoles",
			value: ov(-2.47208, 0, 0, 1),
			// frozen from rdk v1.5.0; quat_test.go only round-trips this value
			expected: quatOf(0.3285390326284968, 0, 0, -0.9444903938312615),
		},
		{
			name:  "ov_radians at the north pole, rotated under a radian, from TestOVConversionPoles",
			value: ov(-0.78, 0, 0, 1),
			// frozen from rdk v1.5.0; quat_test.go only round-trips this value
			expected: quatOf(0.9249090598573131, 0, 0, -0.3801884151231614),
		},
		{
			name:  "ov_radians at the south pole, rotated, from TestOVConversionPoles",
			value: ov(2.47208, 0, 0, -1),
			// frozen from rdk v1.5.0; quat_test.go only round-trips this value
			expected: quatOf(2.0117213735172796e-17, 0.9444903938312615, 0.3285390326284968, 5.783335688154379e-17),
		},
		{
			name:  "ov_radians at the south pole, unrotated, from TestOVConversionPoles",
			value: ov(0, 0, 0, -1),
			// frozen from rdk v1.5.0; quat_test.go only round-trips this value
			expected: quatOf(6.123233995736757e-17, 0, 1, 0),
		},
		{
			name:  "ov_radians at the south pole, rotated the other way, from TestOVConversionPoles",
			value: ov(-2.47208, 0, 0, -1),
			// frozen from rdk v1.5.0; quat_test.go only round-trips this value
			expected: quatOf(2.0117213735172796e-17, -0.9444903938312615, 0.3285390326284968, -5.783335688154379e-17),
		},
		{
			name:  "ov_radians at the south pole, rotated under a radian, from TestOVConversionPoles",
			value: ov(-0.78, 0, 0, -1),
			// frozen from rdk v1.5.0; quat_test.go only round-trips this value
			expected: quatOf(5.663434598283223e-17, -0.3801884151231614, 0.9249090598573131, -2.327982628267421e-17),
		},

		// TestAngleAxisConversion1 and TestFlip
		{
			name:  "axis_angles about a unit diagonal, from TestAngleAxisConversion1",
			value: r4aa(2.5980762, 0.577350, 0.577350, 0.577350),
			// frozen from rdk v1.5.0; quat_test.go only round-trips this value
			expected: quatOf(0.2684255513483611, 0.5561617640529082, 0.5561617640529082, 0.5561617640529082),
		},
		{
			name:  "axis_angles about the opposite octant, from TestFlip",
			value: r4aa(2.5980762, 0.577350, -0.577350, -0.577350),
			// frozen from rdk v1.5.0; quat_test.go only round-trips this value
			expected: quatOf(0.2684255513483611, 0.5561617640529082, -0.5561617640529082, -0.5561617640529082),
		},

		// TestR4Normalize and TestOVNormalize
		{
			name:  "axis_angles with an axis 999 long, from TestR4Normalize",
			value: r4aa(0, 999, 0, 0),
			// frozen from rdk v1.5.0; quat_test.go only round-trips this value
			expected: quatOf(1, 0, 0, 0),
		},
		{
			name:  "ov_radians with a vector 999 long, from TestOVNormalize",
			value: ov(0, 999, 0, 0),
			// frozen from rdk v1.5.0; quat_test.go only round-trips this value
			expected: quatOf(0.7071067811865476, 0, 0.7071067811865475, 0),
		},
		{
			name:  "ov_radians with a vector half a unit long, from TestOVNormalize",
			value: ov(0, 0.5, 0, 0),
			// frozen from rdk v1.5.0; quat_test.go only round-trips this value
			expected: quatOf(0.7071067811865476, 0, 0.7071067811865475, 0),
		},

		// TestQuatDefault
		{
			name:     "ov_radians left entirely unset, from TestQuatDefault",
			value:    ov(0, 0, 0, 0),
			expected: nil, // ParseConfig derives no orientation from this config
		},
		{
			name:  "ov_radians set explicitly to +Z, from TestQuatDefault",
			value: ov(0, 0, 0, 1),
			// frozen from rdk v1.5.0; quat_test.go only round-trips this value
			expected: quatOf(1, 0, 0, 0),
		},

		// TestQuatNormalize
		{
			name:  "quaternion of length zero, from TestQuatNormalize",
			value: quaternionOf(0, 0, 0, 0),
			// frozen from rdk v1.5.0; quat_test.go only round-trips this value
			expected: quatOf(1, 0, 0, 0),
		},
		{
			name:  "quaternion already a unit about +X, from TestQuatNormalize",
			value: quaternionOf(0, 1, 0, 0),
			// frozen from rdk v1.5.0; quat_test.go only round-trips this value
			expected: quatOf(0, 1, 0, 0),
		},
		{
			name:  "quaternion vanishingly short, from TestQuatNormalize",
			value: quaternionOf(0, 0.0000000000001, 0, 0),
			// frozen from rdk v1.5.0; quat_test.go only round-trips this value
			expected: quatOf(0, 1, 0, 0),
		},
		{
			name:  "quaternion long enough to overflow its own norm, from TestQuatNormalize",
			value: quaternionOf(0, math.MaxFloat64, 1, 0),
			// frozen from rdk v1.5.0; quat_test.go only round-trips this value
			expected: quatOf(0, 1, 5.562684646268003e-309, 0),
		},
		{
			name:  "quaternion four times a unit, from TestQuatNormalize",
			value: quaternionOf(4, 2, 8, 4),
			// frozen from rdk v1.5.0; quat_test.go only round-trips this value
			expected: quatOf(0.4, 0.2, 0.8, 0.4),
		},
		{
			name:  "quaternion needing a root-50 divisor, from TestQuatNormalize",
			value: quaternionOf(0, 3, 4, 5),
			// frozen from rdk v1.5.0; quat_test.go only round-trips this value
			expected: quatOf(0, 0.4242640687119285, 0.565685424949238, 0.7071067811865475),
		},

		// TestDHConversion, the only ov_degrees value quat_test.go builds
		{
			name:  "ov_degrees a quarter turn about -Y, from TestDHConversion",
			value: ovd(90, 0, -1, 0),
			// frozen from rdk v1.5.0; quat_test.go only round-trips this value
			expected: quatOf(0.7071067811865476, 0.7071067811865475, 1.3401577416544657e-16, 2.299347170293092e-17),
		},

		// Not from quat_test.go. Every Go value marshals all of its fields, so no case above can
		// produce a config with one left out, and RDK's unmarshal defaults an absent angle to zero.
		{
			name: "euler_angles with only yaw set",
			raw:  raw(`{"type":"euler_angles","value":{"yaw":0.5}}`),
			// frozen from rdk v1.5.0; quat_test.go only round-trips this value
			expected: quatOf(0.9689124217106447, 0, 0, 0.24740395925452294),
		},
	}
}

// encodeOrientation returns the config JSON the TypeScript port will read. A typed value goes
// through RDK's own encoder so that the type tag and field names are not this file's guess.
func encodeOrientation(t *testing.T, testCase orientationCase) json.RawMessage {
	t.Helper()

	if testCase.raw != nil {
		return testCase.raw
	}

	config, err := sm.NewOrientationConfig(testCase.value)
	test.That(t, err, test.ShouldBeNil)

	encoded, err := json.Marshal(config)
	test.That(t, err, test.ShouldBeNil)

	return encoded
}

// resolveQuaternion reports the rotation RDK reads out of an orientation config, or nil when it
// reads none.
func resolveQuaternion(t *testing.T, rawConfig json.RawMessage) *goldenQuaternion {
	t.Helper()

	config := sm.OrientationConfig{}
	err := json.Unmarshal(rawConfig, &config)
	test.That(t, err, test.ShouldBeNil)

	orientation, err := config.ParseConfig()
	if err != nil {
		return nil
	}

	q := orientation.Quaternion()

	return &goldenQuaternion{W: q.Real, X: q.Imag, Y: q.Jmag, Z: q.Kmag}
}

// quaternionTolerance is looser than the 1e-8 RDK's own quatCompare uses, because two of
// quat_test.go's EulerAngles literals sit 3e-8 from what that value converts to. Its test only ties
// the pair together through QuatToEulerAngles at 1e-6, so the quaternion it names is not required
// to be reproduced to 1e-8. Any real change of convention moves a component by far more than this.
const quaternionTolerance = 1e-7

// assertQuaternion holds RDK to the rotation the case names. The golden file still records what RDK
// actually returned rather than this expectation, so the port downstream is compared against RDK's
// own answer and not against a literal that is only accurate to quaternionTolerance.
func assertQuaternion(t *testing.T, actual, expected *goldenQuaternion) {
	t.Helper()

	if expected == nil {
		test.That(t, actual, test.ShouldBeNil)
		return
	}

	test.That(t, actual, test.ShouldNotBeNil)
	test.That(t, actual.W, test.ShouldAlmostEqual, expected.W, quaternionTolerance)
	test.That(t, actual.X, test.ShouldAlmostEqual, expected.X, quaternionTolerance)
	test.That(t, actual.Y, test.ShouldAlmostEqual, expected.Y, quaternionTolerance)
	test.That(t, actual.Z, test.ShouldAlmostEqual, expected.Z, quaternionTolerance)
}

func quatOf(w, x, y, z float64) *goldenQuaternion {
	return &goldenQuaternion{W: w, X: x, Y: y, Z: z}
}

func ov(theta, x, y, z float64) *sm.OrientationVector {
	return &sm.OrientationVector{Theta: theta, OX: x, OY: y, OZ: z}
}

func ovd(theta, x, y, z float64) *sm.OrientationVectorDegrees {
	return &sm.OrientationVectorDegrees{Theta: theta, OX: x, OY: y, OZ: z}
}

func euler(roll, pitch, yaw float64) *sm.EulerAngles {
	return &sm.EulerAngles{Roll: roll, Pitch: pitch, Yaw: yaw}
}

func r4aa(theta, x, y, z float64) *sm.R4AA {
	return &sm.R4AA{Theta: theta, RX: x, RY: y, RZ: z}
}

func quaternionOf(real, imag, jmag, kmag float64) *sm.Quaternion {
	return &sm.Quaternion{Real: real, Imag: imag, Jmag: jmag, Kmag: kmag}
}

func raw(literal string) json.RawMessage {
	return json.RawMessage(literal)
}

func loadOrientationTests(t *testing.T) map[string]json.RawMessage {
	t.Helper()
	file, err := os.Open("data/orientations.json")
	test.That(t, err, test.ShouldBeNil)
	defer utils.UncheckedErrorFunc(file.Close)

	data, err := io.ReadAll(file)
	test.That(t, err, test.ShouldBeNil)
	// Parse into map of tests
	var testMap map[string]json.RawMessage
	err = json.Unmarshal(data, &testMap)
	test.That(t, err, test.ShouldBeNil)
	return testMap
}
