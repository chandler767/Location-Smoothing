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

func (gps *kalmanData) StartData(latitudeMeasured, longitudeMeasured, accuracyMeasured float64, timeEpoch uint) {
	gps.timeEpoch = timeEpoch
	gps.latitude = latitudeMeasured
	gps.longitude = longitudeMeasured
	gps.accuracy = accuracyMeasured * accuracyMeasured
}

func New(averageSpeed float64) *kalmanData {
	newGps := kalmanData{}
	newGps.averageSpeed = averageSpeed
	newGps.accuracy = -1
	return &newGps
}

func (kalmanData *kalmanData) ProcessPoint(latitudeMeasured, longitudeMeasured, accuracyMeasured float64, timeEpoch uint) error {
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
}

func (gps kalmanData) GetLat() float64 {
	return gps.latitude
}

func (gps kalmanData) GetLong() float64 {
	return gps.longitude
}

func (kalmanData *kalmanData) ProcessData(latitudeAry, longitudeAry, accuracyArray []float64,
	timeEpochs []uint) (latitudeAryFiltered, longitudeAryFiltered []float64, error) {

	kalmanData.StartData(latitudeAry[0], longitudeAry[0], accuracyArray[0], timeEpochs[0])

	inputPointsLength := len(latitudeAry)
	if inputPointsLength != len(longitudeAry) || inputPointsLength != len(accuracyArray) || inputPointsLength != len(timeEpochs) {
		return errors.New("array length should be equal")
	}

	latitudeAryFiltered = make([]float64, 0, inputPointsLength)
	longitudeAryFiltered = make([]float64, 0, inputPointsLength)

	for i := 0; i < inputPointsLength; i++ {
		err = kalmanData.ProcessPoint(latitudeAry[i], longitudeAry[i], accuracyArray[1], timeEpochs[i])
		if err != nil {
			return err
		}
		latitudeAryFiltered = append(latitudeAryFiltered, kalmanData.GetLat())
		longitudeAryFiltered = append(longitudeAryFiltered, kalmanData.GetLong())
	}
	return
}
