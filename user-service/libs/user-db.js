'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
var http = require('https');
const utils  =  require( '../libs/utils.js');


const dynamoDb = new AWS.DynamoDB.DocumentClient();



module.exports.findMatch =  async (userUuid) => {
  let returnData={},data;
  const paramsForGet = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      uuid: userUuid,
    }
  };
  console.log("searching user '"+userUuid+"' in user table ");
  let getProm = new Promise(function(resolve, reject) {
    dynamoDb.get(paramsForGet, (error, result) => {
      // handle potential errors
      if (error) {
        returnData.statusCode = error.statusCode || 501;
        returnData.message = error.message;
        returnData.error = error;
        reject(returnData);
        return;
      }

      if(result.Item){
        returnData.statusCode =200;
        result.Item.token = "***";
        result.Item.newToken = "***";
        returnData.body = result.Item;
        // create a response
        resolve(returnData);
        return;
      }
    });
  });
  returnData = await getProm;
  console.log("search result: ",returnData);
  if(returnData.statusCode != 200 ){
    return returnData;
  }

  //find users which do not have things in interessted where the other have it in notInteressted.
  const paramsForScan = {
    TableName: process.env.DYNAMODB_TABLE,
    FilterExpression: "NOT contains (topicsNotOK, :topicsNotOK) AND #uuid <> :myself AND active = :true AND pending = :false",
    ExpressionAttributeValues: {
      ':topicsNotOK': returnData.body.topicsOK,
      ':myself':userUuid,
      ':true':true,
      ':false':false

    },
    ExpressionAttributeNames:{
      '#uuid': 'uuid'
    }
  };

  console.log("searching match");
  try {
    data = await utils.scanWithLimit(paramsForScan,1);
  } catch (e) {
    throw e;
  }

  if(data && data.length != 0){
    returnData.statusCode =200;
    returnData.body = hideSecureData(data[0]);
    return returnData
  }

  console.log("No match found yet.");
  return;
}

function hideSecureData(data){
  data.token = "***";
  data.newToken = "***";
  return data;
}

module.exports.getUserDetails = async (userUuid) => {
  return new Promise(function(resolve, reject) {
    const params = {
      TableName: process.env.DYNAMODB_TABLE,
      Key: {
        uuid: userUuid,
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
        result.Item = hideSecureData(result.Item);

        // create a response

        resolve(result.Item);
        return;
      }
      resolve(undefined);
      return;
    });
  });
}


module.exports.auth = (uuid, token) => {
  return new Promise(function(resolve, reject) {
        const params = {
          TableName: process.env.DYNAMODB_TABLE,
          Key: {
            uuid: uuid,
          },
        };

        // fetch todo from the database
        dynamoDb.get(params, (error, result) => {
          // handle potential errors
          if (error) {
            throw new Error(error);
          }
          console.log(`Found user ${uuid} in database.`);
          if(result && result.Item && result.Item.token && result.Item.token == token){
            console.log(`token matched.`);

            resolve(true);
            return true;
          }
          else {
            console.log(`token did not match. ${result.Item.token} == ${token}`);

            resolve(false);
            return false;
          }
        });
      });
}


module.exports.update = (userId, data) => {

  return module.exports.getUserDetails(userId).then((userDetails)=>{
   return new Promise(function(resolve, reject) {
     const timestamp = new Date().getTime();
     console.log(data);
     const params = {
       TableName: process.env.DYNAMODB_TABLE,
       Key: {
         uuid: userId,
       },
       ExpressionAttributeValues: {
         ':username': data.username ? data.username : userDetails.username,
         ':topicsOK': data.topicsOK ? data.topicsOK : userDetails.topicsOK,
         ':topicsNotOK': data.topicsNotOK ? data.topicsNotOK : userDetails.topicsNotOK,
         ':updatedAt': timestamp
       },
       UpdateExpression: 'SET ' +//
                           'username = :username, ' +//
                           'topicsOK = :topicsOK, ' +//
                           'topicsNotOK = :topicsNotOK, ' +//
                           'updatedAt = :updatedAt',
       ReturnValues: 'ALL_NEW',
     };

     // update the todo in the database
     dynamoDb.update(params, (error, result) => {
       // handle potential errors
       if (error) {
         console.error("Error while updating user", error);
         reject(error);
         return;
       }

       // create a response
       resolve({
         statusCode: 200,
         body: JSON.stringify(hideSecureData(result.Attributes)),
         headers: {
           'Access-Control-Allow-Origin': '*',
           'Access-Control-Allow-Credentials': true,
         },
       });
     });
   });
   });

}

module.exports.activeState = (userId, state) => {
  return new Promise(function(resolve, reject) {
    const timestamp = new Date().getTime();
    const params = {
      TableName: process.env.DYNAMODB_TABLE,
      Key: {
        uuid: userId,
      },
      ExpressionAttributeValues: {
        ':active': state,
        ':updatedAt': timestamp
      },
      UpdateExpression: 'SET ' +//
          'active = :active, ' +//
          'updatedAt = :updatedAt',
      ReturnValues: 'ALL_NEW',
    };

    // update the todo in the database
    dynamoDb.update(params, (error, result) => {
      // handle potential errors
      if (error) {
        console.error("Error while updating user", error);
        reject(error);
        return;
      }

      // create a response
      resolve({
        statusCode: 200,
        body: JSON.stringify(hideSecureData(result.Attributes)),
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
      });
    });
  });
}

module.exports.pendingState = (userId, state) => {
  return new Promise(function(resolve, reject) {
    const timestamp = new Date().getTime();
    const params = {
      TableName: process.env.DYNAMODB_TABLE,
      Key: {
        uuid: userId,
      },
      ExpressionAttributeValues: {
        ':pending': state,
        ':updatedAt': timestamp
      },
      UpdateExpression: 'SET ' +//
          'pending = :pending, ' +//
          'updatedAt = :updatedAt',
      ReturnValues: 'ALL_NEW',
    };

    // update the todo in the database
    dynamoDb.update(params, (error, result) => {
      // handle potential errors
      if (error) {
        console.error("Error while updating user", error);
        reject(error);
        return;
      }

      // create a response
      resolve({
        statusCode: 200,
        body: JSON.stringify(hideSecureData(result.Attributes)),
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
      });
    });
  });
}
