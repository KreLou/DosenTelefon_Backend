'use strict';

const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.update = (event, context, callback) => {
  const timestamp = new Date().getTime();
  const data = JSON.parse(event.body);

//TODO: verify data
  // validation
/*  if (typeof data.uuid !== 'string') {
    console.error('Validation Failed');
    callback(null, {
      statusCode: 400,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Couldn\'t update the user.',
    });
    return;
  }*/
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      uuid: event.pathParameters.userId,
    },
    ExpressionAttributeNames: {
      '#token': 'token'
    },
    ExpressionAttributeValues: {
      ':username': data.username,
      ':topicsOK': data.topicsOK,
      ':topicsNotOK': data.topicsNotOK,
      ':active': data.active,
      ':updatedAt': timestamp
    },
    UpdateExpression: 'SET ' +//
                        'username = :username, ' +//
                        'email = :email, ' +//
                        '#token = :token, ' +//
                        'newToken = :newToken, ' +//
                        'topicsOK = :topicsOK, ' +//
                        'topicsNotOK = :topicsNotOK, ' +//
                        'active = :active, ' +//
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
        headers: { 'Content-Type': 'text/plain' },
        body: 'Couldn\'t fetch the user.\n'+error.message
        +'\n fnVersion: '+context.functionVersion
        +'\n functionName: '+context.functionName,
      });
      return;
    }

    // create a response
    const response = {
      statusCode: 200,
      body: JSON.stringify(result.Attributes),
    };
    callback(null, response);
  });
};
