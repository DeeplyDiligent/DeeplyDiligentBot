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
    
    checkIfAnyOverdueReminders(senderID);
    setInterval(function(){checkIfAnyOverdueReminders(senderID)}, 30*1000);

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
                delete reminders[senderID];
                deleteReminders(senderID);
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

function ishour(hour){
    var retval = false;
    var newhour = parseInt(hour);
    if (newhour == hour && newhour >= 0 && newhour <= 24){
        retval = true;
    }
    return retval;
}

function isminute(minute){
    var retval = false;
    var newminute = parseInt(minute);
    if (newminute == minute && newminute >= 0 && newminute <= 60){
        retval = true;
    }
    return retval;
}


function ReminderFunc(recipientId,message) {
	if (all_messages[recipientId].length == 1){
		sendTextMessage(recipientId, "What time would you like to be reminded")
	}else if (all_messages[recipientId].length >= 2){
        console.log(message.length == 5);
        console.log(Number.isInteger(message.substring(0,2)))
        console.log(Number.isInteger(message.substring(3,5)))
        console.log(ishour(message.substring(0,2)))
        console.log(isminute(message.substring(3,5)))
        var stringCorrect = (message.length == 5 && ishour(message.substring(0,2)) && isminute(message.substring(3,5)))
        if (stringCorrect){
            if (recipientId in reminders){
                    reminders[recipientId].push(message)
                }else{
                    reminders[recipientId] = [message]
                }
            sendTextMessage(recipientId, "you have reminders at: "+ reminders[recipientId])
            putReminderInTable('data entry 1',reminders)
            delete all_messages[recipientId];
        }else{
            sendTextMessage(recipientId, "Your string is incorrect. Please enter in format HH:MM eg. 09:20 in 24 hour time!")
            delete all_messages[recipientId];
        }
	}
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
    } else {
      console.error("Unable to send message." + messageData);
      console.error(response);
      console.error(error);
    }
  });  
}

function deleteReminders(userID){
    var connection = mysql.createConnection(process.env.JAWSDB_URL);
    connection.connect();
    connection.query("DELETE FROM Customers WHERE name='data entry 1';", function(err, rows, fields) {
      if (err) throw err;
    });
    connection.end();
}
function putReminderInTable(name, dat){
    var connection = mysql.createConnection(process.env.JAWSDB_URL);
    connection.connect();
    connection.query("DELETE FROM Customers WHERE name='data entry 1';", function(err, rows, fields) {
      if (err) throw err;
    });
    var updateorinsert = "INSERT INTO `Customers` (`name`,`dat`) values ('"+name+"','"+JSON.stringify(dat)+"')"
    console.log('about to run '+updateorinsert +' on database');
    connection.query(updateorinsert, function(err, rows, fields) {
      if (err) throw err;
      console.log(JSON.stringify(dat)+" placed in Customers for "+name);
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
        if (rows[0] != undefined){
            console.log(rows[0].dat);
            reminders = JSON.parse(rows[0].dat);
        }else{
            console.log("{}")
            reminders = {};
        }
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

function toTimeZone(whatzone) {
    var moment = require('moment-timezone');
    return [parseInt(moment().tz(whatzone).format('H')),parseInt(moment().tz("Australia/Melbourne").format('m'))];
}

function checkIfAnyOverdueReminders(sendto){
    //TODO: AUS ONLY AT THE MOMENT, EXPAND
    var time = toTimeZone("Australia/Melbourne");
    if (reminders[sendto] != undefined){
        var copyofremindersforsendto = reminders[sendto].slice();
        copyofremindersforsendto.forEach(isoverdue);
        function isoverdue(onetime, index){
            console.log(parseInt(onetime.substring(0,2)) <= time[0] && parseInt(onetime.substring(3,5)) <= time[1]);
            if ((parseInt(onetime.substring(0,2)) <= time[0] && parseInt(onetime.substring(3,5)) <= time[1])||(parseInt(onetime.substring(0,2)) < time[0])){
                sendTextMessage(sendto,"it is "+FormatNumberLength(time[0],2) +":"+ FormatNumberLength(time[1],2)+ " and i am reminding you of " + onetime)
                console.log('deleting reminder at '+ onetime);
                var indexofonetime = reminders[sendto].indexOf(onetime);
                reminders[sendto].splice(indexofonetime, 1);
                putReminderInTable('data entry 1',reminders)
                //todo: delete the reminder
            }
        }
    }
}

function FormatNumberLength(num, length) {
    var r = "" + num;
    while (r.length < length) {
        r = "0" + r;
    }
    return r;
}
