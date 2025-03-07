package main

import (
	"bytes"
	"fmt"
	"net/http"

	"github.com/golang/geo/r3"
	"go.viam.com/rdk/spatialmath"
	"google.golang.org/protobuf/encoding/protojson"
)

func main() {
	box, err := spatialmath.NewBox(spatialmath.NewZeroPose(), r3.Vector{100, 1000, 100}, "")
	if err != nil {
		fmt.Println(err)
		return
	}
	data, err := protojson.Marshal(box.ToProtobuf())
	if err != nil {
		fmt.Println(err)
		return
	}
	fmt.Println("Protobuf as JSON:", string(data))

	// Send HTTP POST request with Protobuf data
	url := "http://localhost:3000/shape"
	resp, err := http.Post(url, "application/json", bytes.NewReader(data))
	if err != nil {
		fmt.Println("Error sending request:", err)
		return
	}
	defer resp.Body.Close()

	fmt.Println("Response Status:", resp.Status)
}
