//
// This is main file containing code implementing the Express server and functionality for the Express echo bot.
//
'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const path = require('path');
const wit = require('node-wit').Wit;
const log = require('node-wit').log;
const WIT_TOKEN = 'PUT_YOUR_ACCESS_TOKEN';
var messengerButton = "<html><head><title>Facebook Messenger Bot</title></head><body><h1>Facebook Messenger Bot</h1>This is a bot based on Messenger Platform QuickStart. For more details, see their <a href=\"https://developers.facebook.com/docs/messenger-platform/guides/quick-start\">docs</a>.<script src=\"https://button.glitch.me/button.js\" data-style=\"glitch\"></script><div class=\"glitchButton\" style=\"position:fixed;top:20px;right:20px;\"></div></body></html>";

// The rest of the code implements the routes for our Express server.
let app = express();
var mobileRechargeJSON={};
var dthRechargeJSON={};
var prevCommand = '';

// google-translate
const translate = require('google-translate-api');
const languages = require('google-translate-api/languages');
var language = 'en';
var targetLang = 'en';
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

callMobileRechargesApi();
callDTHRechargesApi();
// wit.ai interaction
const client = new wit({accessToken: WIT_TOKEN});

// Webhook validation
app.get('/webhook', function(req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === 'webhooktoken') {
    console.log("Validating webhook");
    
    res.status(200).send(req.query['hub.challenge']);
  } else {

    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);          
  }
});

// Display the web page
app.get('/', function(req, res) {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.write(messengerButton);
  res.end();
});

// Message processing
app.post('/webhook', function (req, res) {
  //console.log(req.body);
  var data = req.body;

  // Make sure this is a page subscription
  if (data.object === 'page') {
    //console.log(data.entry.changes);
    // Iterate over each entry - there may be multiple if batched
    data.entry.forEach(function(entry) {
      var pageID = entry.id;
      var timeOfEvent = entry.time;

      // Iterate over each messaging event
      entry.messaging.forEach(function(event) {
        if (event.message) {
          receivedMessage(event);
        } else if (event.postback) {
          receivedPostback(event);   
        } else {
          console.log("Webhook received unknown event: ", event);
        }
      });
    });

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know
    // you've successfully received the callback. Otherwise, the request
    // will time out and we will keep trying to resend.
    res.sendStatus(200);
  }
});

// function getLang(res){
//   return res.from.language.iso;
// }

function getTranslatedMessage(msg,lang){
  translate(msg, {to: lang}).then(res => {
    console.log("response: "+res.text);
    targetLang = res.from.language.iso;

    return res.text;
    
  }).catch(err => {
    console.error(err);
    return "error";
  });
}

function getMobileRecharges(body){
  
  mobileRechargeJSON = body;
  //console.log(mobileRechargeJSON);
}

function getDTHRecharges(body){
  
  dthRechargeJSON = body;
}

function callMobileRechargesApi(){
  request({
    uri: 'https://private-a8ad69-dairtelbot.apiary-mock.com/getplans',
    proxy: null
  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      //console.log(body);
      getMobileRecharges(body);

      console.log("Successfully get recharge plans");
    } else {
      console.error("Unable to retrieve recharges.");
      //console.error(response);
      console.error("error in callMobileRechargesApi is - "+error);
    }
  });  
}

function callDTHRechargesApi(){
  request({
    uri: 'https://private-de788-getdth.apiary-mock.com/getDTH',
    proxy: null
  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      //console.log(body);
      getDTHRecharges(body);

      console.log("Successfully get dth recharge plans");
    } else {
      console.error("Unable to retrieve dth recharges.");
      //console.error(response);
      console.error("error in callDTHRechargesApi is - "+error);
    }
  });  
}

var entityName = '';

function getEntity(param){
  entityName = param;
  //console.log(entityName);
}

function setPrevCommand(param){
  prevCommand = param;
  //console.log(prevCommand);
}

var booleanLangCheck = false;
// Incoming events handling
function receivedMessage(event) {
  
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  // console.log("Received message for user %d and page %d at %d with message:", 
  // senderID, recipientID, timeOfMessage);
  // console.log(JSON.stringify(message));

  var messageId = message.mid;

  var messageText = message.text;
  
  //console.log(messageText.length);

  translate(messageText, {to: 'en'}).then(res => {
    //console.log("response: "+res.text);
    if(isNaN(messageText))
    {
      targetLang = res.from.language.iso;
    }
    

  console.log(targetLang);

    messageText = res.text;
messageText = messageText.replace('null',"");
    // wit.ai
  client.message(messageText, {})
  .then((data) => {
    //console.log('Yay, got Wit.ai response: ' + JSON.stringify(data));
    //console.log(messageText);
    //var jsonData = JSON.parse(data);
    //console.log(data.entities);
    var keys = Object.keys(data.entities);
      //console.log(keys);
      //getEntity(JSON.stringify(keys[0]));
      var messageAttachments = message.attachments;
      entityName = keys[0];
      console.log(data);
    var jsonData = JSON.parse(mobileRechargeJSON);
    var dthJsonData = JSON.parse(dthRechargeJSON);

      if (entityName && isNaN(data._text)) {
    //console.log("yeh jo entity hai"+entityName);
    // If we receive a text message, check to see if it matches a keyword
    // and send back the template example. Otherwise, just echo the text we received.
    
    switch (entityName) {

      case 'mobile_recharge':
        //console.log("i am in mobile recharge");
        setPrevCommand('mobile_recharge');
        var output = 'Choose from the following options: \n';

        for(var i=0; i < jsonData.getplans.length; i++){
          // console.log(jsonData.getplans[i].rechargeType);

            output += i+1 + ". " + (jsonData.getplans[i].rechargeType) + '\n';
        }

        translate(output, {to: targetLang}).then(res => {
          sendTextMessage(senderID, res.text);
        }).catch(err => {
          console.error(err);
          return "error";
        });
        break;

        case 'dth_plans':
        setPrevCommand('dth_plans');
        var output = 'Choose from the following options: \n';


        for(var i=0; i < dthJsonData.getdthplans.length; i++){
          // console.log(jsonData.getplans[i].rechargeType);

            output += i+1 + ". " + (dthJsonData.getdthplans[i].rechargeType) + '\n';
        }
        
        translate(output, {to: targetLang}).then(res => {
          sendTextMessage(senderID, res.text);
        }).catch(err => {
          console.error(err);
          return "error";
        });
        break;

        case 'need_sim':
        var output = 'Please visit the Airtel Store to get a 4G sim/micro sim/nano sim. Alternately visit http://www.airtel.in/4g/sim-swap to have your sim home delivered.';
        translate(output, {to: targetLang}).then(res => {
          sendTextMessage(senderID, res.text);
        }).catch(err => {
          console.error(err);
          return "error";
        });
        break;

        case 'recharge_not_reflected':
        var output = "You may check the status of your recent recharges using the following avenues: Sign in to your account using your prepaid mobile number on airtel.in . Click on the Recharge History tab on your account home screen to get the status of your recharges. Dial *121*3# to check your recent recharges Download myAirtel app and add your prepaid account on it using the ‘Add account’ link under the ‘my accounts’ section on the homepage. Tap on the prepaid account from the home screen and select Recharge History to get the status of your recharge. Please note only recharges made through myAirtel app are shown here.";
        translate(output, {to: targetLang}).then(res => {
          sendTextMessage(senderID, res.text);
        }).catch(err => {
          console.error(err);
          return "error";
        });
        break;

        case 'last_three_bills':
        var output = 'Visit https://www.airtel.in/personal/myaccount/postpaid/ to view, download or email your last bills to your registered email id.'
        translate(output, {to: targetLang}).then(res => {
          sendTextMessage(senderID, res.text);
        }).catch(err => {
          console.error(err);
          return "error";
        });
        break;

        case 'change_my_plan':
        var output = 'You may check your current bill plan benefits and change your plan by using one of the below: Login to airtel.in with your registered mobile number and click on My Plan to view your current plan benefits and change to any desired plan. Download myairtel app and visit the My Account-> Plan section to view your current plan benefits. You need to choose the myPlan category, define the freebies and then add boosters (optional) to complete the change plan request.';
        translate(output, {to: targetLang}).then(res => {
          sendTextMessage(senderID, res.text);
        }).catch(err => {
          console.error(err);
          return "error";
        });
        break;

        case 'greetings':
        var output = 'Hey there, This is sevak the chatbot. Ask me for mobile/dth recharges or other FAQs. You can ask in your native language also.';
        sendTextMessage(senderID,output);
        break;

        case 'location':
        var output = 'https://www.google.co.in/maps/place/airtel+store+in+' + data.entities.location[0].value ;
        sendTextMessage(senderID,output);
        output = 'Visit https://www.airtel.in/store to view store details';
        translate(output, {to: targetLang}).then(res => {
          sendTextMessage(senderID, res.text);
        }).catch(err => {
          console.error(err);
          return "error";
        });
        break;

        // case 'airtel_store':
        // var output = 'Visit https://www.airtel.in/store to view store details';
        // translate(output, {to: targetLang}).then(res => {
        //   sendTextMessage(senderID, res.text);
        // }).catch(err => {
        //   console.error(err);
        //   return "error";
        // });
        // break;

      default:
        //console.log("yeh jo entity hai"+entityName);
        sendTextMessage(senderID, "Sorry I couldn't understand!!! Please try again.");
    }
  }else if (prevCommand){
    //console.log(parseInt(messageText));
      if(prevCommand === 'mobile_recharge'){
          var output = '';
              if(parseInt(messageText) === 1){
                for(var i=0; i < jsonData.getplans[0].choices.length; i++){
             //console.log(jsonData.getplans[0].choices[i].Detail);
            output += "Detail - " + (jsonData.getplans[0].choices[i].Detail) + '\n';
            output += "Amount - " + (jsonData.getplans[0].choices[i].Amount) + '\n';
            output += "Validity - " + (jsonData.getplans[0].choices[i].Validity);
            
            translate(output, {to: targetLang}).then(res => {
              sendTextMessage(senderID, res.text);
            }).catch(err => {
              console.error(err);
              return "error";
            });
            output = '';
              }
            }
            else if(parseInt(messageText) === 2){
                for(var i=0; i < jsonData.getplans[1].choices.length; i++){
             //console.log(jsonData.getplans[0].choices[i].Detail);
            output += "Detail - " + (jsonData.getplans[1].choices[i].Detail) + '\n';
            output += "Amount - " + (jsonData.getplans[1].choices[i].Amount) + '\n';
            output += "Validity - " + (jsonData.getplans[1].choices[i].Validity);
            
            translate(output, {to: targetLang}).then(res => {
          sendTextMessage(senderID, res.text);
        }).catch(err => {
          console.error(err);
          return "error";
        });
            output = '';
              }
            }
            else if(parseInt(messageText) === 3){
                for(var i=0; i < jsonData.getplans[2].choices.length; i++){
             //console.log(jsonData.getplans[0].choices[i].Detail);
            output += "Detail - " + (jsonData.getplans[2].choices[i].Detail) + '\n';
            output += "Amount - " + (jsonData.getplans[2].choices[i].Amount) + '\n';
            output += "Validity - " + (jsonData.getplans[2].choices[i].Validity);
            
            translate(output, {to: targetLang}).then(res => {
          sendTextMessage(senderID, res.text);
        }).catch(err => {
          console.error(err);
          return "error";
        });
            output = '';
              }
            }
            else if(parseInt(messageText) === 4){
                for(var i=0; i < jsonData.getplans[3].choices.length; i++){
             //console.log(jsonData.getplans[0].choices[i].Detail);
            output += "Detail - " + (jsonData.getplans[3].choices[i].Detail) + '\n';
            output += "Amount - " + (jsonData.getplans[3].choices[i].Amount) + '\n';
            output += "Validity - " + (jsonData.getplans[3].choices[i].Validity);
            
            translate(output, {to: targetLang}).then(res => {
          sendTextMessage(senderID, res.text);
        }).catch(err => {
          console.error(err);
          return "error";
        });
            output = '';
              }
            }
            else if(parseInt(messageText) === 5){
                for(var i=0; i < jsonData.getplans[4].choices.length; i++){
             //console.log(jsonData.getplans[0].choices[i].Detail);
            output += "Detail - " + (jsonData.getplans[4].choices[i].Detail) + '\n';
            output += "Amount - " + (jsonData.getplans[4].choices[i].Amount) + '\n';
            output += "Validity - " + (jsonData.getplans[4].choices[i].Validity);
            
            translate(output, {to: targetLang}).then(res => {
          sendTextMessage(senderID, res.text);
        }).catch(err => {
          console.error(err);
          return "error";
        });
            output = '';
              }
            }
            else if(parseInt(messageText) === 6){
                for(var i=0; i < jsonData.getplans[5].choices.length; i++){
             //console.log(jsonData.getplans[0].choices[i].Detail);
            output += "Detail - " + (jsonData.getplans[5].choices[i].Detail) + '\n';
            output += "Amount - " + (jsonData.getplans[5].choices[i].Amount) + '\n';
            output += "Validity - " + (jsonData.getplans[5].choices[i].Validity);
            
            translate(output, {to: targetLang}).then(res => {
          sendTextMessage(senderID, res.text);
        }).catch(err => {
          console.error(err);
          return "error";
        });
            output = '';
              }
            }
            else if(parseInt(messageText) === 7){
                for(var i=0; i < jsonData.getplans[6].choices.length; i++){
             //console.log(jsonData.getplans[0].choices[i].Detail);
            output += "Detail - " + (jsonData.getplans[6].choices[i].Detail) + '\n';
            output += "Amount - " + (jsonData.getplans[6].choices[i].Amount) + '\n';
            output += "Validity - " + (jsonData.getplans[6].choices[i].Validity);

            console.log(output);
            
            translate(output, {to: targetLang}).then(res => {
          sendTextMessage(senderID, res.text);
        }).catch(err => {
          console.error(err);
          return "error";
        });
            output = '';
              }
            }

      }

      if(prevCommand === 'dth_plans'){
          if(parseInt(messageText) === 1){
                for(var i=0; i < dthJsonData.getdthplans[0].choices.length; i++){
             //console.log(jsonData.getplans[0].choices[i].Detail);
            output += "Detail - " + (dthJsonData.getdthplans[0].choices[i].Detail) + '\n';
            output += "Amount - " + (dthJsonData.getdthplans[0].choices[i].Amount) + '\n';
            output += "Validity - " + (dthJsonData.getdthplans[0].choices[i].Validity);
            
            translate(output, {to: targetLang}).then(res => {
          sendTextMessage(senderID, res.text);
        }).catch(err => {
          console.error(err);
          return "error";
        });
            output = '';
              }
            }
            else if(parseInt(messageText) === 2){
                for(var i=0; i < dthJsonData.getdthplans[1].choices.length; i++){
             //console.log(jsonData.getplans[0].choices[i].Detail);
            output += "Detail - " + (dthJsonData.getdthplans[1].choices[i].Detail) + '\n';
            output += "Amount - " + (dthJsonData.getdthplans[1].choices[i].Amount) + '\n';
            output += "Validity - " + (dthJsonData.getdthplans[1].choices[i].Validity);
            
            translate(output, {to: targetLang}).then(res => {
          sendTextMessage(senderID, res.text);
        }).catch(err => {
          console.error(err);
          return "error";
        });
            output = '';
              }
            }
            else if(parseInt(messageText) === 3){
                for(var i=0; i < dthJsonData.getdthplans[2].choices.length; i++){
             //console.log(jsonData.getplans[0].choices[i].Detail);
            output += "Detail - " + (dthJsonData.getdthplans[2].choices[i].Detail) + '\n';
            output += "Amount - " + (dthJsonData.getdthplans[2].choices[i].Amount) + '\n';
            output += "Validity - " + (dthJsonData.getdthplans[2].choices[i].Validity);
            
            translate(output, {to: targetLang}).then(res => {
          sendTextMessage(senderID, res.text);
        }).catch(err => {
          console.error(err);
          return "error";
        });
            output = '';
              }
            }
      }
      
  }
   else if (messageAttachments) {
    sendTextMessage(senderID, "Message with attachment received");
  }else{
    sendTextMessage(senderID, "Sorry I couldn't understand!!! Please try again.");
  }
    
  })
  .catch(console.error);
    
  }).catch(err => {
    console.error(err);
    return "error";
  });

}

function receivedPostback(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfPostback = event.timestamp;

  // The 'payload' param is a developer-defined field which is set in a postback 
  // button for Structured Messages. 
  var payload = event.postback.payload;

  // console.log("Received postback for user %d and page %d with payload '%s' " + 
  //   "at %d", senderID, recipientID, payload, timeOfPostback);

  // When a postback is called, we'll send a message back to the sender to 
  // let them know it was successful
  sendTextMessage(senderID, "Postback called");
}

//////////////////////////
// Sending helpers
//////////////////////////
function sendTextMessage(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText
    }
  };

  callSendAPI(messageData);
}

function sendGenericMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: "Airtel",
            subtitle: "Next-generation entertainment",
            item_url: "https://www.airtel.in/services-for-home",               
            image_url: "https://www.airtel.in/assets/images/landing-hotspot.png",
            buttons: [{
              type: "web_url",
              url: "https://www.airtel.in/broadband/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for first bubble",
            }],
          }, {
            title: "digital-tv",
            subtitle: "Your Hands, Now in Airtel",
            item_url: "http://www.airtel.in/digital-tv/experience-it/dth-hd",               
            image_url: "http://www.airtel.in/wps/wcm/connect/7530ae36-d103-41e4-b436-5caf401793e6/705_291.jpg?MOD=AJPERES&CACHEID=7530ae36-d103-41e4-b436-5caf401793e6",
            buttons: [{
              type: "web_url",
              url: "http://www.airtel.in/digital-tv/experience-it/dth-hd",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for second bubble",
            }]
          }]
        }
      }
    }
  };  

  callSendAPI(messageData);
}


function callSendAPI(messageData) {
  console.log(messageData);
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: 'PUT_YOUR_ACCESS_TOKEN' },
    method: 'POST',
    proxy: null,
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      console.log("Successfully sent generic message with body ", 
        body);
    } else {
      console.error("Unable to send message.");
      //console.error(response);
      console.error("error in callsendApi is - "+error);
    }
  });  
}

// Set Express to listen out for HTTP requests
var server = app.listen(process.env.PORT || 3000, function () {
  console.log("Listening on port %s", server.address().port);
});