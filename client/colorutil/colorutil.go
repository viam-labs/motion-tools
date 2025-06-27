package colorutil

import (
	"fmt"
	"strings"
)

// NamedColorToHex returns the hex string for a given named color.
// For unsupported colors, it returns an error.
func NamedColorToHex(name string) (string, error) {

	if strings.HasPrefix(name, "#") {
		return name, nil
	}

	name = strings.ToLower(strings.TrimSpace(name))

	colors := map[string]string{
		"black":   "#000000",
		"white":   "#ffffff",
		"red":     "#ff0000",
		"green":   "#00ff00",
		"blue":    "#0000ff",
		"yellow":  "#ffff00",
		"cyan":    "#00ffff",
		"magenta": "#ff00ff",
		"gray":    "#808080",
		"grey":    "#808080",
		"orange":  "#ffa500",
		"purple":  "#800080",
		"pink":    "#ffc0cb",
		"brown":   "#a52a2a",
		"lime":    "#00ff00",
		"navy":    "#000080",
		"teal":    "#008080",
		"maroon":  "#800000",
		"olive":   "#808000",
		"silver":  "#c0c0c0",
		"gold":    "#ffd700",
	}

	hex, ok := colors[name]
	if !ok {
		return "", fmt.Errorf("unknown color name: %q", name)
	}
	return hex, nil
}
