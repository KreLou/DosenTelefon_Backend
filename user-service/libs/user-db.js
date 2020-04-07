'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
var http = require('https');


const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.findMatch =  async (userUuid) => {
  let returnData={};
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

  //TODO: And user is "active" => in lobby
  //TODO: find not the same user
  const paramsForScan = {
    TableName: process.env.DYNAMODB_TABLE,
    FilterExpression: "NOT contains (topicsNotOK, :topicsNotOK) AND #uuid <> :myself",
    ExpressionAttributeValues: {
      ':topicsNotOK': returnData.body.topicsOK,
      ':myself':userUuid
    },
    ExpressionAttributeNames:{
      '#uuid': 'uuid'
    },
    Limit: 1
  };

  console.log("searching match");
  let scanProm = new Promise(function(resolve, reject) {
    // fetch todo from the database
    dynamoDb.scan(paramsForScan, (error, data) => {
      if (error) {
        console.log("Error", err);
        returnData.statusCode = error.statusCode || 501;
        returnData.message = error.message;
        returnData.error = error;
        reject(error);
        return;
      } else {
        //console.log("Success", data.Items);
        if(data.Items.length != 0){
          //just take the first one
          let item = data.Items[0];
          returnData.statusCode =200;
          item.token = "***";
          item.newToken = "***";
          returnData.body = item;
          console.log("found match: ", returnData);
          resolve(returnData);
          return;
        }
        returnData.statusCode =404;
        returnData.body ="No match found yet."
        console.log(returnData.body);
        resolve(returnData);
        return;
      }

    });
  });
  return await scanProm;
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
        result.Item.token = "***";
        result.Item.newToken = "***";
        // create a response

        resolve(result.Item);
        return;
      }
      resolve(undefined);
      return;
    });
  });
}
