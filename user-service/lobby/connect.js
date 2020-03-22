'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
var ses = new AWS.SES({region: 'eu-west-1'});

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.connectHandler = (event, context, callback) => {
  const connectionId = event.requestContext.connectionId;


  const timestamp = new Date().getTime();
//  const data = JSON.parse(event.body);

  console.log("Connection created, Saving "+connectionId+" to dynamoDB");

  const params = {
    TableName: process.env.CONNECT_TABLE,
    Item: {
      uuid: uuid.v1(),
      //user:data.userUuid,
      connectId:connectionId,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  };

  // write the todo to the database
  dynamoDb.put(params, (error) => {
    // handle potential errors
    if (error) {
      console.error(error);

      callback(null, {
        statusCode: error.statusCode || 501,
        headers: {   'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
          'Content-Type': 'text/plain' },
        body: 'Couldn\'t update connection.\n'+error.message
        +'\n fnVersion: '+context.functionVersion
        +'\n functionName: '+context.functionName,
      });
      return;
    }
    console.log("Saved "+connectionId+" to dynamoDB");

  });
  const response = {
    statusCode: 200,
    body: 'Connected.'
  };
  callback(null, response);

};
