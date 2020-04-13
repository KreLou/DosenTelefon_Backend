'use strict';

const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const userDB  =  require( '../libs/user-db.js');

module.exports.update = (event, context, callback) => {
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
//TODO: auth
  return userDB.update(event.pathParameters.userId,data);

};
