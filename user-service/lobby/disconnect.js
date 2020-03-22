'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
var ses = new AWS.SES({region: 'eu-west-1'});

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.disconnectHandler = (event, context, callback) => {
  const timestamp = new Date().getTime();
  const connectionId = event.requestContext.connectionId;
  console.log("Disconnect, removing "+connectionId+" from dynamoDB");

  const params = {
    TableName: process.env.CONNECT_TABLE,
    Key: {
      connectId: connectionId,
    },
  };

  // delete the todo from the database
  dynamoDb.delete(params, (error) => {
    // handle potential errors
    if (error) {
      console.error(error);
      callback(null, {
        statusCode: error.statusCode || 501,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Couldn\'t remove the user.'+error.message
        +'\n fnVersion: '+context.functionVersion
        +'\n functionName: '+context.functionName,
      });
      return;
    }
    console.log("Removed "+connectionId+" from dynamoDB");

  });
  const response = {
    statusCode: 200,
    body: 'Disonnected. '+connectionId
  };
  callback(null, response);

};
