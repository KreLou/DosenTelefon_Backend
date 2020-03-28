'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
var http = require('https');

var region = "eu-west-1",
    secretName = "DosenTelefon",
    secret,
    decodedBinarySecret;

// Create a Secrets Manager client
var client = new AWS.SecretsManager({
    region: region
});
var OPENVIDU_SERVER_SECRET ='';
var OPENVIDU_SERVER_URL = "https://openvidu.dosen-telefon.de:4443";
  await  new Promise((resolve, reject) => {
client.getSecretValue({SecretId: secretName}, function(err, data) {
    if (err) {
        if (err.code === 'DecryptionFailureException')
            // Secrets Manager can't decrypt the protected secret text using the provided KMS key.
            // Deal with the exception here, and/or rethrow at your discretion.
            throw err;
        else if (err.code === 'InternalServiceErrorException')
            // An error occurred on the server side.
            // Deal with the exception here, and/or rethrow at your discretion.
            throw err;
        else if (err.code === 'InvalidParameterException')
            // You provided an invalid value for a parameter.
            // Deal with the exception here, and/or rethrow at your discretion.
            throw err;
        else if (err.code === 'InvalidRequestException')
            // You provided a parameter value that is not valid for the current state of the resource.
            // Deal with the exception here, and/or rethrow at your discretion.
            throw err;
        else if (err.code === 'ResourceNotFoundException')
            // We can't find the resource that you asked for.
            // Deal with the exception here, and/or rethrow at your discretion.
            throw err;
    }
    else {
        // Decrypts secret using the associated KMS CMK.
        // Depending on whether the secret is a string or binary, one of these fields will be populated.
        if ('SecretString' in data) {
            secret = data.SecretString;
            var OPENVIDU_SERVER_SECRET = secret;
            resolve();
        } else {
            let buff = new Buffer(data.SecretBinary, 'base64');
            decodedBinarySecret = buff.toString('ascii');
        }
    }

    // Your code goes here.
});
}).promise();

const dynamoDb = new AWS.DynamoDB.DocumentClient();

function linkUserToConnection(connectionId,userUuid){
  const timestamp = new Date().getTime();
  var returnData = {};
  const params = {
    TableName: process.env.CONNECT_TABLE,
    Key: {
      connectId: connectionId,
    },
    ExpressionAttributeNames: {
      '#user': 'user'
    },
    ExpressionAttributeValues: {
      ':user': userUuid,
      ':updatedAt': timestamp
    },
    UpdateExpression: 'SET ' +//
                        '#user = :user, ' +//
                        'updatedAt = :updatedAt',
    ReturnValues: 'ALL_NEW',
  };


  // update the todo in the database
  dynamoDb.update(params, (error, result) => {
    // handle potential errors
    if (error) {
      console.error("Error connecting user ''"+userUuid+"'' and connection '"+connectionId+"'")
      console.error(error);
      returnData.error = error;
      returnData.statusCode = error.statusCode || 501;
      returnData.message = error.message;
    }
    else {
      returnData.statusCode = 200;
      returnData.message = "Connection saved."
      console.log("Connection for user ''"+userUuid+"'' and connection '"+connectionId+"' saved.")
    }
  });

  return returnData;

}

function sendCallback(callback,returnData){
  callback(null, {
    statusCode: returnData.statusCode,
    headers: {   'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
      'Content-Type': 'text/plain' },
    body: returnData.message
  });

}

function findMatch(userUuid){
  let returnData={};
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      uuid: userUuid,
    }
  };
  dynamoDb.get(params, (error, result) => {
    // handle potential errors
    if (error) {
      returnData.statusCode = error.statusCode || 501;
      returnData.message = error.message;
      returnData.error = error;
      return;
    }

    if(result.Item){
      returnData.statusCode =200;
      result.Item.token = "***";
      result.Item.newToken = "***";
      returnData.body = result.Item;
      // create a response
    }
  });
  if(returnData.statusCode != 200 ){
    return returnData;
  }

  //find users which do not have things in interessted where the other have it in notInteressted.
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    FilterExpression: "NOT contains (topicsNotOK, :topicsNotOK)",
    ExpressionAttributeValues: {
      ':topicsNotOK': returnData.body.topicsOK
    },
    Limit: 1
  };

  console.log(params);
  // fetch todo from the database
  dynamoDb.scan(params, (error, result) => {
    if (err) {
      console.log("Error", err);
      returnData.statusCode = error.statusCode || 501;
      returnData.message = error.message;
      returnData.error = error;
    } else {
      //console.log("Success", data.Items);
      if(data.Items.length != 0){
        //just take the first one
        let item = data.Items[0];
        returnData.statusCode =200;
        item.token = "***";
        item.newToken = "***";
        returnData.body = item;
      }
    }

  });
  return returnData;
}

// See https://openvidu.io/docs/reference-docs/REST-API/#post-apisessions
function createCallSession(sessionName){

    console.log(OPENVIDU_SERVER_SECRET);
    return  new Promise((resolve, reject) => {
      var data = JSON.stringify({ customSessionId: sessionName });

      var post_options = {
          host: 'OPENVIDU_SERVER_URL',
          port: '443',
          path: "/api/sessions",
          method: 'POST',
          headers: {
            Authorization: 'Basic ' + btoa('OPENVIDUAPP:' + OPENVIDU_SERVER_SECRET),
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
          }
      };


      var post_req = http.request(post_options, function(res) {
        res.setEncoding('utf8');
        res.on('data', function (data) {
           console.log('Response: ' + data);
           console.log(data);
           resolve(data.id)
          });
          res.on('error', function (error) {
             console.error('Error', error);
             reject(error)
            });
        });

        // post the data
        post_req.write(data);
        post_req.end();
  });
}

function createTokens(sessionId, user1Uuid, user2Uuid){
  // See https://openvidu.io/docs/reference-docs/REST-API/#post-apitokens
  return new Promise((resolve, reject) => {
    var data = JSON.stringify({ customSessionId: sessionName });

    var post_options = {
        host: 'OPENVIDU_SERVER_URL',
        port: '443',
        path: "/api/tokens",
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + btoa('OPENVIDUAPP:' + OPENVIDU_SERVER_SECRET),
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
    };

    var post_req = http.request(post_options, function(res) {
      res.setEncoding('utf8');
      res.on('data', function (data) {
         console.log('Response: ' + data);
         console.log(data);
         resolve(data.token)
        });
        res.on('error', function (error) {
           console.error('Error', error);
           reject(error)
          });
      });

      // post the data
      post_req.write(data);
      post_req.end();

  });
}


function getConnection(userUuid){
  const params = {
    TableName: process.env.CONNECT_TABLE,
    Key: {
      user: userUuid,
    },
  };
var returnData={};
  // fetch todo from the database
  dynamoDb.get(params, (error, result) => {
    // handle potential errors
    if (error) {
      console.error(error);
      returnData.statusCode=error.statusCode || 501;
      returnData.message=error.message;
      return;
    }
    if(!result.Item){
      returnData.statusCode = 404;
      returnData.message="Connection for user '"+userUuid+"' not found.";
    }
    else {
      returnData.body = result;
      returnData.statusCode = 200;
    }
    return returnData;
});
}

function sendWebSocketMessage(userUuid, postData) {
  let connectionDetails = getConnection(userUuid);
  if(connectionDetails.statusCode != 200){
    return connectionDetails;
  }
  let connectionId = connectionDetails.body.connectId;
  let connectionData;
  console.log("sending response to user " + userUuid);
  const apigwManagementApi = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: event.requestContext.domainName
  });

  try {
    let send = undefined;
     send = async (connectionId, postData) => {
       await apigwManagementApi.postToConnection({ ConnectionId: connectionId, Data: JSON.stringify(postData)  }).promise();
     }
     send(connectionId, postData);
     returnData.statusCode = 200;
     returnData.message = `Message send to connection ${connectionId}`
  } catch (e) {
    returnData.statusCode = e.statusCode;
    if (e.statusCode === 410) {
      returnData.message = `Found stale connection ${connectionId}`;
      returnData.error = e;
      return returnData;
    } else {
      throw e;
    }
  }
  return returnData;
}

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

module.exports.defaultHandler = (event, context, callback) => {
  const connectionId = event.requestContext.connectionId;
let returnData ={};
  console.log("Default handler, got "+connectionId+" to dynamoDB");
  console.log("secret: "+OPENVIDU_SERVER_SECRET);
  const data = JSON.parse(event.body);
  //TODO: verify token
  console.log(data);
  if (typeof data.version !== 'number' || data.version !== 1) {
      console.error('incorrect message');
      callback(null, {
        statusCode: 400,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Message invalid.',
      });
      return;
  }

  switch (data.event){
    case "link_user":

      returnData = linkUserToConnection(connectionId,data.body.uuid)

      if(returnData.statusCode != 200){
        sendCallback(callback, returnData);
        return;
      }

      var match = findMatch(userUuid);

      if(match == undefined){
        //don't send a response back.
        sendCallback(callback, {statusCode:200,message:"No match, found waiting."});
        return;
      }
      else {
        //create session
        var sessionId = createCallSession(sha256(match.userUuid+userUuid))
        //create tokens for both users
        var tokens = createTokens(sessionId, match.userUuid, userUuid);
        //send both users the token
        //TODO make code nicer https://github.com/aws-samples/simple-websockets-chat-app/blob/master/sendmessage/app.js
        returnData = sendWebSocketMessage(userUuid, {
          "version" : 1,
          "event" : "call_request",
          "body" : {
              "openvidu": {
                "sessionId":sessionId,
                "token":tokens[userUuid]
              },
              "username": getUserDetails(userUuid).name,
              "userUuid":userUuid
            }
          });
          if(returnData.statusCode != 200){
            sendCallback(callback, returnData);
            return;
          }

          returnData = sendWebSocketMessage(match.userUuid, {
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
            sendCallback(callback, returnData);
            return;
          }
          else {
            sendCallback(callback, {statusCode:200,message:"Match found, tokens send."});
          }
      }

      break;
    default:
    var errorMsg = 'Unkown event '+data.event;
    console.error(errorMsg);
    callback(null, {
      statusCode: 400,
      headers: { 'Content-Type': 'text/plain' },
      body: errorMsg,
    });
    return;
  }
};
