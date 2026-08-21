package client

import (
	"bytes"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"
)

// DefaultColorMap is a palette to cycle between. It is the "Set1" colormap from Matplotlib.
//
// Deprecated: the client/client package is deprecated. Use
// [github.com/viam-labs/motion-tools/client/api] instead. DefaultColorMap has no v2
// equivalent. Rebuild the "Set1" palette with the draw color choosers described in the
// v1 → v2 migration guide:
// https://viamrobotics.github.io/visualization/migration/v1-to-v2/
var DefaultColorMap = []string{"#E41A1C", "#377EB8", "#4DAF4A", "#984EA3", "#FF7F00", "#FFFF33", "#A65628", "#F781BF", "#999999"}

type colorChooser struct {
	count int
}

func (cc *colorChooser) next() string {
	c := DefaultColorMap[cc.count%len(DefaultColorMap)]
	cc.count++
	return c
}

var (
	url = "http://localhost:3000/"
)

const (
	pointsType = 0
	posesType  = 1
	lineType   = 2
)

func isASCIIPrintable(label string) error {
	if !utf8.ValidString(label) {
		return errors.New("label is not valid utf-8")
	}

	if len(label) > 100 {
		return errors.New("label is too long (max 100 characters)")
	}
	for _, r := range label {
		if r > 127 || r < 32 {
			return errors.New("label is not ascii")
		}
	}
	return nil
}

func postHTTP(data []byte, content string, endpoint string) error {
	// Make a defensive copy so caller's slice can be safely reused.
	payload := make([]byte, len(data))
	copy(payload, data)

	if recordFile != nil {
		if lastDraw.IsZero() {
			// If this is the first draw command for a recording, we only need to note the
			// time. There's no need to add a sleep.
			lastDraw = time.Now()
		} else {
			// Calculate the time since the last frame. We only want to capture user sleeps between
			// `Draw*` calls. Thus we will only write out a sleep operation if the time is
			// "significant". We do this "significance" check because a single `Draw` command (e.g:
			// DrawFrameSystem) often results in many small `postHTTP` calls. The time between these
			// HTTP calls is not intended to be captured by the user.
			timeSinceFrame := time.Since(lastDraw)
			if timeSinceFrame > 10*time.Millisecond {
				fmt.Fprintf(recordFile, "sleep: %v\n", timeSinceFrame.Nanoseconds())
			}
			defer func() {
				// Because we only want to capture user sleeps calls to drawing, we update the
				// `lastDraw` time after each response is received. This is to have updating the
				// `lastDraw` time better track calls to `Draw*` (e.g: `DrawFrameSystem`)
				// methods. Most `postHTTP` calls take 1-10ms. And a single `DrawFrameSystem` can be
				// dozens of `postHTTP` calls. We do not want to turn a 100ms user sleep into a
				// forced 150+ms wait between frames because of the number of smaller `postHTTP`
				// that had to be made.
				lastDraw = time.Now()
			}()
		}

		fmt.Fprintf(recordFile, "%v\n", endpoint)
		fmt.Fprintf(recordFile, "%v\n", content)
		fmt.Fprintf(recordFile, "%v\n", hex.EncodeToString(payload))
	}

	resp, err := http.Post(url+endpoint, "application/"+content, bytes.NewReader(payload))
	if err != nil {
		return err
	}

	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("HTTP post unsuccessful: %s", resp.Status)
	}
	return nil
}

// SetURL sets the url for communicating with the visualizer. Use it for multiple
// visualizer windows, or to draw to a visualizer on another computer. The port
// should be :3000, the port of the drawing server.
//
// Deprecated: the client/client package is deprecated. Use
// [github.com/viam-labs/motion-tools/client/api] instead. SetURL has no v2 equivalent,
// because transport is no longer user-configurable. See the v1 → v2 migration guide:
// https://viamrobotics.github.io/visualization/migration/v1-to-v2/
func SetURL(preferredURL string) {
	if !strings.HasSuffix(preferredURL, "/") {
		preferredURL += "/"
	}
	url = preferredURL
}
