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

async function getSecret(){
  secret =  await new Promise(function(resolve, reject) {
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
                secret = data.SecretString;
                resolve(secret);
            } else {
                let buff = new Buffer(data.SecretBinary, 'base64');
                decodedBinarySecret = buff.toString('ascii');
            }
        }
        // Your code goes here.
    });
  });
  return secret;
}

// See https://openvidu.io/docs/reference-docs/REST-API/#post-apisessions
module.exports.createCallSession = async (sessionName) => {

    OPENVIDU_SERVER_SECRET=OPENVIDU_SERVER_SECRET == ""? await getSecret():OPENVIDU_SERVER_SECRET;
    return  new Promise((resolve, reject) => {
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

module.exports.createTokens = async (sessionId, user1Uuid, user2Uuid) => {
  // See https://openvidu.io/docs/reference-docs/REST-API/#post-apitokens
  OPENVIDU_SERVER_SECRET=OPENVIDU_SERVER_SECRET == ""? await getSecret():OPENVIDU_SERVER_SECRET;

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

      var post_req = http.request(post_options, function(res) {

        res.setEncoding('utf8');
        res.on('data', function (event) {
          const data = JSON.parse(event);
          resolve(data.id);
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
  };

  let tokens = {};
  tokens[user1Uuid] = await loadToken();
  tokens[user2Uuid] = await loadToken();
  return tokens;
}
