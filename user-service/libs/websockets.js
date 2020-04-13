'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies


module.exports.sendWebSocketMessage = async (connectionId, postData,domainName) =>{
  let returnData = {};
  let connectionData;
  console.log("sending response to connection " + connectionId);
  const apigwManagementApi = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: domainName
  });

  try {
    let send = undefined;
     send = async (connectionId, postData) => {
       await apigwManagementApi.postToConnection({ ConnectionId: connectionId, Data: JSON.stringify(postData)  }).promise();
     }
     await send(connectionId, postData);
     returnData.statusCode = 200;
     returnData.message = `Message send to connection ${connectionId}`
  } catch (e) {
    returnData.statusCode = e.statusCode;
    if (e.statusCode === 410) {
      returnData.message = `Found stale connection ${connectionId}`;
      returnData.error = e;
      returnData.statusCode = e.statusCode;
      return returnData;
    } else {
      throw e;
    }
  }
  return returnData;
}
