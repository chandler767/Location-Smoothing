export default (request) => { 
    const kvstore = require('kvstore');
    const pubnub = require('pubnub');
    const advancedMath = require('advanced_math');
    console.log('request',request); // Log the request envelope passed 
    
    // Smoothing Settings
    const smoothThresholdMultiplier = 1.5; // Recommended 1-2. Lower number filters less points for higher resolution paths (walking path) but may have more anomalies. Higher filers more points for lower resolution paths (driving paths) with less anomalies. 
    
    /* // Disable smoothing for testing.
      pubnub.publish({
            "channel": "reported_location_smoothed",
            "message": {
              latitude: request.message.latitude,
              longitude: request.message.longitude,
            }
        }).then((publishResponse) => {
            console.log(`Publish Status: ${publishResponse[0]}:${publishResponse[1]} with TT ${publishResponse[2]}`);
        });
        return request.ok();
    */

    if (request.message == "reset") {
        kvstore.removeItem("data"); //reset the block
        console.log("block data reset")
        return request.ok();
    }
    
    kvstore.get("data").then((value) => {
        if(value){
            console.log("value", value);
            if (!value.x1 || !value.y1 ) {
                kvstore.set('data', {
                    x1: request.message.latitude,
                    y1: request.message.longitude
                });
                console.log("First coord set (val ok). Waiting for more points to smooth.");
                // Not ready to smooth yet - unable to get previous data.
                pubnub.publish({
                    "channel": "reported_location_smoothed",
                    "message": {
                      latitude: request.message.latitude,
                      longitude: request.message.longitude,
                    }
                }).then((publishResponse) => {
                    console.log(`Publish Status: ${publishResponse[0]}:${publishResponse[1]} with TT ${publishResponse[2]}`);
                });
                return request.ok();
            } else {
                if (!value.x2 || !value.y2 ) {
                    kvstore.set('data', {
                        x1: value.x1,
                        y1: value.y1,
                        x2: request.message.latitude,
                        y2: request.message.longitude
                    });
                    console.log("Second coord set. Waiting for more points to smooth.");
                     // Not ready to smooth yet - unable to get previous data.
                    pubnub.publish({
                        "channel": "reported_location_smoothed",
                        "message": {
                          latitude: request.message.latitude,
                          longitude: request.message.longitude,
                        }
                    }).then((publishResponse) => {
                        console.log(`Publish Status: ${publishResponse[0]}:${publishResponse[1]} with TT ${publishResponse[2]}`);
                    });
                    return request.ok();
                } else {
                    // Smooth and send.
                    console.log("Smoothing...");
                    const workingDistance = (advancedMath.getDistance(parseFloat(value.x1), parseFloat(value.y1), parseFloat(value.x2), parseFloat(value.y2))*1.60934); // Distance between last two point
                    const checkPointDistance = (advancedMath.getDistance(parseFloat(value.x2), parseFloat(value.y2), parseFloat(request.message.latitude), parseFloat(request.message.longitude))*1.60934); // Distance between last point and new point

                    if (checkPointDistance < workingDistance*smoothThresholdMultiplier) { // Point is within filter distance. Drop point if not expected.
                        if ((parseFloat(value.x2) < parseFloat(value.x1)) && (parseFloat(request.message.latitude) > parseFloat(value.x2))) {
                            if ((parseFloat(value.y2) < parseFloat(value.y1)) && (parseFloat(request.message.longitude) > parseFloat(value.y2))) {
                                // Update kvstore with current and previous coords for next smooth.
                                kvstore.set('data', {
                                    x1: value.x2,
                                    y1: value.y2,
                                    x2: request.message.latitude,
                                    y2: request.message.longitude
                                });
                                // Point is far enough away that it's most likely not an anomaly.
                                pubnub.publish({
                                    "channel": "reported_location_smoothed",
                                    "message": {
                                      latitude: request.message.latitude,
                                      longitude: request.message.longitude,
                                    }
                                }).then((publishResponse) => {
                                    console.log(`Publish Status: ${publishResponse[0]}:${publishResponse[1]} with TT ${publishResponse[2]}`);
                                });
                                return request.ok();
                                
                            } 
                        }
                        // Drop point
                        // Update kvstore with current and previous coords for next smooth. // Disabled on drop
                       /*kvstore.set('data', {
                            x1: value.x2,
                            y1: value.y2,
                            x2: request.message.latitude,
                            y2: request.message.longitude
                        });*/
                        console.log("Point was dropped.");
                        return request.ok();
                    }
                    // Update kvstore with current and previous coords for next smooth.
                    kvstore.set('data', {
                        x1: value.x2,
                        y1: value.y2,
                        x2: request.message.latitude,
                        y2: request.message.longitude
                    });
                    // Point is far enough away that it's most likely not an anomaly.
                    pubnub.publish({
                        "channel": "reported_location_smoothed",
                        "message": {
                          latitude: request.message.latitude,
                          longitude: request.message.longitude,
                        }
                    }).then((publishResponse) => {
                        console.log(`Publish Status: ${publishResponse[0]}:${publishResponse[1]} with TT ${publishResponse[2]}`);
                    });
                    return request.ok();
                }
            }
        } else {
            // Not ready to smooth yet - not enough points.
            kvstore.set('data', {
                x1: request.message.latitude,
                y1: request.message.longitude
            });
            console.log("First coord set. Waiting for more points to smooth.");
            pubnub.publish({
                "channel": "reported_location_smoothed",
                "message": {
                  latitude: request.message.latitude,
                  longitude: request.message.longitude,
                }
            }).then((publishResponse) => {
                console.log(`Publish Status: ${publishResponse[0]}:${publishResponse[1]} with TT ${publishResponse[2]}`);
            });
            return request.ok();
            
        }
    })
    .catch((e) => {
        console.error(e);
        // Not ready to smooth yet - unable to get previous data.
        pubnub.publish({
            "channel": "reported_location_smoothed",
            "message": {
              latitude: request.message.latitude,
              longitude: request.message.longitude,
            }
        }).then((publishResponse) => {
            console.log(`Publish Status: ${publishResponse[0]}:${publishResponse[1]} with TT ${publishResponse[2]}`);
        });
        return request.ok();
    });

    return request.ok(); // Return a promise when you're done 
}