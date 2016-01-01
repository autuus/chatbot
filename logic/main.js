var request = require('request');
var todo = require('../simply_json')('todo');
var config = require('../config.json');

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

var askForSessionVariable = function(o, variable, say, callback) {                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww
    my_memory[o.req.sessionID] = {};
    my_memory[o.req.sessionID].function_callback = callback;
    o.todo.say = say;
    o.req.session.variable_to_ask = variable;
    o.todo.caption = "";
    o.todo.options = [{
        option: "I'd rather not",
        "select" : function (o) {
            o.req.session[o.req.session.variable_to_ask] = "";
            o.todo.function_callbck(o);
        }
    }, {
        option: "&lt; Back to the top &gt;",
        "select" : function (o) {
            o.quit(o);
        }
    }];
    o.todo.callback = function(o) {
        o.req.session[o.req.session.variable_to_ask] = o.message;
        my_memory[o.req.sessionID].function_callback(o);
    };
    o.next(o);
}

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

module.exports = function(o) {
  o.todo = {
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
}
o.next(o);
};

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