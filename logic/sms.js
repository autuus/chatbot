var request = require('request');
var Detail = require('../detail');
var Request = require('../request_schema');
var config = require('../config.json');
var sms = require('../sms_integration');

/*
 var mongoose = require('mongoose');
 mongoose.connect('localhost');
 */

var my_memory={};
var option = {};


module.exports = /*function (o){
 o.todo = {
 "say" : "Hello, I am your FIMK SMS gateway service. Pleased to meet you. "
 + "How may I be of service today",
 "caption" : "Say.."};

 o.todo.options = [{
 // --------------- account checking
 "option": "I would like to check my account",
 "select": */ function(o) {
    o.todo.say = 'Hello, I am your FIMK SMS gateway service. Pleased to meet you.<br><br>'
        + 'Please tell me your secret';
    o.todo.face = 'talk';
    o.todo.options = [/*{
     option: "mx6r"
     },*/{
        option: "I don't have one.",
        select: function(o) {
            o.todo.say = "Enter your desired secret, at least 5 "
                + "letters or numbers. <br>Case matters.<br>No spacebar!";
            o.next(o);
        }
    }, {
        option: "I forgot.",
        select: function (o) {
            o.todo.say = '<b>You idiot!</b><br> ;) <br>'
                + 'We might be able to retrieve lost'
                + ' sectrets, but please don\'t bother us with small amounts ok? '
                + '<br>Please email the administration, '+config.admin+'';
            o.todo.options = [{option: "Okay.", select:o.quit}];
            o.next(o);
        }
    }];
    o.ask(o, 'secret', index);
}
/*}];

 //o.request(o, 'secret', function(o, secret) { });
 o.next(o);
 };
 */
var ip_blacklist = {};

// clear ip blacklist every 24 hours
setInterval(function(){
    ip_blacklist = {};
}, (1000*60*60*24));

var index = function(o, secret) {
    if (typeof secret !== 'undefined') {
        if (ip_blacklist[o.req.ip] > 0) {
            ip_blacklist[o.req.ip] += 1;
            console.log(ip_blacklist[o.req.ip]);
            if (ip_blacklist[o.req.ip] > 200) {
                o.todo.say = "I do not believe you are a human, and I'm not "
                    + "offering you any service until tomorrow.";
                o.todo.options = [{option:"Fine.", select:o.quit}];
                o.next(o);
                return;
            }
        } else {
            ip_blacklist[o.req.ip] = 1;
        }
    }
    secret = o.req.session.secret;
    sms.getInfo(secret, function(msg, obj) {
        o.req.session.fimk_address = obj.accountRS;
        console.log(o.req.session.fimk_address);
        console.log(obj);
        Detail.findOne({'fimk_address': obj.accountRS}, function(err, user) {
            if (user) {
                o.req.session.phone_number = user.phone_number;
            } else {
            }
            o.todo.say = "Your FIMK account number is <br>"+obj.accountRS+"<br>Balance: "+obj.balance+" FIMK";
            o.todo.face = "smile";
            o.todo.options = [{
                option:"Send money",
                select: function(o) {
                    o.todo.say = 'How many FIMK? (pick one or enter your own)';
                    o.todo.face = 'ask';
                    o.todo.options = [
                        { option: 1 },
                        { option: 20 },
                        { option: 50 },
                        { option: 100 },
                    ];
                    o.ask(o, 'amount', function(o, amount) {
                        o.todo.say = "And to whom? <br>"
                            + "Phone numbers should be in +358412324234 format,<br>"
                            + " email address or FIMK account works too";

                        o.todo.options = [/*{
                         option:'+358415370389'
                         },*/ {
                            option:'I would like to cancel this transaction',
                            select: index
                        }];
                        o.ask(o, 'to', function(o, to){
                            console.log("to: " + to);
                            request.post(
                                    'http://localhost:'+config.port+'/sms_api', {form:{
                                    'Body': 'send '
                                        + o.req.session.amount
                                        + ' fimk '
                                        + to + ' '
                                        + o.req.session.secret
                                }},
                                function (error, response, body) {
                                    if (!error && response.statusCode == 200) {
                                        console.log("body: ");
                                        console.log(body);
                                        var obj = JSON.parse(body);
                                        if (obj.error) {
                                            if (obj.error == "Unknown account") {
                                                o.todo.say = "But you have no balance!";
                                            } else {
                                                o.todo.say = "Oh noes, "
                                                    + "this transaction failed, "
                                                    + "this is what the protocol has to say:"
                                                    + " '" + obj.error + "'";
                                                o.todo.options = [{option:"Right.", select: index}];
                                            }
                                        } else {
                                            o.todo.say = 'I sent a command "send '
                                                + o.req.session.amount+' fimk '
                                                + o.req.session.to + ' '
                                                + o.req.session.secret
                                                + '" and the payment was succesful!<br>'
                                                + 'Transaction reference number is '
                                                + obj.tx_id + ' if you need it for anything.<br>'
                                                + 'It all so works as a reference number '
                                                + 'in most cases. ';
                                            o.todo.options = [{option:"Okay, thanks!", select: index}];
                                        }
                                        o.todo.face = "smile";
                                    } else {
                                        o.todo.say = 'SMS api is not responding. Please contact FIMKrypto administration.';
                                        o.todo.options = [{option:"Damn.", select: index}];
                                        o.todo.face = "smile";
                                    }
                                    o.next(o);
                                }
                            );
                        });
                    });
                }
            }, {
                option:"I would like to request a payment",
                select: function(o) {
                    if (typeof o.req.session.phone_number !== "undefined") {
                        o.todo.say = 'Invoice for how many FIMK? (pick one or enter your own)';
                        o.todo.options = [
                            { option: 1   },
                            { option: 20  },
                            { option: 50  },
                            { option: 100 }
                        ];
                        o.ask(o, 'amount', function(o, amount) {
                            o.todo.say = "And to whom? <br>"
                                + "Phone numbers should be in +358412324234 format";

                            o.todo.options = [/*{
                             option:'+358415370389'
                             }, */{
                                option:'I would like to cancel this transaction',
                                select: function(o) {
                                    o.quit(o);
                                }
                            }];
                            o.ask(o, 'to', function(o, to){
                                sms.invoice({
                                    'to': to,
                                    'from': o.req.session.phone_number,
                                    'amount': amount,
                                    'currency': 'fimk'
                                }, function (r) {
                                    o.todo.say = r.msg;
                                    o.todo.options = [{option:"Nice.", select:index}];
                                    o.next(o);
                                });
                            });

                        });
                    } else {
                        o.todo.say = "You you need to "
                            + "register first to use the invoice service.";
                        o.next(o);
                    }
                }
            }, {
                "option": "I would like to register information to this service",
                "select": function(o) {
                    o.todo.say = "Okay, what is your email?";
                    o.todo.face = "ask";
                    o.todo.options = [ {
                        option: 'Never mind.',
                        select: index
                    }];
                    o.ask(o, "email", function(o, email) {
                        o.todo.say = "Ok. Please enter your phone number<br>";
                        o.ask(o, "phone_number", function(o, phone_number) {
                            o.todo.say = "What would you like to be your account name?";
                            o.ask(o, "fullname", function(o, fullname) {
                                function random (low, high) {
                                    return parseInt(Math.random() * (high - low) + low);
                                }
                                var confirm = random(1000, 9999);
                                sms.sendSMS(phone_number, "Your confirmation code is "+confirm);
                                o.todo.say = "I sent you a confirmation code, please enter it here.";
                                o.todo.face = "talk";
                                // o.todo.options = [{option:confirm}];

                                o.ask(o, 'confirmation', function(o, confirmation) {
                                    if (confirmation == confirm) {

                                        var details = {
                                            'fullname': fullname,
                                            'phone_number': phone_number,
                                            'email': email,
                                            'fimk_address': o.req.session.fimk_address
                                        };

                                        console.log(details);

                                        Detail.update({'phone_number': phone_number}, {
                                            $set: details
                                        }, {'upsert': true}, function (err, numAffected) {
                                            console.log(err);
                                            if (!err) {
                                                console.log('user details updated');
                                                o.todo.say = "Okay, I have registerd you to this service.";
                                                o.todo.face = "smile";
                                            } else {
                                                console.log('user details not updated');
                                                o.todo.say = "* confused * <br>I failed to save, maybe the database is down?";
                                            }
                                            o.todo.options = [{option:"Thanks!", select: index}];
                                            o.next(o);
                                        });
                                    } else {
                                        o.todo.say = "Confirmation code is incorrect.";
                                        o.todo.options = [{
                                            option: "Sorry, I was trying to rob you",
                                            select: index
                                        }];
                                        o.next(o);
                                    }
                                });
                            })
                        });
                        o.next(o);
                    });
                }
            }, {
                option: "Ok, thanks bye!",
                select: function(o) {
                    o.todo.say = "Okay, I'll see you later then.";
                    o.todo.options = [{option: "*disappear*", select:o.quit}];
                    o.next(o);
                }
            }];
            o.next(o);
        });
    });
};

/*
 I love code graveyards, they are so spooky.


 option.okay = {
 "option": "Okay.",
 select: function(o) {
 o.quit(o);
 }
 };

 option.okay_thanks = {
 "option": "Okay, thanks!",
 select: function(o) {
 o.quit(o);
 }
 };

 option.thanks = {
 "option": "Thanks.",
 select: function(o) {
 o.quit(o);
 }
 };

 option.right = {
 "option": "Right.",
 select: function(o) {
 o.quit(o);
 }
 };

 , {
 "option": "Would you tell me how to use the SMS service?",
 "select": function (o) {
 o.todo.say = "<div style='font-size:10px;'>Okay, well, right now there are 2 implemented commands"
 + " send and info. <br>The syntax for send is "
 + "send [amount] [currency] [receiever] [secret] "
 + "where amount is a number with optional decimals (1.234)  "
 + "currency is the currency to use (currently only fimk) "
 + "receiver can be an email or a phone number "
 + "and secret is the secret you use to identify. "
 + "For example: send 100 fimk +358415283454 dw9i "
 + "<br>The syntax for info is: info [secret]. <br>"
 + "That command can be used to check your fimk balance, "
 + "lastest transactions and FIM address.</div>";
 o.next(o);
 }
 }

 , {
 "option": "I would like to register information to the service",
 "select": function(o) {
 o.todo.say = "Okay, what is your email?",
 o.ask(o, "email", function(o, email){
 Detail.findOne({'email': email}, function(error, user) {
 if (!error) {
 o.todo.say = "Ok, how about your phone number?";
 o.ask(o, "phone_number", function(o, phone_number) {
 o.todo.say = "And your name?";
 o.ask(o, "fullname", function(o, fullname) {
 var details = {'fullname': fullname, 'phone_number': phone_number, 'email': email}
 // update user details
 Detail.update({ user: email }, {
 $set: details
 }, {'upsert': true}, function (err, numAffected) {
 if (!err) console.log('user details updated');
 o.next(o);
 });

 })
 });
 } else {
 o.todo.say("That email has already been registered");
 o.todo.options = [{
 "option": "Right.",
 select: function(o) {
 o.quit(o);
 }
 }];
 }
 });
 });
 o.todo.options = [];
 o.next(o);
 }
 }

 sms.send(to,
 o.req.session.amount,
 o.req.session.secret,
 function(err, tx) {
 if (err) {
 o.todo.say = "Oh noes, "
 + "this transaction failed, "
 + "this is what the protocol has to say:"
 + " " + err;
 } else {
 o.todo.say = 'I sent a command "send '
 + o.req.session.amount+' fimk '
 + to + ' ' + o.req.session.secret
 + '" and the payment was succesful!<br>'
 + 'Transaction reference number is '
 + tx + ' if you need it for anything.<br>'
 + 'It all so works as a reference number '
 + 'in most cases. <br>Should i Send an SMS '
 + 'informing the reciver '
 + "that the payment has "
 + 'been made?';
 o.todo.options = [{
 option: "Yes!",
 select: function(o) {
 if (sms.validatePhone(to)) {
 sms.sendSMS(to, "You have recived money!");
 o.todo.say = "SMS sent.";
 } else {
 o.todo.say = "Ach, sorry, "
 + "I thought the reciver was a phone number."
 + "<br>I could search the database for "
 + "a phone number, but I leave you in suspense.";
 }
 o.todo.options = [{
 option:"Okay, thanks!",
 select: function(o) {
 o.quit(o);
 }
 }];
 o.next(o);
 }
 },{
 option:"No, thanks!",
 select: function(o) {
 o.quit(o);
 }
 }]
 }
 o.next(o);
 }
 );

 /*
 o.todo.options = [{
 option: "Change email address from ",
 select: function(o) {
 o.todo.say = "Okay, what is your email address?";
 o.ask(o, "email", function(o, email){
 Detail.findOne({'user': email}, function(error, user) {
 if (!error) {
 o.todo.say("And your phone number?");
 o.ask(o, "phone_number", function(o, phone_number){
 o.todo.say = "Name?";
 o.ask(o, "name", function(o, name) {

 });
 });
 } else {
 o.todo.say("This email has all ready been registered.");
 o.next(o);
 }
 });
 });
 }
 }]


 // if a registered user has registered their number or email
 // with a secret this will send fimk directly to that wallet
 if (sms.validateEmail(to)) {
 Detail.findOne({ 'user' :  to }, function(err, user) {
 if (!user) {
 sms.mailGiftcard(to, amount, 'fimk', '+3244003159', secret);
 } else if (sms.validateFimkAddress(user.fimk_address)) {
 sms.send(user.fimk_address, amount, secret)
 } else {
 sms.mailGiftcard(to, amount, 'fimk', '+3244003159', secret);
 }
 });
 } else if (sms.validatePhone(to)) {
 Detail.findOne({ 'phone_number' :  to }, function(err, user) {
 if (!user) {
 sms.smsGiftcard(to, amount, 'fimk', '+3244003159', secret);
 } else if (sms.validateFimkAddress(user.fimk_address)) {
 sms.send(user.fimk_address, amount, secret, function(error, tx) {
 if (error) {
 o.todo.say = "Sorry, the transaction failed: "+error);
 } else {
 sms.sendSMS(from,
 "Transaction complete, transaction reference "
 + "number is "+tx);
 sms.sendSMS(to, "You have recieved "
 + amount + " " + 'fimk'
 + "\nsend it forward with this syntax: "
 + "\nsend "+ amount + " " + 'fimk'
 + " [email/phone number] [your secret]"
 + "\nmore info: https://exchange.fimk.fi");
 };
 })
 } else {
 sms.smsGiftcard(to, amount, currency, from, secret);
 }
 });
 } else if (sms.validateFimkAddress(to)) {
 sms.send(to, amount, secret);
 } else if (sms.validateNumber(to)){
 sms.sendSMS(from, 'Please enter the number in +(countrycode)number'
 + 'so that 0415632758 becomes +358415632758');
 } else {
 sms.smsSyntaxError(from);
 }

 function receiveBitcoinPayment(callback, btc_amount, fimk_account_number) {
 var secret = 'I am a low level secret';
 var my_address = '19RrYDX6tXJ948DpUGvs7H38UmcjxnhUWB';
 var invoice_id = new Date().getTime();
 var host = 'http://mystore.com';
 var my_callback_url = host + '?invoice_id=' + invoice_id + '&secret=' + secret;
 var root_url = 'https://blockchain.info/api/receive';
 var parameters = 'method=create&address=' + my_address + '&callback=' + my_callback_url;
 var url = root_url + '?' + parameters;
 self.set(invoice_id, {"btc_amount" : btc_amount, "fimk_account_number" : fimk_account_number});
 console.log(url);
 request.get(url, function(err, response) {
 var obj = JSON.parse(response.body);
 console.log(obj.destination);
 callback(obj.destination);
 });
 }

 function round(num, dec) {
 return Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec);
 }

 function completeExchangeRequest(o) {

 }

 var askSellVariables = function(o) {

 }
 var askBuyVariables = function(o) {
 var buy = o.req.session.currency_to_buy;
 if (buy == "Euro") {
 if (!o.req.session.bank_account_number) {
 askForSessionVariable(o, 'bank_account_number', 'Please enter your bank account number', function(o) {
 if (!o.req.session.bank_name) {
 askForSessionVariable(o, 'bank_name', 'Please enter your bank name', function(o) {
 if (!o.req.session.bank_recipient) {
 askForSessionVariable(o, 'bank_recipient', 'Please enter your recipient name', function (o) {
 if (typeof o.req.session.bank_recipient !== "undefined") {
 askForSessionVariable(o, 'bank_reference', '(optional) Please enter your reference number',
 function (o) {
 askForSessionVariable(o, 'bank_reference', '(optional) Please enter your '
 + 'reference number', function(o) {

 });
 }
 );
 }
 });
 }
 });
 }
 });
 }
 }
 o.next(o);
 }

 var endTransactionInteraction = function(o) {
 o.todo.say = "We have emailed you the payment details, please refer "
 + "to your inbox for further interaction.";
 //transactionRequest(o);
 o.todo.options = [{
 "option" : "Great!",
 "select" : function(o) {
 o.quit(o);
 }
 }];
 o.next(o);
 }

 var my_memory = {};


 var exchange = function (o) {
 o.todo.say = "What currency do you have?";
 o.todo.options = [];
 config.currencies.forEach(function(currency){
 o.todo.options.push({
 "option": currency,
 "select": function(o) {
 o.todo.options = [];
 o.req.session.currency_to_use = o.message;
 o.todo.say = "What would you like to do with it?";
 config.currencies.forEach(function(currency) {
 if (o.message !== currency) {
 o.todo.options.push({
 "option": "I would like to exchange " + o.message + " to " + currency + "",
 "value": currency,
 "select": function (o) {
 console.log("Not here");
 o.req.session.currency_to_buy = o.value;
 o.todo.say = "All right then, how much of " + o.req.session.currency_to_use
 + " would you like to exchange to  "+ o.req.session.currency_to_buy+"?";
 o.todo.caption = "Amount..";
 o.todo.options = [{
 "option" : 1
 }, {
 "option":"Sorry I was mistaken.",
 "select": function(o) {
 o.quit(o);
 }
 }];
 o.todo.callback = function(o) {
 console.log(o.req.session.currency_to_buy);
 var buy = o.req.session.currency_to_buy;
 var sell = o.req.session.currency_to_use;
 config.btc_price.Bitcoin = 1;
 var btc_amount = parseInt(o.message) * config.btc_price[sell];
 var sell_amount = btc_amount / config.btc_price[buy];
 //if (sell == "Bitcoin") {
 //    sell_amount = parseInt(o.message) / config.btc_price[buy]
 //}
 var fee = 3;
 var fee_amount = sell_amount * (fee*(1/100));
 sell_amount -= fee_amount;
 sell_amount = round(sell_amount, 8);
 fee_amount = round(fee_amount, 8);
 console.log(config.btc_price[o.req.session.currency_to_buy]);
 console.log("msg" + o.message);
 o.todo.say = "You\'ll get "+ sell_amount+" "+buy + ".<br>"
 + "Transaction fee is " + fee + "%<br>"
 + fee_amount + " " + buy + "<br>Do we have a deal?";
 //o.todo.options = [{"option": "Okay"}];
 o.todo.options = [{
 "option":"Agreed.",
 "select": function (o) {
 askBuyVariables(o);
 }
 },{
 "option":"No!",
 "select": function(o) {
 o.quit(o);
 }
 }];
 o.next(o);
 }
 o.next(o);
 }
 });
 }
 });
 o.next(o);
 }
 });
 });

 o.next(o);

 };

 module.exports = {
 "say" : "How may I help you?",
 "caption" : "Say..",
 "options": [{
 "option": "I would like to exchange currency",
 "select": function(o) {
 if (typeof o.req.session.email === "undefined") {
 o.todo.say = "Please enter your email address.";
 o.todo.options = [{
 option: "example@example.com"
 }, {
 option: "I don't want to.",
 "select" : function (o) {
 o.quit(o);
 }
 }];
 o.todo.callback = function(o) {
 o.req.session.email = o.message;
 //o.todo = exchange(o);
 //o.next(o);
 exchange(o);
 };
 o.next(o);
 } else {
 exchange(o);
 }
 }
 }, {
 "option": "I would like to buy or redeem FIMK assets",
 "select": function(o) {
 o.todo.say = "Are you buying or redeeming?";
 o.todo.options = [{
 "option": "Buy"
 }, {
 "option": "Redeem",
 "select": function(o) {

 o.todo.say = "Witch asset would you like to redeem?";
 config.currencies.forEach(function(currency){
 if (currency == "FIMK") return;
 o.todo.options.push({
 "option": currency,
 "select": function (o) {
 o.todo.options = [];
 o.req.session.asset_to_redeem = o.message;
 o.todo.say = "";

 o.next(o);
 }
 });
 });
 o.next(o);
 }
 }];
 o.next(o);
 }
 },{
 "option": "I would like to talk to your supervisor",
 "select": function (o) {
 o.todo.say = "Okay, please send email to konsta.gogoljuk@gmail.com";
 o.next(o);
 }
 }]
 };
 */
/*
 module.exports = {
 "options": {
 "*user enters the server*": {
 say: "How may I help you?",
 caption: "Say..",
 "options": {
 "I would like to exchange currency": {
 "say": "What currency do you have?",
 "options": ["Euro", "British pound", "US Dollar", "Bitcoin", "FIMK"],
 next: function (pipe) {
 pipe.say = "Hello";
 /*pipe.todo.options = {};
 pipe.req.session.currency_to_use = pipe.message;


 pipe.todo.say = "What would you like to do with it?";
 var currencies = ["Euro", "British pound", "US Dollar", "Bitcoin", "FIMK"];

 currencies.forEach(function (currency_to_buy) {
 pipe.todo.options["I would like to exchange " + pipe.req.session.currency_to_use + " to " + currency_to_buy + ""] = {
 next: function (pipe) {
 pipe.req.session.currency_to_buy = pipe.message;
 pipe.todo = {
 "say": "Allright then, how much of " + pipe.req.session.currency_to_use + " would you like to exchange?",
 "next": function (pipe) {
 pipe.todo = {
 "say" : "At the current exchange rate of X you will get Y of " + currency_to_buy,
 "options" : ["OK.", "Redefine the amount"]
 }
 pipe.callback(pipe);
 }
 };
 pipe.callback(pipe);
 }
 }
 });
 pipe.callback(pipe);
 }
 },
 "I would like to talk to your supervisor": {
 "say": "Okay, please send email to konsta.gogoljuk@gmail.com"
 }
 },
 options: {
 "I would like to exchange Bitcoin for FIMK": {
 say: "Okay then, what is your FIMK account number?",
 options: ["FIM-123-123-123", "FIM-123-123-123-123"],
 ask: function (fimk_account_number, callback, req, res) {
 req.session.fimk_account_number = fimk_account_number;
 todo.set(email, data);
 callback({
 say: "How much bitcoin would you like to spend?",
 options: ["1", "0.5", "0.1"],
 ask: function (btc_amount, callback, req, res) {
 receiveBitcoinPayment(function (btc_address){
 callback({ say: "You'll get " + config.exchange.bitcoin_fimk_buy + " FIMK for that. It includes 2% transaction fee."
 + "Deposit your bitcoin to this address <div style='font-size:8px'>"
 + btc_address
 + "</div> you will reviece the FIMK after 1 confirmation." },
 req, res);
 }, btc_amount, req.session.fimk_account_number);
 }
 }, req, res);
 }
 },

 "I would like to exchange FIMK for Bitcoin": {
 "say": "Sorry, I don't know how yet"
 },

 "I would like to exchange NXT for FIMK": {
 "say": "Sorry, I don't know how yet"
 },

 "I would like to exchange FIMK for NXT": {
 "say": "Sorry, I don't know how yet"
 },

 "I would like to exchange FIMK for Euros": {
 "say": "Sorry, I don't know how yet"
 },

 "I would like to exchange Euros for FIMK": {
 "say": "Sorry, I don't know how yet"
 },

 "I would like to exchange Euros for Bitcoin": {
 "say": "Sorry, I don't know how yet"
 },

 "I would like to exchange Bitcoin for Euros": {
 "say": "Sorry, I don't know how yet"
 }
 }
 }
 }
 };*/
