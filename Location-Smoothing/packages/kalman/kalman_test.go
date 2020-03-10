package kalman_test

import (
	"../kalman"
	"encoding/csv"
	"fmt"
	"gonum.org/v1/plot"
	"gonum.org/v1/plot/plotter"
	"gonum.org/v1/plot/plotutil"
	"gonum.org/v1/plot/vg"
	"log"
	"os"
	"testing"
	"time"
)

func makePoints(x []float64, y []float64) plotter.XYs {
	pts := make(plotter.XYs, len(x))

	for i := range pts {
		pts[i].X = x[i]
		pts[i].Y = y[i]
	}

	return pts
}

func plotData(xary []float64, yary []float64, xaryFiltered []float64, yaryFiltered []float64) {
	p, err := plot.New()
	if err != nil {
		panic(err)
	}
	err = plotutil.AddLinePoints(p,
		"Original Points", makePoints(xary, yary),
		"Filtered Points", makePoints(xaryFiltered, yaryFiltered),
	)
	if err != nil {
		panic(err)
	}
	if err := p.Save(16*vg.Inch, 4*vg.Inch, "result.png"); err != nil {
		panic(err)
	}
}

func TestProcessData(t *testing.T) {
	latAry := []float64{36.0643277038225, 36.0643756902181, 36.0644616047256, 36.0645071184599, 36.0645574936979}
	lngAry := []float64{-79.8964271788298, -79.8963977583497, -79.8964026198535, -79.8964081519096, -79.8964093253761}
	accuracyAry := []float64{5, 5, 3, 5, 5}
	timesString := []string{"2020-02-17 07:15:48", "2020-02-17 07:15:53", "2020-02-17 07:15:59", "2020-02-17 07:16:03",
		"2020-02-17 07:16:14"}

	timeAry := make([]uint, len(timesString))
	for i := 0; i < len(timesString); i++ {
		gpsTime, _ := time.Parse("2006-01-02 15:04:05", timesString[i])
		timeAry[i] = uint(gpsTime.Unix())
	}

	klm := kalman.New(15.0)

	latitudeAryFiltered, longitudeAryFiltered, err := klm.ProcessData(latAry, lngAry, accuracyAry, timeAry)
	if err != nil {
		log.Fatal("Cannot process data - ", err)
	}

	file, err := os.Create("result.csv")
	if err != nil {
		log.Fatal("Cannot create file - ", err)
	}
	defer file.Close()

	writer := csv.NewWriter(file)
	defer writer.Flush()

	for i := 0; i < len(timesString); i++ {
		data := []string{fmt.Sprintf("%.6f", latAry[i]), fmt.Sprintf("%.6f", lngAry[i]),
			fmt.Sprintf("%.6d", timeAry[i]), fmt.Sprintf("%.6f", latitudeAryFiltered[i]),
			fmt.Sprintf("%.6f", longitudeAryFiltered[i])}
		err := writer.Write(data)
		if err != nil {
			log.Fatal("Cannot write to file - ", err)
		}
	}

	plotData(latAry, lngAry, latitudeAryFiltered, longitudeAryFiltered)
}
