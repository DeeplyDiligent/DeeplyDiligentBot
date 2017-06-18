'use strict';

const token = 'thisistoken'
const vtoken = 'EAADJNn4kPAkBAGob7TMYmOQ5bQwUtLxWU5njGKWx4vUItZAEgP4407T6ImZA1In4JO5mFg6ZCCFMPp8p0dUEH91uQkXf9jJT9gNIZCpWmSMWjFglGsFxQdBV6GnyRuTfZAhZCdZBDMAxzz01GXKA54CZA0vskemjSrzNLISVz8eBNgZDZD'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()
var all_messages = {};
var reminders = {};
var fs = require("fs");


//mysql
var mysql = require('mysql');
initTable();
retrieveReminders();    

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
  res.sendStatus(200);
  // Make sure this is a page subscription
  if (data.object === 'page') {

    // Iterate over each entry - there may be multiple if batched
    data.entry.forEach(function(entry) {
      var pageID = entry.id;
      var timeOfEvent = entry.time;

      // Iterate over each messaging event
      entry.messaging.forEach(function(event) {
        if (event.message && event.message["is_echo"] != true) {
          receivedMessage(event);
        } else if(event.message && event.message["is_echo"] == true){
			console.log("webhook recieved echo from response");
		}else {
          //console.log("Webhook received unknown event");
        }
      });
    });

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know
    // you've successfully received the callback. Otherwise, the request
    // will time out and we will keep trying to resend. send asap
//    res.sendStatus(200);
  }
});
  
function receivedMessage(event) {
	
	var senderID = event.sender.id;
	var recipientID = event.recipient.id;
	var timeOfMessage = event.timestamp;
	var message = event.message;

	console.log("Received %s from %d", message.text,senderID);
	//console.log(JSON.stringify(message));

	var messageId = message.mid;

	var messageText = message.text;
	var messageAttachments = message.attachments;

	if (messageText) {
		messageText = messageText.toLowerCase()
		if (messageText == 'reminder' || (senderID in all_messages && all_messages[senderID][0] == "reminder")){ //if i need to go to reminder function
			if (senderID in all_messages){
				all_messages[senderID].push(messageText)
			}else{
				all_messages[senderID] = [messageText]
			}
			ReminderFunc(senderID,messageText);
		}else if (messageText == 'clear reminder' || messageText == 'clear reminders'){
            if (senderID in reminders){
                delete reminders[senderID]
            }
            sendTextMessage(senderID, "No problems! You have no more reminders")
        }else if(messageText == 'my reminders'){
            if (senderID in reminders){
                sendTextMessage(senderID, "you have these reminders: "+reminders[senderID])
            }else{
                sendTextMessage(senderID, "you have no reminders")
            }
        }else{
			sendTextMessage(senderID, "i dont recognise your message")
		}
		console.log("messages by everyone: ")
		console.log(all_messages)	
		console.log("messages by you: ")
		console.log(senderID)
		console.log(all_messages[senderID])
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


function ReminderFunc(recipientId,message) {
	if (all_messages[recipientId].length == 1){
		sendTextMessage(recipientId, "What time would you like to be reminded")
	}else if (all_messages[recipientId].length >= 2){
		if (recipientId in reminders){
				reminders[recipientId].push(message)
			}else{
				reminders[recipientId] = [message]
			}
		sendTextMessage(recipientId, "you have reminders at: "+ reminders[recipientId])
//		fs.writeFile( "filename.json", JSON.stringify(reminders), "utf8",function(error) {
//            if(error) { 
//              console.log('[write auth]: ' + err);
//            } else {
//              console.log('[write auth]: success');
//            }
//          })
////        reminders = require("./filename.json");
////        console.log('imported reminders successfully')
////        console.log(reminders)
        //database entry
        putReminderInTable('data entry 1',reminders)
		delete all_messages[recipientId];
	}
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

      //console.log("Successfully sent generic message with id %s to recipient %s", messageId, recipientId);
    } else {
      console.error("Unable to send message.");
      //console.error(response);
      //console.error(error);
    }
  });  
}

function putReminderInTable(userID,message){
    var connection = mysql.createConnection(process.env.JAWSDB_URL);
    connection.connect();
    connection.query("DELETE FROM Customers WHERE name='data entry 1';", function(err, rows, fields) {
      if (err) throw err;
    });
    var updateorinsert = "INSERT INTO `Customers` (`name`,`dat`) values ('"+userID+"','"+JSON.stringify(message)+"')"
    console.log('about to run '+updateorinsert +' on database');
    connection.query(updateorinsert, function(err, rows, fields) {
      if (err) throw err;
      console.log(JSON.stringify(message)+"placed in Customers for "+userID);
    });
    connection.end();
}
function retrieveReminders(){
    var connection = mysql.createConnection(process.env.JAWSDB_URL);
    var newReminders = {};
    connection.connect();
    console.log('about to retrieve reminders from database')
    connection.query("select * from Customers where name = 'data entry 1'", function(err, rows, fields) {
      if (err) throw err;
      console.log("importing these reminders: ");
        console.log(rows[0].dat);
        reminders = JSON.parse(rows[0].dat);
    });
    connection.end();
}
function initTable(){
    var connection = mysql.createConnection(process.env.JAWSDB_URL);
    connection.connect();
    connection.query("CREATE TABLE IF NOT EXISTS Customers (name VARCHAR(20), dat VARCHAR(8192));", function(err, rows, fields) {
      if (err) throw err;
    //  console.log('The OUTPUT is: ', rows);
    });
    connection.end();
    console.log('database created')
}