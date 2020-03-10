/**

Realtime Location Tracking and PubNub Function Smoothing Demo.

This app works by:

- Streaming realtime location to PubNub.

- Location smoothing occurs in a PubNub function and optimized coordinate points are streamed to a new channel. 

- Subscribes to realtime location and plots on a Google Map. 

Use this for:

 - Delivery apps

 - Ride sharing apps

 - Tracking apps

 */

import React from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
  Alert,
  PermissionsAndroid
} from "react-native";
import MapView, {
  Marker,
  AnimatedRegion,
  Polyline,
  PROVIDER_GOOGLE
} from "react-native-maps";
import haversine from "haversine";
import Geolocation from '@react-native-community/geolocation';
import KeepAwake from 'react-native-keep-awake';
import Mailer from 'react-native-mail';

// Default positon.
const LATITUDE_DELTA = 0.009;
const LONGITUDE_DELTA = 0.009;
const LATITUDE = 36.072701;
const LONGITUDE = -79.793900;

var values = []; // Array to store data.

export default class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      latitude: LATITUDE,
      longitude: LONGITUDE,
      routeCoordinates: [],
      distanceTravelled: 0,
      prevLatLng: {},
      coordinate: new AnimatedRegion({
        latitude: LATITUDE,
        longitude: LONGITUDE,
        latitudeDelta: 0,
        longitudeDelta: 0
      })
    };

  }

  componentDidMount = () => {
    var that =this;
    const { coordinate } = this.state;
    KeepAwake.activate();
    //Checking for the permission.
    if(Platform.OS === 'ios'){
      this.callLocation(that);
    }else{
      async function requestLocationPermission() {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,{
              'title': 'Location Access Required',
              'message': 'This App needs to Access your location'
            }
          )
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            //If Permission was granted
            that.callLocation(that);
          } else {
            alert("Permission Denied");
          }
        } catch (err) {
          alert("err",err);
          console.warn(err)
        }
      }
      requestLocationPermission();
    }    
 }
 // Get location and stream to PubNub.
 callLocation(that){
    const { coordinate } = this.state;
    Geolocation.watchPosition(
       (position) => {
          const { routeCoordinates, distanceTravelled } = this.state;
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;

          values.push( [position.coords.latitude, position.coords.longitude, position.coords.speed, position.coords.heading, position.coords.accuracy, position.coords.altitude, position.timestamp] );

          const newCoordinate = {
            latitude,
            longitude
          };

          if (Platform.OS === "android") {
            if (this.marker) {
              this.marker._component.animateMarkerToCoordinate(
                newCoordinate,
                500
              );
            }
          } else {
            coordinate.timing(newCoordinate).start();
          }

          // Update current position on map and calculate distance traveled.
          this.setState({
            latitude,
            longitude,
            routeCoordinates: routeCoordinates.concat([newCoordinate]),
            distanceTravelled:
              distanceTravelled + this.calcDistance(newCoordinate),
            prevLatLng: newCoordinate
          });
       },
       (error) => alert(error.message),
       { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000, distanceFilter: 5} //, distanceFilter: 5
    );
  }

 componentWillUnmount = () => {
    Geolocation.clearWatch(this.watchID);
 }

 getMapRegion = () => ({
    latitude: this.state.latitude,
    longitude: this.state.longitude,
    latitudeDelta: LATITUDE_DELTA,
    longitudeDelta: LONGITUDE_DELTA
  });

  calcDistance = newLatLng => {
    const { prevLatLng } = this.state;
    return haversine(prevLatLng, newLatLng) || 0;
  };

  SendData=()=>{

    const headerString = 'latitude,longitude,speed,heading,accuracy,altitude,time\n';
    const rowString = values.map(d => `${d[0]},${d[1]},${d[2]},${d[3]},${d[4]},${d[5]},${d[6]}\n`).join('');
    const csvString = `${headerString}${rowString}`;

    Mailer.mail({
      subject: 'GPS Location Data',
      recipients: ['chandler+LOCLAB@pubnub.com'],
      body: '<p><b>Please provide some context for this data.</b></p><p> What device are you using? <br> <br> Where are you? <br> <br> How\'s the weather? <br> <br> What type of enviroment did you collect this data in? </p> <br> <br> <br> <br> <br> <br> <br> ---DO NOT EDIT BELOW THIS LINE--- <br><br>---Start CSV---<br>' + csvString + '<br>---END CSV---',
      isHTML: true,
    }, (error, event) => {
      Alert.alert("Data Reset")
      /*Alert.alert(
        error,
        event,
        [
          {text: 'Ok', onPress: () => console.log('OK: Email Error Response')},
          {text: 'Cancel', onPress: () => console.log('CANCEL: Email Error Response')}
        ],
        { cancelable: true }
      )*/
    });
    values = []; // Reset values.
  }

  render() {
    return (
      <View style={styles.container}>
        <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          showUserLocation
          followUserLocation
          loadingEnabled
          region={this.getMapRegion()}
        >
          <Marker.Animated
            ref={marker => {
              this.marker = marker;
            }}
            coordinate={this.state.coordinate}
          />
        </MapView>
        <View style={styles.distanceContainer}>
          <TouchableOpacity style={styles.bubble} onPress={this.SendData}>
            <Text style={styles.bottomBarContent}>
              Reset and Send Data to Chandler (:
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    alignItems: "center"
  },
  map: {
    ...StyleSheet.absoluteFillObject
  },
  bubble: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20,
    width: 50,
    alignItems: "center",
    marginHorizontal: 10
  },
  latlng: {
    width: 200,
    alignItems: "stretch"
  },
  distanceContainer: {
    flexDirection: "row",
    marginVertical: 20,
    backgroundColor: "transparent"
  }
});