'use strict';

const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const userDB  =  require( '../libs/user-db.js');

module.exports.update = async (event, context, callback) => {
  const data = JSON.parse(event.body);
  let authenticatedUser = event.requestContext.authorizer.principalId;

  try {
    if(!authenticatedUser || event.pathParameters.userId != authenticatedUser || data.uuid != authenticatedUser){
      callback(null, {statusCode: 401,body: JSON.stringify({message:"Not authenticated."}), headers: {'Access-Control-Allow-Origin': '*','Access-Control-Allow-Credentials': true,}});
      return;
    }
  } catch (e) {
    throw e;
  }
  return userDB.update(event.pathParameters.userId,data);

};
