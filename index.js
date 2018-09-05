const Discord = require('discord.js');
const client = new Discord.Client();
const Config = require('./config.json');

const Steem = require('steem');
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/mydb";

client.login(Config.token);

client.on('ready', () => {
  console.log("I am ready to take over!!!");

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
  channel.send(`Welcome ${member.user}, Please enter your steem name (in small letters) inside chat box and send it over here. `);
});

client.on("message", (message) => {
  if (message.author.bot) return;

  Steem.api.getAccounts([message.content], function(err, result) {
    if (result.length == 0) {
      console.log(message.content);
      message.channel.send(message.author + " Re send your steem name! The steem name you sent is broken or not available.");
    } else {

      console.log(message.content);
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
          Has_Name: true
        };
        dbo.collection("SteemBotUsers").insertOne(myobj, function(err, res) {
          if (err) {
            message.channel.send(message.author + message.author.toString() + " You have already entered your steem username, Please use another discord account to connect to another steem account.");
            console.log(err + " - "+ res);
          }
          else {
            console.log("1 document inserted");
            message.channel.send(message.author + " Done!");
            db.close();
          }
        });
      });
    }
  });
});

client.on("message", (message) => {
  if (message.content.startsWith("ping")) {
    message.channel.send("pong!");
  } else

  if (message.content.startsWith("foo")) {
    message.channel.send("bar!");
  }
});
