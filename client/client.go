package client

import (
	"bytes"
	"fmt"
	"net/http"

	"go.viam.com/rdk/spatialmath"
	"google.golang.org/protobuf/encoding/protojson"
)

const url = "http://localhost:3000/shape"

func DrawGeometry(geometry spatialmath.Geometry) error {
	data, err := protojson.Marshal(geometry.ToProtobuf())
	if err != nil {
		return err
	}
	return postHTTP(data)
}

func postHTTP(data []byte) error {
	resp, err := http.Post(url, "application/json", bytes.NewReader(data))
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return fmt.Errorf("HTTP post unsuccessful: %s", resp.Status)
	}
	return nil
}
