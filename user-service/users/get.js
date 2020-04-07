'use strict';

const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const userDB  =  require( '../libs/user-db.js');

module.exports.get = async (event, context, callback) => {
  console.log(event);
    let userUuid = event.pathParameters.userId;
    let result = await userDB.getUserDetails(userUuid);

    if(!result){
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
    else{
        // create a response
        const response = {
          statusCode: 404,
          body: JSON.stringify(result),
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
          },
        };
        callback(null, response);
    }
};
