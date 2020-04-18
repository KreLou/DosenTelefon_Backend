'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const connectionDB  =  require( '../libs/connection-db.js');
const userDB  =  require( '../libs/user-db.js');
const utils  =  require( '../libs/utils.js');

module.exports.auth =  async (event, context, callback) => {
  console.log(event);
  var authorizationHeader = event.authorizationToken
  if (!authorizationHeader) return callback('Unauthorized')
  var encodedCreds = authorizationHeader.split(' ')[1]
  var decodedCreds = (new Buffer.alloc(73, encodedCreds, 'base64'));

  var plainCreds = decodedCreds.toString().split(':')
  var username = plainCreds[0]
  var password = plainCreds[1]

  if(!username|| !password || !await userDB.auth(username, password)){
    return callback('Unauthorized');
  }

  console.log("authenticated!");
  var authResponse = buildAllowAllPolicy(event, username)

  callback(null, authResponse)
}

function buildAllowAllPolicy (event, principalId) {
  var apiOptions = {}
  var tmp = event.methodArn.split(':')
  var apiGatewayArnTmp = tmp[5].split('/')
  var awsAccountId = tmp[4]
  var awsRegion = tmp[3]
  var restApiId = apiGatewayArnTmp[0]
  var stage = apiGatewayArnTmp[1]
  var apiArn = 'arn:aws:execute-api:' + awsRegion + ':' + awsAccountId + ':' +
    restApiId + '/' + stage + '/*/*'
  const policy = {
    principalId: principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: 'Allow',
          Resource: [apiArn]
        }
      ]
    }
  }
  return policy
}
