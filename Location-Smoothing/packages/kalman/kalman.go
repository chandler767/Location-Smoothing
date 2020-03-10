package kalman

import (
	"errors"
)

const minAccuracy = 1

type kalmanData struct {
	latitude     float64
	longitude    float64
	averageSpeed float64 // M/S
	accuracy     float64
	timeEpoch    uint
}

func (gps *kalmanData) startData(latitudeMeasured, longitudeMeasured, accuracyMeasured float64, timeEpoch uint) {
	gps.timeEpoch = timeEpoch
	gps.latitude = latitudeMeasured
	gps.longitude = longitudeMeasured
	gps.accuracy = accuracyMeasured * accuracyMeasured
}

func (kalmanData *kalmanData) processPoint(latitudeMeasured, longitudeMeasured, accuracyMeasured float64, timeEpoch uint) error {
	if accuracyMeasured < minAccuracy {
		accuracyMeasured = minAccuracy
	}
	if kalmanData.accuracy < 0 {
		return errors.New("call startData first")
	}

	timeEpochIncremental := timeEpoch - kalmanData.timeEpoch
	if timeEpochIncremental > 0 {
		kalmanData.accuracy += float64(timeEpochIncremental) * kalmanData.averageSpeed *
			kalmanData.averageSpeed / 1000.0
		kalmanData.timeEpoch = timeEpoch
	}

	var kalmanGain float64 = kalmanData.accuracy / (kalmanData.accuracy + accuracyMeasured*accuracyMeasured)

	kalmanData.latitude += kalmanGain * (latitudeMeasured - kalmanData.latitude)
	kalmanData.longitude += kalmanGain * (longitudeMeasured - kalmanData.longitude)
	kalmanData.accuracy = (1 - kalmanGain) * kalmanData.accuracy
	return nil
}

func (gps kalmanData) getLat() float64 {
	return gps.latitude
}

func (gps kalmanData) getLong() float64 {
	return gps.longitude
}

func New(averageSpeed float64) *kalmanData {
	newGps := kalmanData{}
	newGps.averageSpeed = averageSpeed
	newGps.accuracy = -1
	return &newGps
}

func (kalmanData *kalmanData) ProcessData(latitudeAry, longitudeAry, accuracyArray []float64,
	timeEpochs []uint) (latitudeAryFiltered, longitudeAryFiltered []float64, err error) {

	kalmanData.startData(latitudeAry[0], longitudeAry[0], accuracyArray[0], timeEpochs[0])

	inputPointsLength := len(latitudeAry)
	if inputPointsLength != len(longitudeAry) || inputPointsLength != len(accuracyArray) || inputPointsLength != len(timeEpochs) {
		return nil, nil, errors.New("array length should be equal")
	}

	latitudeAryFiltered = make([]float64, 0, inputPointsLength)
	longitudeAryFiltered = make([]float64, 0, inputPointsLength)

	for i := 0; i < inputPointsLength; i++ {
		err = kalmanData.processPoint(latitudeAry[i], longitudeAry[i], accuracyArray[1], timeEpochs[i])
		if err != nil {
			return nil, nil, err
		}
		latitudeAryFiltered = append(latitudeAryFiltered, kalmanData.getLat())
		longitudeAryFiltered = append(longitudeAryFiltered, kalmanData.getLong())
	}
	return
}
