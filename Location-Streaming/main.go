// Stream CSV to PubNub channel

package main

import (
	"bufio"
	"encoding/csv"
	pubnub "github.com/pubnub/go"
	"io"
	"log"
	"os"
	"time"
)

func main() {
	config := pubnub.NewConfig()
	config.SubscribeKey = "sub-c-109c874a-331c-11ea-aaf2-c6d8f98a95a1"
	config.PublishKey = "pub-c-13a496ec-c065-4100-a597-c5c7c68f9fa1"
	channel := "reported_location"
	pn := pubnub.NewPubNub(config)
	data := make(map[string]interface{})
	csvFile, _ := os.Open("data2.csv")
	reader := csv.NewReader(bufio.NewReader(csvFile))
	pn.Publish().Channel(channel).Message("reset").Execute()
	for {
		line, error := reader.Read()
		if error == io.EOF {
			break
		} else if error != nil {
			log.Fatal(error)
		}
		if line[0] != "latitude" { // Skip first line
			data["latitude"] = line[0]
			data["longitude"] = line[1]
			data["speed"] = line[2]
			data["heading"] = line[3]
			data["accuracy"] = line[4]
			data["altitude"] = line[5]
			data["timestamp"] = line[6]
			pn.Publish().Channel(channel).Message(data).Execute()
			time.Sleep(1500)
		}
	}
}
