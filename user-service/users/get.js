'use strict';

const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const userDB  =  require( '../libs/user-db.js');

module.exports.get = async (event, context, callback) => {
    console.log(event);
    let userUuid = event.pathParameters.userId;
    let authenticatedUser = event.requestContext.authorizer.principalId;

    //auth
    try {
      if(!authenticatedUser || !event.pathParameters.userId  || event.pathParameters.userId != authenticatedUser){
        callback(null, {statusCode: 401,body: JSON.stringify({message:"Not authenticated."}), headers: {'Access-Control-Allow-Origin': '*','Access-Control-Allow-Credentials': true,}});
        return;
      }
    } catch (e) {
      throw e;
    }
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
          statusCode: 200,
          body: JSON.stringify(result),
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
          },
        };
        callback(null, response);
    }
};
