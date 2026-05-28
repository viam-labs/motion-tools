package server

import "testing"

func TestParseFrameSystem_DirectUnmarshalPath(t *testing.T) {
	raw := []byte(`{
		"name": "test",
		"world": {"frame_type": "static", "frame": {"id": "world", "translation": {"X":0,"Y":0,"Z":0}, "orientation": {"type": "quaternion", "value": {"W":1,"X":0,"Y":0,"Z":0}}}},
		"frames": {
			"arm": {"frame_type": "static", "frame": {"id": "arm", "translation": {"X":0,"Y":0,"Z":0}, "orientation": {"type": "quaternion", "value": {"W":1,"X":0,"Y":0,"Z":0}}}}
		},
		"parents": {
			"arm": "world"
		}
	}`)

	fs, err := parseFrameSystem(raw)
	if err != nil {
		t.Fatalf("parseFrameSystem returned error: %v", err)
	}
	if got := fs.Frame("arm"); got == nil {
		t.Fatalf("expected arm frame to be present")
	}
}

func TestParseFrameSystem_UnknownFrameTypeReturnsError(t *testing.T) {
	raw := []byte(`{
		"name": "test",
		"world": {"frame_type": "static", "frame": {"id": "world", "translation": {"X":0,"Y":0,"Z":0}, "orientation": {"type": "quaternion", "value": {"W":1,"X":0,"Y":0,"Z":0}}}},
		"frames": {
			"arm": {"frame_type": "static", "frame": {"id": "arm", "translation": {"X":0,"Y":0,"Z":0}, "orientation": {"type": "quaternion", "value": {"W":1,"X":0,"Y":0,"Z":0}}}},
			"new_internal": {"frame_type": "brand_new_future_type"}
		},
		"parents": {
			"arm": "new_internal",
			"new_internal": "world"
		}
	}`)

	_, err := parseFrameSystem(raw)
	if err == nil {
		t.Fatalf("expected parseFrameSystem to fail on unknown frame type")
	}
}
