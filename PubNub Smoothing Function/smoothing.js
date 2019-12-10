export default (request) => { 
    const kvstore = require('kvstore');
    const pubnub = require('pubnub');
    
    console.log('request',request); // Log the request envelope passed 

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

                    pubnub.publish({
                        "channel": "reported_location_smoothed",
                        "message": {
                          latitude: request.message.latitude,
                          longitude: request.message.longitude,
                        }
                    }).then((publishResponse) => {
                        console.log(`Publish Status: ${publishResponse[0]}:${publishResponse[1]} with TT ${publishResponse[2]}`);
                    });
                    // Last - Update kvstore with current and previous coords for next smooth.
                    kvstore.set('data', {
                        x1: value.x2,
                        y1: value.y2,
                        x2: request.message.latitude,
                        y2: request.message.longitude
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