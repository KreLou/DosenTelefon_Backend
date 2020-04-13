'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
var ses = new AWS.SES({region: 'eu-west-1'});

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
      token: uuid.v4(),
      //newToken: "",
      topicsOK: data.topicsOK,
      topicsNotOK: data.topicsNotOK,
      active: false,
      pending: false,
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

    var username = params.Item.username == "" ? "" : " " + params.Item.username;

     var mailParams = {
        Destination: {
            ToAddresses: [params.Item.email]
            //ToAddresses: ["success@simulator.amazonses.com"]
        },
        Message: {
            Body: {
                Text: { Data:
                "Hallo"+username+"!\n"+
                "Du hast dich mit dieser Email beim DosenTelefon registriert.\n"+
                "Bitte nutze diesen Link https://dosen-telefon.de/register/"+params.Item.uuid+"/"+params.Item.token+", um dich anzumelden. Das geht jederzeit und von jedem Gerät aus. Dann kann der Dosen-Spaß auch schon direkt beginnen!\n"+
                "Zu deiner eigenen Sicherheit: gib diesen Link bitte nicht an andere weiter, sie könnten sich dann unter deinem Namen beim DosenTelefon anmelden.\n"+
                "Du hast dich nicht beim DosenTelefon registriert? Bitte ignoriere diese Email oder kontaktiere unseren Support https://dosen-telefon.de/abuse\n"+
                "Viel Spaß beim Verdrahten!\n"+
                "Die Dose\n"
                }

            },

            Subject: {
              Data:
              "Registrierung bei Dosen-Telefon.de"
            },
        },
        Source: "registrierung@dosen-telefon.de"
    };


     ses.sendEmail(mailParams, function (err, data) {
        callback(null, {err: err, data: data});
        if (err) {
            console.log(err);
            context.fail(err);
        } else {
            context.succeed(event);
        }
    });


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
