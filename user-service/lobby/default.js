'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

const connectionDB  =  require( '../libs/connection-db.js');
const userDB  =  require( '../libs/user-db.js');
const audioServer  =  require( '../libs/openvidu.js');
const websockets  =  require( '../libs/websockets.js');
const utils  =  require( '../libs/utils.js');

function wrapReturn(returnData){
  return {
    statusCode: returnData.statusCode,
    headers: {   'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
      'Content-Type': 'text/plain' },
    body: returnData.message
  }
}


module.exports.defaultHandler = async (event, context, callback) => {
  try {
    const connectionId = event.requestContext.connectionId;
    const data = JSON.parse(event.body);
    let userUuid =data.body.uuid;
    let returnData ={};
    //TODO: verify token
  /*
    var sessionIdTmp = await audioServer.createCallSession(utils.sha256(  new Date().getTime()));
    //create tokens for both users
    var tokens = await audioServer.createTokens(sessionIdTmp, "user1", "user2");
  await websockets.sendWebSocketMessage(connectionId, {
    "version" : 1,
    "event" : "call_request",
    "body" : {
        "openvidu": {
          "sessionId":sessionIdTmp,
          "token":tokens["user1"]
        },
        "username": "user2",
        "userUuid":"user2"
      }
    },event.requestContext.domainName);
    await websockets.sendWebSocketMessage(connectionId, {
      "version" : 1,
      "event" : "call_request",
      "body" : {
          "openvidu": {
            "sessionId":sessionIdTmp,
            "token":tokens["user2"]
          },
          "username": "user2",
          "userUuid":"user2"
        }
      },event.requestContext.domainName);
      callback(null, {
        statusCode: 200,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Send Demo Tokens callback',
      });
  return ;*/

    console.log("Default handler, got "+connectionId);

    if (typeof data.version !== 'number' || data.version !== 1) {
        console.error('incorrect message');
        callback(null, {
          statusCode: 400,
          headers: { 'Content-Type': 'text/plain' },
          body: 'Message invalid.',
        });
        return;
    }
    console.log("event:" +data.event);
    switch (data.event){
      case "link_user":

        console.log("link_user in database");
        returnData = await connectionDB.linkUserToConnection(connectionId,userUuid);
        console.log(returnData);
        if(returnData.statusCode != 200){
          return wrapReturn(returnData)
        }

        var match = await userDB.findMatch(userUuid);


        if(match == undefined){
          //don't send a websocket response back.
          return wrapReturn({statusCode:200,message:"No match, found waiting."});
        }
        else {
          console.log("found matching user '"+match.body.uuid+"'")
          //create session
          var sessionId = await audioServer.createCallSession(utils.sha256(match.body.uuid+userUuid+new Date().getTime()));

          //create tokens for both users
          var tokens = await audioServer.createTokens(sessionId, match.body.uuid, userUuid);
          //send both users the token
          //TODO make code nicer https://github.com/aws-samples/simple-websockets-chat-app/blob/master/sendmessage/app.js
          let connectionDetails,connectionId;

          connectionDetails = await connectionDB.getConnection(userUuid);
          if(connectionDetails.statusCode != 200){
            return wrapReturn(connectionDetails);
          }
          connectionId = connectionDetails.body.connectId;
          returnData = await websockets.sendWebSocketMessage(connectionId, {
            "version" : 1,
            "event" : "call_request",
            "body" : {
                "openvidu": {
                  "sessionId":sessionId,
                  "token":tokens[userUuid]
                },
                "username": userDB.getUserDetails(userUuid).name,
                "userUuid":userUuid
              }
            },event.requestContext.domainName);
            if(returnData.statusCode != 200){
              return wrapReturn(callback, returnData);
            }

            connectionDetails = await connectionDB.getConnection(match.body.userUuid);
            if(connectionDetails.statusCode != 200){
              return wrapReturn(connectionDetails);
            }
            connectionId = connectionDetails.body.connectId;

            returnData = await websockets.sendWebSocketMessage(connectionId, {
              "version" : 1,
              "event" : "call_request",
              "body" : {
                  "openvidu": {
                    "sessionId":sessionId,
                    "token":tokens[match.body.uuid]
                  },
                  "username": match.body.name,
                  "userUuid": match.body.uuid
                }
            },event.requestContext.domainName);
            if(returnData.statusCode != 200){
              return wrapReturn(callback, returnData);
            }
            else {
              return wrapReturn({statusCode:200,message:"Match found, tokens send."});
            }
        }

        break;
      default:
        var errorMsg = 'Unkown event '+data.event;
        console.error(errorMsg);
        return wrapReturn({
          statusCode: 400,
          headers: { 'Content-Type': 'text/plain' },
          body: errorMsg,
        });
        return;
      }
    }
    catch (errorMsg) {
      return wrapReturn({
        statusCode: 500,
        headers: { 'Content-Type': 'text/plain' },
        body: errorMsg,
      });
    } finally {

    }
};
