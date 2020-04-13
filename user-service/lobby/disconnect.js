'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
var ses = new AWS.SES({region: 'eu-west-1'});

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const connectionDB  =  require( '../libs/connection-db.js');

module.exports.disconnectHandler = async (event, context, callback) => {
  const timestamp = new Date().getTime();
  const connectionId = event.requestContext.connectionId;
  console.log("Disconnect, removing "+connectionId+" from dynamoDB");

  let response = await connectionDB.deleteConnection(connectionId);
  response.body = response.message;
  callback(null, response);

};
