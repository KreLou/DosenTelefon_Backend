'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.linkUserToConnection = (connectionId, userUuid) => {
  return new Promise((resolve,reject) => {
    console.log("linking "+connectionId+" with user "+userUuid);
    const timestamp = new Date().getTime();
    var returnData = {};
    const params = {
      TableName: process.env.CONNECT_TABLE,
      Key: {
        connectId: connectionId,
      },
      ExpressionAttributeNames: {
        '#user': 'user'
      },
      ExpressionAttributeValues: {
        ':user': userUuid,
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
        console.error("Error connecting user '"+userUuid+"' and connection '"+connectionId+"'")
        console.error(error);
        returnData.error = error;
        returnData.statusCode = error.statusCode || 501;
        returnData.message = error.message;
        reject(returnData);
      }
      else {
        returnData.statusCode = 200;
        returnData.message = "Connection saved."
        console.log("Connection for user ''"+userUuid+"'' and connection '"+connectionId+"' saved.")
        resolve(returnData);
      }
    });


  });
}

module.exports.getConnection = (userUuid) => {
  return new Promise(function(resolve, reject) {
    console.log("connection-db: loading connection for user: ",userUuid);
    let returnData={};
    const paramsForScan = {
      TableName: process.env.CONNECT_TABLE,
      FilterExpression: "#user = :user",
      ExpressionAttributeNames: {
        '#user': "user"
      },
      ExpressionAttributeValues: {
        ':user': userUuid
      },
      Limit: 1
    };

    // fetch todo from the database
    dynamoDb.scan(paramsForScan, (error, data) => {
      if (error) {
        console.error("connection-db: loading failed: ",error);
        reject(error);
      } else {
        console.log("connection-db: loaded: ", data.Items);
        if(data.Items && data.Items.length != 0){
          //just take the first one
          let item = data.Items[0];
          returnData.statusCode =200;
          returnData.body = item;
        }
        else {
          returnData.statusCode = 404;
          returnData.message="Connection for user '"+userUuid+"' not found.";
          console.log("connection-db: ", returnData.message);

        }
        resolve(returnData);
      }

    });
  });
}
