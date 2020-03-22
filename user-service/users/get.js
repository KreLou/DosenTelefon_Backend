'use strict';

const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.get = (event, context, callback) => {
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      uuid: event.pathParameters.userId,
    },
  };
  console.log("got request uuid: "+ event.pathParameters.userId);
  console.log("query with params");
  console.log(params);
  // fetch todo from the database
  dynamoDb.get(params, (error, result) => {
    // handle potential errors
    if (error) {
      console.error(error);
      callback(null, {
        statusCode: error.statusCode || 501,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Couldn\'t fetch the user.',
      });
      return;
    }
    console.log("result: ");
    console.log(result);

    if(result.Item){
      result.Item.token = "***";
      result.Item.newToken = "***";
      // create a response
      const response = {
        statusCode: 200,
        body: JSON.stringify(result.Item),
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
      };
      callback(null, response);
    }
    if(!result.Item){
      // create a response
      const response = {
        statusCode: 404,
        body: JSON.stringify({message:"User not found. "}),
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
      };
      callback(null, response);
    }


  });
};
