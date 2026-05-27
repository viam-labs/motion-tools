package server

import (
	"encoding/json"
	"testing"
)

func TestFilterFrameSystemJSON_DropsUnknownFrameTypesAndRepairsParents(t *testing.T) {
	raw := []byte(`{
		"name": "test",
		"world": {},
		"frames": {
			"arm": {"frame_type": "static"},
			"internal": {"frame_type": "named"},
			"tool": {"frame_type": "model"}
		},
		"parents": {
			"arm": "internal",
			"internal": "world",
			"tool": "arm"
		}
	}`)

	filteredRaw, err := filterFrameSystemJSON(raw)
	if err != nil {
		t.Fatalf("filterFrameSystemJSON returned error: %v", err)
	}

	var got rawFrameSystem
	if err := json.Unmarshal(filteredRaw, &got); err != nil {
		t.Fatalf("unmarshal filtered frame system: %v", err)
	}

	if _, ok := got.Frames["internal"]; ok {
		t.Fatalf("expected unknown frame type to be removed")
	}
	if parent := got.Parents["arm"]; parent != "world" {
		t.Fatalf("expected arm parent to be repaired to world, got %q", parent)
	}
	if parent := got.Parents["tool"]; parent != "arm" {
		t.Fatalf("expected tool parent to remain arm, got %q", parent)
	}
}

func TestFilterFrameSystemJSON_BreaksParentCycles(t *testing.T) {
	raw := []byte(`{
		"name": "test",
		"world": {},
		"frames": {
			"arm": {"frame_type": "static"},
			"tool": {"frame_type": "model"}
		},
		"parents": {
			"arm": "ghost-a",
			"ghost-a": "ghost-b",
			"ghost-b": "arm",
			"tool": "arm"
		}
	}`)

	filteredRaw, err := filterFrameSystemJSON(raw)
	if err != nil {
		t.Fatalf("filterFrameSystemJSON returned error: %v", err)
	}

	var got rawFrameSystem
	if err := json.Unmarshal(filteredRaw, &got); err != nil {
		t.Fatalf("unmarshal filtered frame system: %v", err)
	}

	if parent := got.Parents["arm"]; parent != "world" {
		t.Fatalf("expected cycle to resolve arm parent to world, got %q", parent)
	}
	if parent := got.Parents["tool"]; parent != "arm" {
		t.Fatalf("expected tool parent to remain arm, got %q", parent)
	}
}
