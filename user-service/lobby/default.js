'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
var ses = new AWS.SES({region: 'eu-west-1'});

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.defaultHandler = (event, context, callback) => {
  const connectionId = event.requestContext.connectionId;

  console.log("Hello world");
  const timestamp = new Date().getTime();
  const data = JSON.parse(event.body);

  console.log("Default handler, got "+connectionId+" to dynamoDB");
//TODO: verify token
  const params = {
    TableName: process.env.CONNECT_TABLE,
    Key: {
      connectId: connectionId,
    },
    ExpressionAttributeNames: {
      '#user': 'user'
    },
    ExpressionAttributeValues: {
      ':user': data.uuid,
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
      console.log("Default handler, got "+connectionId+" to dynamoDB");

      return;
    }
  });

  const response = {
    statusCode: 200,
    body: 'connection updated'
  };
  callback(null, response);

};
