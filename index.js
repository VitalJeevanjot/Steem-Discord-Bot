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
  if (message.channel.type == "dm") {
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
              Credit: 500.01,
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
              Post_received: 0,
              Extra_int: 0
            };
            dbo.collection("SteemBotUsers").insertOne(myobj, function(err, res) {
              if (err) {
                message.author.send(message.author + " You have already entered your steem username, Please use another discord account to connect with more steem accounts. Only 1 steem account is permitted for each discord account. You can use commands to rename your current steem name. Send `!help` to view commands");
                message.author.send(`Hello ${message.author},Send: ` + '`!help`' + ` here to get list of commands that you can use in private chat.`).catch(err => client.channels.get("482226873485754375").send(`Hello ${message.author}, Please allow to chat private with server members in privacy settings of this server\n https://support.discordapp.com/hc/en-us/articles/217916488-Blocking-Privacy-Settings- and then resend your Steem name here to receive a direct message.`));
              } else {
                message.author.send(`Hello ${message.author}, From now on, You will receive your steem activity messages here!, \nSend: ` + '`!help`' + ` here to get list of commands that you can use in private chat.
                      `).catch(err => client.channels.get("482226873485754375").send(`Hello ${message.author}, Please allow to chat private with server members in privacy settings of this server\n https://support.discordapp.com/hc/en-us/articles/217916488-Blocking-Privacy-Settings- and then resend your Steem on a direct message.`));
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
    if (message.content.startsWith("!")) {
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
              message.author.send("Sorry, An error occured!").catch(err => message.author.send("Please register an account first!"));
            };
            if (!err) {
              message.author.send({
                embed: {
                  color: 0x930056,
                  description: message.author + " Your private key is: `" + private_k + "` Insert this only thing in the **memo**."
                }
              }).catch(err => message.author.send("Please register an account first!"));
              updateDBInVar();
            }
            //console.log("document updated");
            db.close();
          });
        });

      } else if (message.content == "!info") {
        updateDBInVar();
        let sname = "";
        let credit = 0.01;
        let r_msg;
        let r_vote;
        let r_comment;
        let r_transfer;
        let r_follower;
        for (let g = 0; g < dbTemp.length; g++) {
          if (dbTemp[g]._id == message.author.id) {
            sname = dbTemp[g].Steem_name;
            credit = dbTemp[g].Credit;
            r_msg = dbTemp[g].Receive_msg;
            r_vote = dbTemp[g].Receive_Upvotes;
            r_comment = dbTemp[g].Receive_Comments;
            r_transfer = dbTemp[g].Receive_transfer;
            r_follower = dbTemp[g].Receive_follower;
          }
        }
        message.author.send({
          embed: {
            color: 0x00cc33,
            fields: [{
                name: "Steem Name",
                value: sname
              },
              {
                name: "Receive any user activity messages",
                value: r_msg.toString()
              },
              {
                name: "Receive upvotes",
                value: r_vote.toString()
              },
              {
                name: "Receive Comments",
                value: r_comment.toString()
              },
              {
                name: "Receive transfer",
                value: r_transfer.toString()
              },
              {
                name: "Receive follower",
                value: r_follower.toString()
              }

            ]
          }
        }).catch(err => message.author.send("Please register an account first!"));

      } else if (message.content.startsWith("!rename to")) {
        let n_steemname = message.content.trim().split(/ +/g)[2]; // New steem name
        Steem.api.getAccounts([n_steemname], function(err, result) {
          if (result.length == 0) {
            message.author.send("Please enter a valid steem name").catch(err => message.author.send("Please register an account first!"));
          } else if (result.length != 0) {
            for (let g = 0; g < dbTemp.length; g++) {
              if (dbTemp[g]._id == message.author.id) {
                dbTemp[g].Steem_name = n_steemname;
                updateRealDB(g);
                message.author.send({
                  embed: {
                    color: 0xc500cc,
                    description: " Your steem name has changed to: `" + n_steemname + "`. Now you will receive messages for this steem name."
                  }
                }).catch(err => message.author.send("Please register an account first!")).catch(err => client.channels.get("482226873485754375").send(`Hello ${message.author}, Please allow to chat private with server members in privacy settings of this server\n https://support.discordapp.com/hc/en-us/articles/217916488-Blocking-Privacy-Settings- and then resend your Steem on a direct message.`));
              }
            }
          }
        });
      } else if (message.content == "!help") {
        message.author.send({
          embed: {
            color: 0x00c1b1,
            fields: [{
                name: "Get your account name and credit with:",
                value: `!info`
              },
              {
                name: "Get your key to buy credits:",
                value: `!generate_key`
              },
              {
                name: "Rename steem user name with:",
                value: `!rename to <new_name>`
              },
              {
                name: "Receive messages toggle with:",
                value: `!receive msg t/f`
              },
              {
                name: "Receive upvotes toggle with:",
                value: `!receive vote t/f`
              },
              {
                name: "Receive follower toggle with:",
                value: `!receive follower t/f`
              },
              {
                name: "Receive comment toggle with:",
                value: `!receive comment t/f`
              },
              {
                name: "Receive transfer toggle with:",
                value: `!receive transfer t/f`
              },
              {
                name: "Docs",
                value: "http://steemdbot.jaeven.com/" // Add link to proper documentation of this
              }
            ],
            footer: {
              text: "with !receive <choice> <t> or <f> you can stop or receive your messages of different activities. You can earn more credit by upvoting @genievot posts and comments on steemit. You will get VotingPower/10 credit."
            }
          }
        }).catch(err => message.author.send("Please register an account first!"));
      } else if (message.content.startsWith("!receive")) {
        let argt = message.content.trim().split(/ +/g); // New steem name
        if (argt[1] == "msg") {
          if (argt[2] == "t") {
            for (let g = 0; g < dbTemp.length; g++) {
              if (dbTemp[g]._id == message.author.id) {
                dbTemp[g].Receive_msg = true;
                updateRealDB(g);
              }
            }
          }
          if (argt[2] == "f") {
            for (let g = 0; g < dbTemp.length; g++) {
              if (dbTemp[g]._id == message.author.id) {
                dbTemp[g].Receive_msg = false;
                updateRealDB(g);
              }
            }
          }
        } else if (argt[1] == "vote") {
          if (argt[2] == "t") {
            for (let g = 0; g < dbTemp.length; g++) {
              if (dbTemp[g]._id == message.author.id) {
                dbTemp[g].Receive_Upvotes = true;
                updateRealDB(g);
              }
            }
          }
          if (argt[2] == "f") {
            for (let g = 0; g < dbTemp.length; g++) {
              if (dbTemp[g]._id == message.author.id) {
                dbTemp[g].Receive_Upvotes = false;
                updateRealDB(g);
              }
            }
          }
        } else if (argt[1] == "follower") {
          if (argt[2] == "t") {
            for (let g = 0; g < dbTemp.length; g++) {
              if (dbTemp[g]._id == message.author.id) {
                dbTemp[g].Receive_follower = true;
                updateRealDB(g);
              }
            }
          }
          if (argt[2] == "f") {
            for (let g = 0; g < dbTemp.length; g++) {
              if (dbTemp[g]._id == message.author.id) {
                dbTemp[g].Receive_follower = false;
                updateRealDB(g);
              }
            }
          }
        } else if (argt[1] == "transfer") {
          if (argt[2] == "t") {
            for (let g = 0; g < dbTemp.length; g++) {
              if (dbTemp[g]._id == message.author.id) {
                dbTemp[g].Receive_transfer = true;
                updateRealDB(g);
              }
            }
          }
          if (argt[2] == "f") {
            for (let g = 0; g < dbTemp.length; g++) {
              if (dbTemp[g]._id == message.author.id) {
                dbTemp[g].Receive_transfer = false;
                updateRealDB(g);
              }
            }
          }
        } else if (argt[1] == "comment") {
          if (argt[2] == "t") {
            for (let g = 0; g < dbTemp.length; g++) {
              if (dbTemp[g]._id == message.author.id) {
                dbTemp[g].Receive_Comments = true;
                updateRealDB(g);
              }
            }
          }
          if (argt[2] == "f") {
            for (let g = 0; g < dbTemp.length; g++) {
              if (dbTemp[g]._id == message.author.id) {
                dbTemp[g].Receive_Comments = false;
                updateRealDB(g);
              }
            }
          }
        } else {
          message.author.send({
            embed: {
              color: 0xe04516,
              description: "Please use correct format, use `!help` to learn more."
            }
          }).catch(err => message.author.send("Please register an account first!"));
        }
        message.author.send({
          embed: {
            color: 0xe08115,
            description: "Your changes will be applied if it was correct, use `!info` to get account details."
          }
        }).catch(err => message.author.send("Please register an account first!"));
      } else {
        message.author.send({
          embed: {
            color: 0xe04516,
            description: "Your command is not correct! use `!help` to learn more."
          }
        }).catch(err => message.author.send("Please register an account first!"));
      }

    } // Starts with !
  } // It's a dm
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
    if (error) {
      throw error;
    }
    for (let i = 0; i < dbTemp.length; i++) {
      if (dbTemp[i].Receive_msg == true && dbTemp[i].Credit >= 1) {
        let s_name = dbTemp[i].Steem_name;
        if (dbTemp[i].Receive_Upvotes == true) {
          if (txType == "vote") {
            let vote_w = txData.weight / 100;
            //Add for an upvote over comment
            if (s_name == txData.author) {
              try {
                client.users.get(dbTemp[i]._id).send({
                  embed: {
                    color: 0x00a5ff,
                    description: "`" + txData.voter + "` Just upvoted: <https://steemit.com/@" + txData.author + "/" + txData.permlink + "> with `" + vote_w + "%`"
                  }
                }).catch(err => client.channels.get("482226873485754375").send(`Hello ${dbTemp[i].Discord_name}, Please allow to chat private with server members in privacy settings of this server\n https://support.discordapp.com/hc/en-us/articles/217916488-Blocking-Privacy-Settings- and then resend your Steem on a direct message.`));
                dbTemp[i].Credit -= 1;
                dbTemp[i].Post_received += 1;
                updateRealDB(i); // for credit...
              } catch (err) {
                dbTemp[i].Receive_msg = false
                updateRealDB(i);
              }
            }
            if (txData.author == "genievot") {
              if (txData.voter == s_name) {
                if (vote_w <= 0) {
                  dbTemp[i].Credit -= 10;
                  client.users.get(dbTemp[i]._id).send({
                    embed: {
                      color: 0x00ff11,
                      description: "You just received `-10` credit for taking upvote back from the post."
                    }
                  }).catch(err => client.channels.get("482226873485754375").send(`Hello ${dbTemp[i].Discord_name}, Please allow to chat private with server members in privacy settings of this server\n https://support.discordapp.com/hc/en-us/articles/217916488-Blocking-Privacy-Settings- and then resend your Steem on a direct message.`));
                }
                if (vote_w >= 1) {
                  dbTemp[i].Credit += vote_w / 10;
                  client.users.get(dbTemp[i]._id).send({
                    embed: {
                      color: 0x00ff11,
                      description: "You just received `" + vote_w/10 + "` credit for upvoting on the post."
                    }
                  }).catch(err => client.channels.get("482226873485754375").send(`Hello ${dbTemp[i].Discord_name}, Please allow to chat private with server members in privacy settings of this server\n https://support.discordapp.com/hc/en-us/articles/217916488-Blocking-Privacy-Settings- and then resend your Steem on a direct message.`));
                }
                updateRealDB(i);
              }
            }
          }
        }
        if (txType == "comment") {
          if (dbTemp[i].Receive_Comments == true) {
            if (txData.parent_author == "") {
              if (s_name == txData.author) {
                try {
                  client.users.get(dbTemp[i]._id).send({
                    embed: {
                      color: 0x00ffe5,
                      description: "`" + txData.author + "` Just made a post: <https://steemit.com/@" + txData.author + "/" + txData.permlink + ">"
                    }
                  }).catch(err => client.channels.get("482226873485754375").send(`Hello ${dbTemp[i].Discord_name}, Please allow to chat private with server members in privacy settings of this server\n https://support.discordapp.com/hc/en-us/articles/217916488-Blocking-Privacy-Settings- and then resend your Steem on a direct message.`));
                  dbTemp[i].Credit -= 1;
                  dbTemp[i].Post_received += 1;
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
                  client.users.get(dbTemp[i]._id).send({
                    embed: {
                      color: 0x00ffa5,
                      description: "`" + txData.author + "` Just made a comment: <https://steemit.com/@" + txData.author + "/" + txData.permlink + ">"
                    }
                  }).catch(err => client.channels.get("482226873485754375").send(`Hello ${dbTemp[i].Discord_name}, Please allow to chat private with server members in privacy settings of this server\n https://support.discordapp.com/hc/en-us/articles/217916488-Blocking-Privacy-Settings- and then resend your Steem on a direct message.`));
                  dbTemp[i].Credit -= 1;
                  dbTemp[i].Post_received += 1;
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
                      client.users.get(dbTemp[i]._id).send({
                        embed: {
                          color: 0x00fff2,
                          description: "`" + ifollow[1].follower + "` is now following you on steem."
                        }
                      }).catch(err => client.channels.get("482226873485754375").send(`Hello ${dbTemp[i].Discord_name}, Please allow to chat private with server members in privacy settings of this server\n https://support.discordapp.com/hc/en-us/articles/217916488-Blocking-Privacy-Settings- and then resend your Steem on a direct message.`));
                      dbTemp[i].Credit -= 1;
                      dbTemp[i].Post_received += 1;
                      updateRealDB(i); // for credit...
                    } catch (err) {
                      dbTemp[i].Receive_msg = false
                      updateRealDB(i);
                    }
                  }
                  if (ifollow[1].what[0] == null) {
                    try {
                      client.users.get(dbTemp[i]._id).send({
                        embed: {
                          color: 0x00a39a,
                          description: "`" + ifollow[1].follower + "` unfollowed you on steem."
                        }
                      });
                      dbTemp[i].Credit -= 1;
                      dbTemp[i].Post_received += 1;
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
                client.users.get(dbTemp[i]._id).send({
                  embed: {
                    color: 0xfaff00,
                    description: "`" + txData.from + "` sent you `" + txData.amount + "` **Memo** `" + txData.memo + "`"
                  }
                }).catch(err => client.channels.get("482226873485754375").send(`Hello ${dbTemp[i].Discord_name}, Please allow to chat private with server members in privacy settings of this server\n https://support.discordapp.com/hc/en-us/articles/217916488-Blocking-Privacy-Settings- and then resend your Steem on a direct message.`));
                dbTemp[i].Credit -= 1;
                dbTemp[i].Post_received += 1;
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
              client.users.get(dbTemp[i]._id).send({
                embed: {
                  color: 0xffbf00,
                  description: "You just bought `" + credit_bought + "` credits."
                }
              }).catch(err => client.channels.get("482226873485754375").send(`Hello ${dbTemp[i].Discord_name}, Please allow to chat private with server members in privacy settings of this server\n https://support.discordapp.com/hc/en-us/articles/217916488-Blocking-Privacy-Settings- and then resend your Steem on a direct message.`));
            }
          }
        }

        if (dbTemp[i].Credit <= 1) {
          client.users.get(dbTemp[i]._id).send("Your credit is not enough to receive steem activity messages anymore. Please recharge your credit.");
          dbTemp[i].Receive_msg = false;
          updateRealDB(i);
        }

      } //Checking main possibility that users can receive messages or not and have enough credit.

    }
  });
} // Send steem activity function end.

function updateRealDB(i) {
  var c_id = dbTemp[i]._id;
  var c_credit = dbTemp[i].Credit;
  var r_msg = dbTemp[i].Receive_msg;
  var pr_key = dbTemp[i].private_key;
  var p_total = dbTemp[i].Post_received;
  var new_name = dbTemp[i].Steem_name;
  var r_vote = dbTemp[i].Receive_Upvotes;
  var r_comment = dbTemp[i].Receive_Comments;
  var r_transfer = dbTemp[i].Receive_transfer;
  var r_follower = dbTemp[i].Receive_follower;
  MongoClient.connect(url, { 
    useNewUrlParser:  true 
  }, function(err, db) {
    if (err) throw err;
    var dbo = db.db("mydb");
    var query = {
      _id: c_id
    };
    var newValues = {
      $set: {
        Credit: c_credit,
        Receive_msg: r_msg,
        private_key: pr_key,
        Post_received: p_total,
        Steem_name: new_name,
        Receive_Upvotes: r_vote,
        Receive_Comments: r_comment,
        Receive_transfer: r_transfer,
        Receive_follower: r_follower

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
