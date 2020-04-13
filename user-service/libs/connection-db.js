'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const connectionDB  =  require( '../libs/connection-db.js');
const userDB  =  require( '../libs/user-db.js');

module.exports.linkUserToConnection = (connectionId, userUuid) => {
  let updateProm = new Promise((resolve,reject) => {
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


  return updateProm.then(()=>{
    return userDB.activeState(userUuid,true);
  });
}

module.exports.getConnection = async (userUuid) => {

    if(userUuid == undefined){
      return {statusCode :401 , message:"userUuid needs to be set"};
    }
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
    let data;
    let scanCompleted = false;
    // fetch todo from the database

    while (!scanCompleted){

      data = await scanForConnection(paramsForScan);

      console.log("data after scan: ", data);
      if(data.Items && data.Items.length == 0 && data.LastEvaluatedKey != undefined){
        paramsForScan.ExclusiveStartKey = data.LastEvaluatedKey;
      }
      else {
        scanCompleted = true;
      }
    }
    console.log("scanCompleted",scanCompleted);
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
    return returnData;
}

function scanForConnection(paramsForScan){
  return new Promise(function(resolve, reject) {
    dynamoDb.scan(paramsForScan, (error, data) => {
      if (error) {
        console.error("connection-db: loading failed: ",error);
        reject(error);
      } else {
        console.log("connection-db: loaded: ", data);
        resolve(data);
      }

    });
  });

}

module.exports.getConnectionByConnectionId = (connectId) => {
  return new Promise(function(resolve, reject) {

    const params = {
      TableName: process.env.CONNECT_TABLE,
      Key: {
        connectId: connectId,
      },
    };

    // fetch todo from the database
    dynamoDb.get(params, (error, result) => {
      // handle potential errors
      if (error) {
        console.error(error);
        reject(error);
        return;
      }

      if(result.Item){
        // create a response
        resolve(result.Item);
        return;
      }
      resolve(undefined);
      return;
    });
  });
}

module.exports.deleteConnection = async (connectId) => {

  let connection = await module.exports.getConnectionByConnectionId(connectId);
  if(connection == undefined){
    return new Promise(function(resolve, reject) {
      reject(`Connection '${connectionId}' not found `);
    });
  }
  const params = {
    TableName: process.env.CONNECT_TABLE,
    Key: {
      connectId: connectId,
    },
  };
  let deleteProm = new Promise(function(resolve, reject) {
    // delete the todo from the database
    dynamoDb.delete(params, (error) => {
      // handle potential errors
      if (error) {
        console.error("Error removing connection ", error);
        reject(error);
        return;
      }
      resolve({statusCode : 200, message:`Removed ${connectId} from dynamoDB`});

    });
  });

  return deleteProm.then(()=>{
    return userDB.activeState(connection.user,false);
  });
}
