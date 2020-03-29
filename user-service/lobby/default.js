'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

const connectionDB  =  require( '../libs/connection-db.js');
const userDB  =  require( '../libs/user-db.js');
const audioServer  =  require( '../libs/openvidu.js');
const websockets  =  require( '../libs/websockets.js');

function wrapReturn(returnData){
  return {
    statusCode: returnData.statusCode,
    headers: {   'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
      'Content-Type': 'text/plain' },
    body: returnData.message
  }
}


module.exports.defaultHandler = async (event, context, callback) => {
  const connectionId = event.requestContext.connectionId;
  const data = JSON.parse(event.body);
  let userUuid =data.body.uuid;
  let returnData ={};
  //TODO: verify token

  console.log("Default handler, got "+connectionId);

  if (typeof data.version !== 'number' || data.version !== 1) {
      console.error('incorrect message');
      callback(null, {
        statusCode: 400,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Message invalid.',
      });
      return;
  }
  console.log("event:" +data.event);
  switch (data.event){
    case "link_user":

      console.log("link_user in database");
      returnData = await connectionDB.linkUserToConnection(connectionId,userUuid);
      console.log(returnData);
      if(returnData.statusCode != 200){
        return wrapReturn(returnData)
      }

      var match = userDB.findMatch(userUuid);

      if(match == undefined){
        //don't send a websocket response back.
        return wrapReturn({statusCode:200,message:"No match, found waiting."});
      }
      else {
        //create session
        var sessionId = audioServer.createCallSession(sha256(match.userUuid+userUuid))
        //create tokens for both users
        var tokens = audioServer.createTokens(sessionId, match.userUuid, userUuid);
        //send both users the token
        //TODO make code nicer https://github.com/aws-samples/simple-websockets-chat-app/blob/master/sendmessage/app.js

        let connectionDetails = await connectionDB.getConnection(userUuid);
        if(connectionDetails.statusCode != 200){
          return wrapReturn(connectionDetails);
        }
        let connectionId = connectionDetails.body.connectId;
        returnData = websockets.sendWebSocketMessage(connectionId, {
          "version" : 1,
          "event" : "call_request",
          "body" : {
              "openvidu": {
                "sessionId":sessionId,
                "token":tokens[userUuid]
              },
              "username": userDB.getUserDetails(userUuid).name,
              "userUuid":userUuid
            }
          });
          if(returnData.statusCode != 200){
            return wrapReturn(callback, returnData);
          }

          returnData = websockets.sendWebSocketMessage(match.userUuid, {
            "version" : 1,
            "event" : "call_request",
            "body" : {
                "openvidu": {
                  "sessionId":sessionId,
                  "token":tokens[match.userUuid]
                },
                "username": match.name,
                "userUuid": match.userUuid
              }
          });
          if(returnData.statusCode != 200){
            return wrapReturn(callback, returnData);
          }
          else {
            return wrapReturn({statusCode:200,message:"Match found, tokens send."});
          }
      }

      break;
    default:
      var errorMsg = 'Unkown event '+data.event;
      console.error(errorMsg);
      return wrapReturn({
        statusCode: 400,
        headers: { 'Content-Type': 'text/plain' },
        body: errorMsg,
      });
      return;
    }

};


function sha256(ascii) {
	function rightRotate(value, amount) {
		return (value>>>amount) | (value<<(32 - amount));
	};

	var mathPow = Math.pow;
	var maxWord = mathPow(2, 32);
	var lengthProperty = 'length'
	var i, j; // Used as a counter across the whole file
	var result = ''

	var words = [];
	var asciiBitLength = ascii[lengthProperty]*8;

	//* caching results is optional - remove/add slash from front of this line to toggle
	// Initial hash value: first 32 bits of the fractional parts of the square roots of the first 8 primes
	// (we actually calculate the first 64, but extra values are just ignored)
	var hash = sha256.h = sha256.h || [];
	// Round constants: first 32 bits of the fractional parts of the cube roots of the first 64 primes
	var k = sha256.k = sha256.k || [];
	var primeCounter = k[lengthProperty];
	/*/
	var hash = [], k = [];
	var primeCounter = 0;
	//*/

	var isComposite = {};
	for (var candidate = 2; primeCounter < 64; candidate++) {
		if (!isComposite[candidate]) {
			for (i = 0; i < 313; i += candidate) {
				isComposite[i] = candidate;
			}
			hash[primeCounter] = (mathPow(candidate, .5)*maxWord)|0;
			k[primeCounter++] = (mathPow(candidate, 1/3)*maxWord)|0;
		}
	}

	ascii += '\x80' // Append Ƈ' bit (plus zero padding)
	while (ascii[lengthProperty]%64 - 56) ascii += '\x00' // More zero padding
	for (i = 0; i < ascii[lengthProperty]; i++) {
		j = ascii.charCodeAt(i);
		if (j>>8) return; // ASCII check: only accept characters in range 0-255
		words[i>>2] |= j << ((3 - i)%4)*8;
	}
	words[words[lengthProperty]] = ((asciiBitLength/maxWord)|0);
	words[words[lengthProperty]] = (asciiBitLength)

	// process each chunk
	for (j = 0; j < words[lengthProperty];) {
		var w = words.slice(j, j += 16); // The message is expanded into 64 words as part of the iteration
		var oldHash = hash;
		// This is now the undefinedworking hash", often labelled as variables a...g
		// (we have to truncate as well, otherwise extra entries at the end accumulate
		hash = hash.slice(0, 8);

		for (i = 0; i < 64; i++) {
			var i2 = i + j;
			// Expand the message into 64 words
			// Used below if
			var w15 = w[i - 15], w2 = w[i - 2];

			// Iterate
			var a = hash[0], e = hash[4];
			var temp1 = hash[7]
				+ (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) // S1
				+ ((e&hash[5])^((~e)&hash[6])) // ch
				+ k[i]
				// Expand the message schedule if needed
				+ (w[i] = (i < 16) ? w[i] : (
						w[i - 16]
						+ (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15>>>3)) // s0
						+ w[i - 7]
						+ (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2>>>10)) // s1
					)|0
				);
			// This is only used once, so *could* be moved below, but it only saves 4 bytes and makes things unreadble
			var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) // S0
				+ ((a&hash[1])^(a&hash[2])^(hash[1]&hash[2])); // maj

			hash = [(temp1 + temp2)|0].concat(hash); // We don't bother trimming off the extra ones, they're harmless as long as we're truncating when we do the slice()
			hash[4] = (hash[4] + temp1)|0;
		}

		for (i = 0; i < 8; i++) {
			hash[i] = (hash[i] + oldHash[i])|0;
		}
	}

	for (i = 0; i < 8; i++) {
		for (j = 3; j + 1; j--) {
			var b = (hash[i]>>(j*8))&255;
			result += ((b < 16) ? 0 : '') + b.toString(16);
		}
	}
	return result;
};
