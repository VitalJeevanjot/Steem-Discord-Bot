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
      dbo.collection("SteemBotUsers").updateOne(query, newValues, function(err, res) {
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
    channel.send(`Welcome ${member.user}, Please send your steem name (in small letters) as Direct message and never leave this server to receive messages from bot. `);
  }
});

client.on("message", (message) => {

  if (message.author.bot) return;
  if (!message.content.startsWith("!")) {
    Steem.api.getAccounts([message.content], function(err, result) {
      if (result.length == 0) {
        //console.log(message.content);
        message.author.send(message.author + " Resend your steem name! The steem name you sent is broken or not available.");
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
            Credit: 1000.01,
            Receive_msg: true, // main on/off
            Receive_Upvotes: true,
            Receive_Comments: true,
            Receive_Replies: true,
            Receive_follower: true,
            Receive_transfer: true,
            private_key: Math.floor(Math.random() * Math.floor(99999)).toString(),
            Extra_Credit: 0.01,
            Extra_Bool: true,
            Extra_String: "ExtraString",
            Extra_int: 0
          };
          dbo.collection("SteemBotUsers").insertOne(myobj, function(err, res) {
            if (err) {
              message.author.send(message.author + " You have already entered your steem username, Please use another discord account to connect with more steem accounts. Only 1 steem account is permitted for each discord account. You can use commands to rename your current steem name. Send `!help` to view commands");
              message.author.send(`Hello ${message.author},Send: ` + '`!help`' + ` here to get list of commands that you can use in private chat.`).catch(err => message.channel.send(`Hello ${message.author}, Please allow to chat private with server members in privacy settings of this server\n https://support.discordapp.com/hc/en-us/articles/217916488-Blocking-Privacy-Settings- and then resend your Steem name here to receive a direct message.`));
            } else {
              message.author.send(`Hello ${message.author}, From now on, You will receive your steem activity messages here!, \nSend: ` + '`!help`' + ` here to get list of commands that you can use in private chat.
                      `).catch(err => message.channel.send(`Hello ${message.author}, Please allow to chat private with server members in privacy settings of this server\n https://support.discordapp.com/hc/en-us/articles/217916488-Blocking-Privacy-Settings- and then resend your Steem name here to receive a direct message.`));
              message.author.send(message.author + " Done! Your name is inside the database now. **Do not leave main channel or server becuase leaving this channel will disable your account and you won't receive any messages again.**");
              updateDBInVar();
              //  console.log("a document inserted");
              db.close();
            }
          });
        });
      }
    });
  }
//! Commands...
  if (message.content == "!generate_key") {
    let private_k = Math.floor(Math.random() * Math.floor(99999)).toString();
    MongoClient.connect(url, { 
      useNewUrlParser:  true 
    }, function(err, db) {
      if (err) throw err;
      var dbo = db.db("mydb");
      var query = {
        _id: message.author.id
      };
      var newValues = {
        $set: {
          private_key: private_k
        }
      };
      dbo.collection("SteemBotUsers").updateOne(query, newValues, function(err, res) {
        if (err) {
          throw err;
          message.author.send("Sorry, An error occured!")
        };
        if (!err) {
          message.author.send(message.author + "Your private key is: `" + private_k + "` Insert this only thing in the **memo**.");
          updateDBInVar();
        }
        //console.log("document updated");
        db.close();
      });
    });

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
//This method will start on bot ready...
function sendSteemActivityMessagesToUsers() {
  //dbTemp[i].Steem_name
  Steem.api.streamTransactions('head', (error, result) => {
    let txType = result.operations[0][0];
    let txData = result.operations[0][1];
    for (let i = 0; i < dbTemp.length; i++) {
      if (dbTemp[i].Receive_msg == true && dbTemp[i].Credit >= 1) {
        let s_name = dbTemp[i].Steem_name;
        if (dbTemp[i].Receive_Upvotes == true) {
          if (txType == "vote") {
            let vote_w = txData.weight / 100;
            //Add for an upvote over comment
            if (s_name == txData.author) {
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
        }
        //Comment, reply, follow, post
        if (txType == "comment") {
          if (dbTemp[i].Receive_Comments == true) {
            if (txData.parent_author == "") {
              if (s_name == txData.author) {
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
              if (s_name == txData.parent_author) {
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

        if (txType == "custom_json") {
          if (dbTemp[i].Receive_follower == true) {
            if (txData.json != undefined) {
              var ifollow = JSON.parse(txData.json);
              if (ifollow[0] == "follow") {
                if (ifollow[1].following == s_name) {
                  if (ifollow[1].what[0] != null) {
                    try {
                      client.users.get(dbTemp[i]._id).send("`" + ifollow[1].follower + "` is now following you on steem.");
                      dbTemp[i].Credit -= 1;
                      updateRealDB(i); // for credit...
                    } catch (err) {
                      dbTemp[i].Receive_msg = false
                      updateRealDB(i);
                    }
                  }
                  if (ifollow[1].what[0] == null) {
                    try {
                      client.users.get(dbTemp[i]._id).send("`" + ifollow[1].follower + "` unfollowed you on steem.");
                      dbTemp[i].Credit -= 1;
                      updateRealDB(i); // for credit...
                    } catch (err) {
                      dbTemp[i].Receive_msg = false
                      updateRealDB(i);
                    }
                  }
                }
              }
            }
          }
        }

        if (txType == "transfer") {
          if (dbTemp[i].Receive_transfer == true) {
            if (dbTemp[i].Steem_name == txData.to) {
              try {
                client.users.get(dbTemp[i]._id).send("`" + txData.from + "` sent you `" + txData.amount + "` **Memo** `" + txData.memo + "`");
                dbTemp[i].Credit -= 1;
                updateRealDB(i); // for credit...
              } catch (err) {
                dbTemp[i].Receive_msg = false
                updateRealDB(i);
              }
            }
          }
          if (txData.to == "genievot" && txData.from == dbTemp[i].Steem_name) {
            if (txData.memo == dbTemp[i].private_key) {
              let amount = parseFloat(txData.amount.split(" ")[0]);
              let credit_bought = amount * 100;
              dbTemp[i].Credit = dbTemp[i].Credit + credit_bought;
              updateRealDB(i);
              client.users.get(dbTemp[i]._id).send("You just bought " + credit_bought + " credits.");
            }
          }
        }

      } //Checking main possibility that users can receive messages or not and have enough credit.
      // if (dbTemp[i].Credit <= 0) {
      //   //Manage here...
      // turn off sending messages...
      //
      // }
    }
  });
} // Send steem activity function end.

function updateRealDB(i) {
  var c_name = dbTemp[i]._id;
  var c_credit = dbTemp[i].Credit;
  var r_msg = dbTemp[i].Receive_msg;
  var pr_key = dbTemp[i].private_key;
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
        Receive_msg: r_msg,
        private_key: pr_key
      }
    };
    dbo.collection("SteemBotUsers").updateOne(query, newValues, function(err, res) {
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
