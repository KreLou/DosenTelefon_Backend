'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

const connectionDB  =  require( '../libs/connection-db.js');
const userDB  =  require( '../libs/user-db.js');
const audioServer  =  require( '../libs/openvidu.js');
const websockets  =  require( '../libs/websockets.js');
const utils  =  require( '../libs/utils.js');

function wrapReturn(returnData){
  let ret={
    "statusCode": returnData.statusCode,
    "headers": {   'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
      'Content-Type': 'text/plain' },
    "body": returnData.message
  };
  console.log("returning", ret);
  return ret;
}


module.exports.defaultHandler = async (event, context, callback) => {
  try {
    const connectionId = event.requestContext.connectionId;
    let returnData ={};
    const data = JSON.parse(event.body);

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

    if (typeof data.version !== 'number' || data.version !== 1 || !data.auth || !data.auth.uuid || !data.auth.token) {
        console.error('incorrect message');
        callback(null, {
          statusCode: 400,
          headers: { 'Content-Type': 'text/plain' },
          body: 'Message invalid.',
        });
        return;
    }

    try {
      if(!data.auth.uuid || !data.auth.token || !await userDB.auth(data.auth.uuid, data.auth.token)){
        console.error("authentication failed.")

        await websockets.sendWebSocketMessage(connectionId, {
          "version" : 1,
          "event" : "authentication_failed",
          "body" : {
              "message":"Authentication failed!"
            }
        },event.requestContext.domainName);
        return {statusCode: 401,body: JSON.stringify({message:"Not authenticated."}), headers: {'Access-Control-Allow-Origin': '*','Access-Control-Allow-Credentials': true,}};

      }
    } catch (e) {
      throw e;
    }



  console.log("Event: " +data.event);

    switch (data.event){
      case "link_user":

        let userUuid =data.body.uuid;
        let peerId =data.body.peerId;
        if(userUuid != data.auth.uuid){
          callback(null, {statusCode: 401,body: JSON.stringify({message:"Not authenticated."}), headers: {'Access-Control-Allow-Origin': '*','Access-Control-Allow-Credentials': true,}});
          return;
        }
        console.log("link_user in database");
        returnData = await connectionDB.linkUserToConnection(connectionId,userUuid,peerId);
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

          //load both connections
          let connectionNewUser = await connectionDB.getConnection(userUuid);
          console.log("after getConnection",connectionNewUser);
          if(connectionNewUser.statusCode != 200){
            console.log("could not find session for user connectionNewUser '"+userUuid+"': ", connectionNewUser);
            return wrapReturn(connectionNewUser);
          }
          let connectionIdNewUser = connectionNewUser.body.connectId;


          let connectionExistingUser = await connectionDB.getConnection(match.body.uuid);
          if(connectionExistingUser.statusCode != 200){
            console.log("could not find session for user connectionExistingUser '"+match.body.uuid+"': ", connectionExistingUser);
            return wrapReturn(connectionExistingUser);
          }
          let connectionIdExistingUser = connectionExistingUser.body.connectId;

          returnData = await websockets.sendWebSocketMessage(connectionIdNewUser, {
            "version" : 1,
            "event" : "call_request",
            "body" : {
                "openvidu": {
                  "sessionId":sessionId,
                  "token":tokens[userUuid]
                },
                "peerId":connectionExistingUser.body.peerId,
                "username": userDB.getUserDetails(userUuid).name,
                "userUuid":userUuid
              }
            },event.requestContext.domainName);
            console.log("returnData.statusCode",returnData.statusCode);
          if(returnData.statusCode != 200){
            console.log("sending message to websocket failed: ", returnData);
            if (returnData.statusCode == 410){
              //staled connection, removing
              let returnData = await connectionDB.deleteConnection(connectionIdNewUser);
            }
            return wrapReturn(callback, returnData);
          }


          returnData = await websockets.sendWebSocketMessage(connectionIdExistingUser, {
            "version" : 1,
            "event" : "call_request",
            "body" : {
                "openvidu": {
                  "sessionId":sessionId,
                  "token":tokens[match.body.uuid]
                },
                "peerId":connectionNewUser.body.peerId,
                "username": match.body.name,
                "userUuid": match.body.uuid
              }
          },event.requestContext.domainName);
          if(returnData.statusCode != 200){
              if (returnData.statusCode == 410){
              //staled connection, removing
              let returnData = await connectionDB.deleteConnection(connectionIdExistingUser);
            }
            console.log("sending message to websocket failed: ", returnData);
            return wrapReturn(callback, returnData);
          }

          //both user informed, mark as pending

          await userDB.pendingState(userUuid, true);
          await userDB.pendingState(match.body.uuid, true);


        return wrapReturn({statusCode:200,message:"Match found, tokens send."});

      }

        break;
      case "call_accepted":
          let connection = {};
          try {
            await connectionDB.getConnectionByConnectionId(connectionId
            ).then((con)=>{
              connection = con;
              return userDB.activeState(connection.user,false);
            }).then(()=>{
             return userDB.pendingState(connection.user,false)
            });
          } catch (e) {
            return wrapReturn({
              statusCode: 400,
              headers: { 'Content-Type': 'text/plain' },
              body: `Error removing user from lobby ${e.message}`
            });
          }

          return wrapReturn({
            statusCode: 200,
            headers: { 'Content-Type': 'text/plain' },
            body: "User removed from lobby."
          });
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
      console.error(errorMsg);
      return wrapReturn({
        statusCode: 500,
        headers: { 'Content-Type': 'text/plain' },
        body: errorMsg,
      });
    } finally {

    }
};
