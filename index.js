'use strict'

const token = 'thisistoken'
const vtoken = 'EAADJNn4kPAkBAGob7TMYmOQ5bQwUtLxWU5njGKWx4vUItZAEgP4407T6ImZA1In4JO5mFg6ZCCFMPp8p0dUEH91uQkXf9jJT9gNIZCpWmSMWjFglGsFxQdBV6GnyRuTfZAhZCdZBDMAxzz01GXKA54CZA0vskemjSrzNLISVz8eBNgZDZD'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()
var all_messages = [];

app.set('port', (process.env.PORT || 5000))

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))

// Process application/json
app.use(bodyParser.json())

// Index route
app.get('/', function (req, res) {
    res.send('Hello world, I am a chat bot')
})

// for Facebook verification
app.get('/webhook/', function (req, res) {
    if (req.query['hub.verify_token'] === token) {
        res.send(req.query['hub.challenge'])
    }
    res.send('No sir3')
})

// Spin up the server
app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'))
})

app.post('/webhook', function (req, res) {
  var data = req.body;

  // Make sure this is a page subscription
  if (data.object === 'page') {

    // Iterate over each entry - there may be multiple if batched
    data.entry.forEach(function(entry) {
      var pageID = entry.id;
      var timeOfEvent = entry.time;

      // Iterate over each messaging event
      entry.messaging.forEach(function(event) {
        if (event.message) {
          receivedMessage(event);
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
  
function receivedMessage(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;
  
	  console.log("Received message for user %d and page %d at %d with message:", 
		senderID, recipientID, timeOfMessage);
	  console.log(JSON.stringify(message));

	  var messageId = message.mid;

	  var messageText = message.text;
	  var messageAttachments = message.attachments;

	  if (messageText) {
		messageText = messageText.toLowerCase()
		all_messages.push({
			key:   senderID,
			value: messageText
		});
		console.log(all_messages)
	  } else if (messageAttachments) {
		sendTextMessage(senderID, "Message with attachment received");
	  }
}


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


function reminders(recipientId) {
  sendTextMessage(recipientId, "What time would you like to be reminded")
  
}

function storeReminder(recipientId){
	
}

function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: vtoken },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      console.log("Successfully sent generic message with id %s to recipient %s", 
        messageId, recipientId);
    } else {
      console.error("Unable to send message.");
      console.error(response);
      console.error(error);
    }
  });  
}