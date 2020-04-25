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
var OPENVIDU_SERVER_SECRET = "";
var OPENVIDU_SERVER_URL = "openvidu.dosen-telefon.de";

function getSecret () {
    return new Promise(function(resolve, reject) {
      if(OPENVIDU_SERVER_SECRET != ""){
        resolve(OPENVIDU_SERVER_SECRET);
      }
      else {
    client.getSecretValue({SecretId: secretName}, function(err, data) {
        if (err) {
            if (err.code === 'DecryptionFailureException')
                // Secrets Manager can't decrypt the protected secret text using the provided KMS key.
                // Deal with the exception here, and/or rethrow at your discretion.
                reject(err);
            else if (err.code === 'InternalServiceErrorException')
                // An error occurred on the server side.
                // Deal with the exception here, and/or rethrow at your discretion.
                reject(err);
            else if (err.code === 'InvalidParameterException')
                // You provided an invalid value for a parameter.
                // Deal with the exception here, and/or rethrow at your discretion.
                reject(err);
            else if (err.code === 'InvalidRequestException')
                // You provided a parameter value that is not valid for the current state of the resource.
                // Deal with the exception here, and/or rethrow at your discretion.
                throw err;
            else if (err.code === 'ResourceNotFoundException')
                // We can't find the resource that you asked for.
                // Deal with the exception here, and/or rethrow at your discretion.
                reject(err);

            else if (err.code === 'AccessDeniedException')
                // We can't find the resource that you asked for.
                // Deal with the exception here, and/or rethrow at your discretion.
                reject(err);
        }
        else {
            // Decrypts secret using the associated KMS CMK.
            // Depending on whether the secret is a string or binary, one of these fields will be populated.

            if ('SecretString' in data) {
              OPENVIDU_SERVER_SECRET = data.SecretString;
                resolve(data.SecretString);
            } else {
                let buff = new Buffer(data.SecretBinary, 'base64');
                decodedBinarySecret = buff.toString('ascii');
                resolve(decodedBinarySecret);
            }
        }
        reject("something else went wrong...");
    });
  }
  });
}



// See https://openvidu.io/docs/reference-docs/REST-API/#post-apisessions
module.exports.createCallSession = async (sessionName) => {
    let sec = await getSecret();
    return new Promise((resolve, reject) => {
      return resolve("server-disabled");
      console.log("openvidu: requesting session for sessionName: ", sessionName);

      var data = JSON.stringify({ customSessionId: sessionName });
      var post_options = {
          host: OPENVIDU_SERVER_URL,
          port: '4443',
          path: "/api/sessions",
          method: 'POST',
          headers: {
            Authorization: 'Basic ' + Buffer.from('OPENVIDUAPP:' + OPENVIDU_SERVER_SECRET).toString('base64'),
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
          }
      };

      var post_req = http.request(post_options, function(res) {
      //  res.setEncoding('utf8');

        // reject on bad status
        if (res.statusCode < 200 || res.statusCode >= 300) {
          console.error('openvidu: session creation failed: ', res.statusCode);
          return reject(new Error('statusCode=' + res.statusCode));
        }
        // cumulate data
        var body = [];
        res.on('data', function(chunk) {
          body.push(chunk);
        });
        // resolve on end
        res.on('end', function() {
            try {
                data = JSON.parse(Buffer.concat(body).toString());
            } catch(e) {
                reject(e);
            }
            console.log("openvidu: created session ",data.id);
            resolve(data.id);
        });

        res.on('error', function (error) {
          console.error('openvidu: session creation failed: ', error);
          reject(error);
        });
      });

      // reject on request error
      post_req.on('error', function(err) {
          // This is not a "Second reject", just a different sort of failure
          console.log("on error");
          console.error('openvidu: session creation failed: ', error);
          reject(err);
      });
      post_req.write(data);

      // IMPORTANT
      post_req.end();

    });

}


module.exports.createTokens = async (sessionId, user1Uuid, user2Uuid) => {
  // See https://openvidu.io/docs/reference-docs/REST-API/#post-apitokens
  OPENVIDU_SERVER_SECRET=OPENVIDU_SERVER_SECRET == ""? await getSecret():OPENVIDU_SERVER_SECRET;
  let tokensFake = {};
  tokensFake[user1Uuid] = "server-disabled";
  tokensFake[user2Uuid] = "server-disabled";
  return tokensFake;

  var data = JSON.stringify({ session: sessionId });
  var post_options = {
      host: OPENVIDU_SERVER_URL,
      port: '4443',
      path: "/api/tokens",
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from('OPENVIDUAPP:' + OPENVIDU_SERVER_SECRET).toString('base64'),
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
  };

  let loadToken = undefined;
  loadToken = () => {
    return new Promise ((resolve,reject) => {
      console.log("openvidu: requesting tokens for : ", user1Uuid, user2Uuid);

      var post_req = http.request(post_options, function(res) {

        res.setEncoding('utf8');
        res.on('data', function (event) {
          const data = JSON.parse(event);
          console.log("openvidu: token created : ", data.id);
          resolve(data.id);
          });
          res.on('error', function (error) {
              console.error("openvidu: token creation failed : ", error);
             reject(error)
            });
        });

        // post the data
        post_req.write(data);
        post_req.end();
      });
  };

  let tokens = {};
  tokens[user1Uuid] = await loadToken();
  tokens[user2Uuid] = await loadToken();
  return tokens;
}
