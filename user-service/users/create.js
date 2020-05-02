'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
var ses = new AWS.SES({region: 'eu-west-1'});
AWS.config.update({region: 'eu-west-1'});

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.create = async (event, context, callback) => {
  const timestamp = new Date().getTime();
  let data;
  try {
    data = JSON.parse(event.body);
  } catch (e) {
    const response = {
      statusCode: 500,
      body: JSON.stringify(e.message),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
    return;
  } finally {

  }

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

  let mailParams ={};

  //database
  return new Promise(function(resolve, reject) {
    dynamoDb.put(params, (error) => {
      // handle potential errors
      if (error) {
        return reject(error);
      }
      return resolve(params.Item);
    });
  })
  //sns
  .then((item)=> {
      return new Promise(function(resolve, reject) {
        let snsMessage = `https://dosen-telefon.de/register/${item.uuid}/${item.token}`;
        var params = {
           Message: snsMessage,
           TopicArn: 'arn:aws:sns:eu-west-1:133355712185:dosen-telefon-registrations',
           Subject: `${item.email}`
         };

         return new AWS.SNS({apiVersion: '2010-03-31'}).publish(params).promise().then(
           function(data) {
             console.log(`Message ${params.Message} send sent to the topic ${params.TopicArn}`);
             console.log("MessageID is " + data.MessageId);
             resolve(item);
           }).catch(
             function(err) {
             console.error(err, err.stack);
           });

         });
  })
  //mail
  .then((item)=>{

    return new Promise(function(resolve, reject) {
      var username = item.username == "" ? "" : " " + item.username;

      mailParams = {
         Destination: {
             ToAddresses: [item.email]
             //ToAddresses: ["success@simulator.amazonses.com"]
         },
         Message: {
             Body: {
                 Text: { Data:
                 "Hallo"+username+"!\n"+
                 "Du hast dich mit dieser Email beim DosenTelefon registriert.\n"+
                 "Bitte nutze diesen Link https://dosen-telefon.de/register/"+item.uuid+"/"+item.token+", um dich anzumelden. Das geht jederzeit und von jedem Gerät aus. Dann kann der Dosen-Spaß auch schon direkt beginnen!\n"+
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
             if (err) {
              return reject(err);
             } else {
              return resolve(item);
             }
         });
    });
  })
  //return
  .then((item)=>{
    //remove token from response
    item.token = "***";
    // create a response
    const response = {
      statusCode: 200,
      body: JSON.stringify(item),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };

    return callback(null, response);
  });
};
