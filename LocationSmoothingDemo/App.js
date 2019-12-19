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
import PubNubReact from 'pubnub-react';

// Default positon.
const LATITUDE_DELTA = 0.009;
const LONGITUDE_DELTA = 0.009;
const LATITUDE = 36.072701;
const LONGITUDE = -79.793900;

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

    // Init PubNub. Use your subscribeKey and publishKey here.
    this.pubnub = new PubNubReact({
        subscribeKey: 'sub-c-4e5834ce-1b8b-11ea-a8ee-866798696d74',
        publishKey: 'pub-c-b238917c-b07e-4894-8702-f27a4108de56'
    });
    this.pubnub.init(this);
  }

  componentDidMount = () => {
    var that =this;
    const { coordinate } = this.state;
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
    this.pubnub.publish({
      message: "reset",
      channel: "reported_location"
    });
    const { coordinate } = this.state;
    Geolocation.watchPosition(
       (position) => {
          this.pubnub.publish({
            message: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            },
            channel: "reported_location"
          });
       },
       (error) => alert(error.message),
       { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000, distanceFilter: 5} //, distanceFilter: 5
    );

    // Subscribe to get smoothed location data from PN Function.
    this.pubnub.subscribe({
        channels: ['reported_location_smoothed']     
    });

    // Update when a new location is received.
    this.pubnub.getMessage('reported_location_smoothed', (msg) => {
      const { routeCoordinates, distanceTravelled } = this.state;
      const latitude = msg.message.latitude;
      const longitude = msg.message.longitude;

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
    });
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
          <Polyline coordinates={this.state.routeCoordinates} strokeWidth={4} />
          <Marker.Animated
            ref={marker => {
              this.marker = marker;
            }}
            coordinate={this.state.coordinate}
          />
        </MapView>
        <View style={styles.distanceContainer}>
          <TouchableOpacity style={styles.bubble}>
            <Text style={styles.bottomBarContent}>
              {parseFloat(this.state.distanceTravelled).toFixed(2)} km
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