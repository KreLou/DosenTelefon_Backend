'use strict';

const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const userDB  =  require( '../libs/user-db.js');

module.exports.delete = async (event, context, callback) => {
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      uuid: event.pathParameters.userId,
    },
  };
  try {
    if(!event.headers.uuid || !event.headers.token || event.pathParameters.userId != event.headers.uuid  || !await userDB.auth(event.headers.uuid, event.headers.token)){
      return {statusCode: 401,body: JSON.stringify({message:"Not authenticated."}), headers: {'Access-Control-Allow-Origin': '*','Access-Control-Allow-Credentials': true}};

    }
  } catch (e) {
    throw e;
  }
  console.log("Deleting user");
  // delete the todo from the database
  let deleteProm =  new Promise(function(resolve, reject) {
    dynamoDb.delete(params, (error) => {
      // handle potential errors
      if (error) {
        console.error(error);
        reject({
          statusCode: error.statusCode || 501,
          headers: { 'Content-Type': 'text/plain' },
          body: 'Couldn\'t remove the user.',
        });
      }
      else {
        console.log("deleted user ",event.pathParameters.userId)
        // create a response

        resolve({
          statusCode: 200,
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({message:'User Deleted.'}),
        });
      }
    });
  });

  return deleteProm;
};
