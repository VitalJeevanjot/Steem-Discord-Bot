const Discord = require('discord.js');
const client = new Discord.Client();
const Config = require('./config.json');

const Steem = require('steem');
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/mydb";
var dbTemp = [];

client.login(Config.token);

client.on('ready', () => {
  console.log("I am ready to take over!!!");
  updateDBInVar();
  sendSteemActivityMessagesToUsers();
  MongoClient.connect(url, { 
    useNewUrlParser:  true 
  }, function(err, db) {
    if (err) throw err;
    var dbo = db.db("mydb");
    dbo.createCollection("SteemBotUsers", function(err, res) {
      if (err) throw err;
      console.log("Collection created!");
      db.close();
    });
  });
});

client.on('guildMemberAdd', (member) => {
  var channel = client.channels.get("482226873485754375");
  var found = false;
  for (let i = 0; i < dbTemp.length; i++) {
    if (dbTemp[i]._id == member.id) {
      found = true;
      break;
    }
  }

  if (found == true) {
    MongoClient.connect(url, { 
      useNewUrlParser:  true 
    }, function(err, db) {
      if (err) throw err;
      var dbo = db.db("mydb");
      var query = {
        _id: member.id
      };
      var newValues = {
        $set: {
          Receive_msg: true
        }
      };
      dbo.collection("SteemBotUsers").updateMany(query, newValues, function(err, res) {
        if (err) throw err;
        if (!err) {
          updateDBInVar();
          channel.send(`Welcome Back ${member.user}! You will receive your messages from now on. `);

        }
        db.close();
      });
    });
  }
  if (found == false) {
    channel.send(`Welcome ${member.user}, Please enter your steem name (in small letters) inside chat box and send it over here and remember that you should never leave this server to receive messages from bot. `);
  }
});

client.on("message", (message) => {
  if (message.author.bot) return;

  if (message.channel.type !== "dm") {
    Steem.api.getAccounts([message.content], function(err, result) {
      if (result.length == 0) {
        //console.log(message.content);
        message.channel.send(message.author + " Resend your steem name! The steem name you sent is broken or not available.");
      } else {
        //console.log(message.content);
        MongoClient.connect(url, { 
          useNewUrlParser:  true 
        }, function(err, db) {
          if (err) throw err;
          var dbo = db.db("mydb");
          var myobj = {
            _id: message.author.id,
            Discord_name: message.author.toString(),
            Steem_name: message.content,
            Credit: 1000,
            Receive_msg: true, // main on/off
            Receive_Upvotes: true,
            Receive_Comments: true,
            Receive_Replies: true,
            Extra_Credit: 0,
            Extra_Bool: true,
            Extra_String: "ExtraString",
            Extra_int: 0
          };
          dbo.collection("SteemBotUsers").insertOne(myobj, function(err, res) {
            if (err) {
              message.channel.send(message.author + " You have already entered your steem username, Please use another discord account to connect to more steem accounts. Only 1 steem account is permitted for each discord account.");
              message.author.send(`Hello ${message.author}, From now on, You will receive your steem activity messages here!, \nSend: ` + '`!help`' + ` here to get list of commands that you can use in private chat.
                      `).catch(err => message.channel.send(`Hello ${message.author}, Please allow to chat private with server members in privacy settings of this server\n https://support.discordapp.com/hc/en-us/articles/217916488-Blocking-Privacy-Settings- and then resend your Steem name here to receive a direct message.`));
            } else {
              message.author.send(`Hello ${message.author}, From now on, You will receive your steem activity messages here!, \nSend: ` + '`!help`' + ` here to get list of commands that you can use in private chat.
                      `).catch(err => message.channel.send(`Hello ${message.author}, Please allow to chat private with server members in privacy settings of this server\n https://support.discordapp.com/hc/en-us/articles/217916488-Blocking-Privacy-Settings- and then resend your Steem name here to receive a direct message.`));
              message.channel.send(message.author + " Done! Your name is inside the database now. `Do not leave this channel or server becuase leaving this channel will disable your account and you won't receive any messages again.`");
              updateDBInVar();
              //  console.log("a document inserted");
              db.close();
            }
          });
        });
      }
    });
  } else if (message.channel.type === "dm") {
    message.author.send(`That's pm!`); // Set commands here...
  }
});

client.on("message", (message) => {
  if (message.content.startsWith("ping")) {
    message.channel.send("pong!");
  } else

  if (message.content.startsWith("foo")) {
    message.channel.send("bar!");
  }
});


function updateDBInVar() {
  MongoClient.connect(url, {
    useNewUrlParser: true
  }, function(err, db) {
    if (err) throw err;
    var dbo = db.db("mydb");
    dbo.collection("SteemBotUsers").find({}).toArray(function(err, result) {
      if (err) throw err;
      dbTemp = result;
      db.close();
    });
  });
}

function sendSteemActivityMessagesToUsers() {
  //dbTemp[i].Steem_name
  let i = 0;
  Steem.api.streamTransactions('head', (error, result) => {
    let txType = result.operations[0][0];
    let txData = result.operations[0][1];
    for (i = 0; i < dbTemp.length; i++) {
      //If user is turned on to receive messages
      if (dbTemp[i].Receive_msg == true && dbTemp[i].Credit >= 1) {
        if (txType == "vote") {
          let vote_w = txData.weight / 100;
          //Add for an upvote over comment
          if (dbTemp[i].Steem_name == txData.author && dbTemp[i].Receive_Upvotes == true) {
            try {
              client.users.get(dbTemp[i]._id).send("`" + txData.voter + "` Just upvoted: <https://steemit.com/@" + txData.author + "/" + txData.permlink + "> with `" + vote_w + "%`");
              dbTemp[i].Credit -= 1;
              updateRealDB(i); // for credit...
            } catch (err) {
              dbTemp[i].Receive_msg = false
              updateRealDB(i);
            }
          }
        }
        //Comment, reply, follow, post
        if (txType == "comment") {
          if (dbTemp[i].Receive_Comments == true) {
            if (txData.parent_author == "") {
              if (dbTemp[i].Steem_name == txData.author) {
                try {
                  client.users.get(dbTemp[i]._id).send("`" + txData.author + "` Just made a post: <https://steemit.com/@" + txData.author + "/" + txData.permlink + ">");
                  dbTemp[i].Credit -= 1;
                  updateRealDB(i); // for credit...
                } catch (err) {
                  dbTemp[i].Receive_msg = false
                  updateRealDB(i);
                }
              }
            }
            if (txData.parent_author != "") {
              if (dbTemp[i].Steem_name == txData.parent_author) {
                try {
                  client.users.get(dbTemp[i]._id).send("`" + txData.author + "` Just made a comment: <https://steemit.com/@" + txData.author + "/" + txData.permlink + ">");
                  dbTemp[i].Credit -= 1;
                  updateRealDB(i); // for credit...
                } catch (err) {
                  dbTemp[i].Receive_msg = false
                  updateRealDB(i);
                }
              }
            }
          }
        } //Main comment section ends here...





      } //Checking main possibility that users can receive messages or not and have enough credit.
    }
  });
} // Send steem activity function end.

function updateRealDB(i) {
  var c_name = dbTemp[i]._id;
  var c_credit = dbTemp[i].Credit;
  var r_msg = dbTemp[i].Receive_msg;
  MongoClient.connect(url, { 
    useNewUrlParser:  true 
  }, function(err, db) {
    if (err) throw err;
    var dbo = db.db("mydb");
    var query = {
      _id: c_name
    };
    var newValues = {
      $set: {
        Credit: c_credit,
        Receive_msg: r_msg
      }
    };
    dbo.collection("SteemBotUsers").updateMany(query, newValues, function(err, res) {
      if (err) throw err;
      if (!err) {
        updateDBInVar();
      }
      //console.log("document updated");
      db.close();
    });
  });
}


client.on("guildMemberRemove", (member) => {

  //Drop the row of the user...
  MongoClient.connect(url, { 
    useNewUrlParser:  true 
  }, function(err, db) {
    if (err) throw err;
    var dbo = db.db("mydb");
    var query = {
      _id: member.id
    };
    var newValues = {
      $set: {
        Receive_msg: false
      }
    };
    dbo.collection("SteemBotUsers").updateMany(query, newValues, function(err, res) {
      if (err) throw err;
      if (!err) {
        updateDBInVar();
      }
      db.close();
    });
  });

});
