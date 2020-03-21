'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.create = (event, context, callback) => {
  const timestamp = new Date().getTime();
  const data = JSON.parse(event.body);
  //TODO: verify data

/*if (typeof data.uuid !== 'string') {
    console.error('Validation Failed');
    callback(null, {
      statusCode: 400,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Couldn\'t create the user.',
    });
    return;
  }*/
/*  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      email: data.email,
    },
  };

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
    }*/
  //  result.Item.





  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Item: {
      uuid: uuid.v1(),
      username: data.username,
      email: data.email,
      token: uuid.v1(),
      //newToken: "",
      topicsOK: data.topicsOK,
      topicsNotOK: data.topicsNotOK,
      active: false,
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
        headers: { 'Content-Type': 'text/plain' },
        body: 'Couldn\'t create the user. \n'+error.message
        +'\n fnVersion: '+context.functionVersion
        +'\n functionName: '+context.functionName
        ,
      });
      return;
    }

    //remove token from response
    params.Item.token = "***";
    // create a response
    const response = {
      statusCode: 200,
      body: JSON.stringify(params.Item),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  });
};
