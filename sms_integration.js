var request = require('request');
var config = require('./config.json');
var Detail = require('./detail');
var nodemailer = require('nodemailer');

var mongoose = require('mongoose');
mongoose.connect('localhost');

var memory;

var sms = {};
sms.generateShortSecret = function() {
    return  Math.random().toString(36).slice(-5);
}

sms.generateGiftcard = function(amount, currency, secret, callback) {
    // getinfo
    var new_secret = sms.generateShortSecret();
    
    var get_reqest = config.fimk_api
        + '/nxt?requestType=getAccountId&secretPhrase='
        + encodeURIComponent(config.fimk_secret + new_secret);
    console.log(get_reqest);
    request.get(get_reqest,
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var obj = JSON.parse(body);
                sms.send(obj.accountRS, amount, secret, function(err, tx) {
                    callback(err, tx, new_secret);
                });
            }
        }
    );
}

sms.mailGiftcard = function(res, email, amount, currency, from, secret) {
    console.log('mailGiftcard '+secret);
    sms.generateGiftcard(amount, currency, secret, function(error, tx, new_secret){
        console.log('Transaction secret: '+new_secret+' from: '+from);
        if (error) {
            sms.sendSMS(from, "Transaction failed: "+error);
            res.send(JSON.stringify({'error': error}));
        } else {
            sms.sendSMS(from, 
                "Transaction complete, transaction reference "
                + "number is "+tx);
            var transporter = nodemailer.createTransport();
            transporter.sendMail({
                'from': config.admin,
                'to': email,
                'subject': 'You have recieved a giftcard from '+from,
                'text': "You have recieved " + amount + " " + currency 
                + "\nYour secret is "+new_secret
                + "\nSend it forward by replying by SMS to "
                + config.twilio.number+" with this syntax: "
                + "\nsend 1.123 fimk +358412345671 "+new_secret
                + "\nVisit https://sms.fimk.fi to get registered"
            });
            res.send(JSON.stringify({'tx_id': tx}));
        }
    });
}

sms.smsGiftcard = function(res, number, amount, currency, from, secret) {
    sms.generateGiftcard(amount, currency, secret, function(error, tx, new_secret){
        if (error) {
            sms.sendSMS(from, "Transaction failed: "+error);
            res.send(JSON.stringify({'error': error}));
        } else {
            sms.sendSMS(from, 
                "Transaction complete, transaction reference "
                + "number is "+tx);
            sms.sendSMS(number, "You have recieved "
                + amount + " " + currency + " \nYour secret is "+new_secret
                + "\nSend it forward by replying by SMS with this syntax: "
                + "\nsend 1.123 fimk +358412345671 "+new_secret
                + "\nVisit https://sms.fimk.fi to get registered");
            res.send(JSON.stringify({'tx_id': tx}));
        }
    });

}


sms.getInfo = function(secret, cb) {

    var get_reqest = config.fimk_api
        + '/nxt?requestType=getAccountId&secretPhrase='
        + encodeURIComponent(config.fimk_secret + secret);
        
    console.log("'"+get_reqest+"'");
    request.get(get_reqest,
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var obj = JSON.parse(body);
                console.log(obj);

                request.get(config.fimk_api
                + '/nxt?requestType=getAccount&account='
                + obj.accountId,
                    function (error, response, body) {
                        if (!error && response.statusCode == 200) {
                        
                            var obj2 = JSON.parse(body);
                                console.log(obj2);
                            if (!obj2.errorDescription) {
                                
                                 
                                request.get(config.fimk_api
                                + '/nxt?requestType=getAccountTransactionIds'
                                + '&timestamp=0&account='
                                + obj.accountId,
                                    function (error, response, body) {
                                        if (!error && response.statusCode == 200) {
                                             var obj3 = JSON.parse(body);
                                             var tx1 = obj3.transactionIds.pop();
                                             console.log(tx1);
                                             if (typeof tx1 !== 'undefined') {
                                                 
                                             }
                                        }
                                    });
    
                                    var balance = (parseInt(obj2.balanceNQT)/100000000);
    // -------------
    
    var SMS = obj.accountRS+" Balance: "+balance+" FIMK\n"
    //+ amount + " " + fimk_address
    //+ amount + " " + fimk_address
    //+ amount + " " + fimk_address
    
    // -------------
                                cb(SMS, {'accountRS':obj.accountRS, 'balance':balance});
       
                            } else {
                                cb(obj.accountRS
                                    + " Balance: "
                                    + 0
                                    + " FIMK\n", {'accountRS':obj.accountRS, 'balance':0});
                            }
                        }
                    }
                );
            }
        }
    );
}

sms.validateEmail = function(email) { 
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
} 

sms.validatePhone = function(phone) { 
    var re = /\+[0-9]/;
    return re.test(phone);
} 

sms.validateNumber = function(number) { 
    var re = /[0-9]/;
    return re.test(number);
} 

sms.validateFimkAddress = function(fimk_address) { 
    var re = /(FIM|Fim|fim)-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}/;
    return re.test(fimk_address);
}


sms.send = function(to, amount, secret, callback) {
    var url = config.fimk_api
        + '/nxt?requestType=sendMoney&secretPhrase=' 
        + encodeURIComponent(config.fimk_secret + secret)
        + '&recipient=' + to
        + '&amountNQT=' + (amount * 100000000)
        + '&feeNQT=' + config.fimk_tx_fee
        + '&deadline=1440';
    console.log(url);
    request.get(url, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var obj = JSON.parse(body);
            console.log(obj);
            if (obj.errorDescription) {
                callback(obj.errorDescription);
            } else {
                callback(false, obj.transaction);
            }
        } else {
            callback(error);
        }
    });
}

var invoices = [];
sms.invoice = function(o,cb){
    Detail.findOne({'phone_number': o.from}, function(error, user) {
        if (!user) {
            sms.sendSMS(o.from, 'You need to be registered in order to send invoices, sorry');
            cb({"error":"Registration reqired"});
        } else {
            sms.sendSMS(o.to, 'Payment request from '+user.fullname+' '+o.from+' for '+ o.amount +' '
                + o.currency + ' confirm by replying to this message with your secret');
            invoices[o.to] = o;
            cb({"msg":"Invoice success!", "user":user});
        }
    });
}

sms.sendSMS = function(to, message) {
    console.log('sendSMS '+to+' '+message);
    if (to == 'noreply'){ return; }
    var accountSid = config.twilio.account_sid;
    var authToken = config.twilio.auth_token;
    var client = require('twilio')(accountSid, authToken);
    if (to.charAt(0) != '+') { to = '+'+to; }
    var msg = {
        'body' : message,
        'to'   : to,
        'from' : config.twilio.number
    };
    console.log(msg);
    client.messages.create(msg, function(err, message) {
        console.log(err);
        console.log(message);
    });

}



    sms.smsSyntaxError = function(to) {
        sms.sendSMS(to,
          "SyntaxError, please refer to this syntax \n"
        + "send [amount] fimk [fimk address/phone/email] [secret] \n"
        + "for examples: \n"
        + "send 1.421 fimk +358415234256 sec23 \n"
        + "request 1.421 fimk droppenk@gmail.com sec23 \n"
        + "info sec23 \n");
    }
    
    
    // curl --data "Body=send+1+fimk+droppenk@gmail.com&From=+358415370389" http://localhost/sms_api
    sms.smsNXTExpressHook = function (req, res) {
        console.log('api call');
        //console.log(req.body);
        if (typeof req.body.Body !== 'undefined') {
            var message = decodeURIComponent(req.body.Body);
            console.log('message: '+message);
        } else {
            console.log('sms break');
            res.send('{"error": "Invalid call"}');
            return;
        }
        if (typeof req.body.From !== 'undefined') {
            var from = req.body.From;
        } else {
            from = "noreply";
        }
        
        var args = message.split(" ");
        
        
        if (typeof invoices[from] !== 'undefined') {
            if (args.length == 1) {
                args = ('send '
                + invoices[from].amount+' '
                + invoices[from].currency+ ' ' 
                + invoices[from].from + ' '+ args[0]).split(" ");
                invoices[from] = undefined;
            }
        }
        
        var command = args[0].toLowerCase();
        var amount;
        var currency;
        var to;
        var secret;
        
        /*if (/[@#$%^&*();\/|<>"']/.test(secret)) { 
            sms.smsSyntaxError(from);
            return;
        }*/
        
        
        console.log(command);
        if (command == 'send') {
            amount = parseFloat(args[1]);
            currency = args[2];
            to = args[3];
            
            secret = args[4];
            if (typeof secret === 'undefined') {
                sms.sendSMS(from, 'Please enter your secret');
                res.end();
                return;
            }
            console.log('secret: '+secret);
            console.log('to: '+to);
            // if a registered user has registered their number or email
            // with a secret this will send fimk directly to that wallet
            if (sms.validateEmail(to)) {
                Detail.findOne({ 'user' :  to }, function(err, user) { 
                    if (!user) {
                        sms.mailGiftcard(res, to, amount, currency, from, secret);
                    } else if (sms.validateFimkAddress(user.fimk_address)) {
                        sms.send(user.fimk_address, amount, secret)
                    } else {
                        sms.mailGiftcard(res, to, amount, currency, from, secret);
                    }
                });
            } else if (sms.validatePhone(to)) {
                console.log('is a valid phone number');
                Detail.findOne({ 'phone_number' :  to }, function(err, user) { 
                    console.log('here');
                    console.log(user);
                    console.log(err);
                    if (!user) {
                        sms.smsGiftcard(res, to, amount, currency, from, secret);
                    } else if (sms.validateFimkAddress(user.fimk_address)) {
                        sms.send(user.fimk_address, amount, secret, function(error, tx) {
                            if (error) {
                               sms.sendSMS(from, "Transaction failed: "+error);
                               res.send(JSON.stringify({'error': error}));
                            } else {
                               sms.sendSMS(from, 
                                    "Transaction complete, transaction reference "
                                    + "number is "+tx);
                               sms.sendSMS(to, "You have recieved "
                                    + amount + " " + currency
                                    + "\nsend it forward with this syntax: "
                                    + "\nsend "+ amount + " " + currency 
                                    + " [email/phone number] [your secret]"
                                    + "\nmore info: https://sms.fimk.fi");
                                res.send(JSON.stringify({'tx_id': tx}));
                            };
                        })
                    } else {
                        sms.smsGiftcard(res, to, amount, currency, from, secret);
                    }
                });
            } else if (sms.validateFimkAddress(to)) {
                sms.send(to, amount, secret, function(error, tx) {
                    if (error) {
                       res.send(JSON.stringify({'error': error}));
                    } else {
                        res.send(JSON.stringify({'tx_id': tx}));
                    };
                });
            } else if (sms.validateNumber(to)){
               sms.sendSMS(from, 'Please enter the number in +(countrycode)number'
                + 'so that 0415632758 becomes +358415632758');
                res.send('{"error": "Number syntax error"}');
            } else {
                sms.smsSyntaxError(from);
            }
        } else if (command == 'invoice') {
            var o = {};
            o.amount = parseFloat(args[1]);
            o.currency = parseFloat(args[2]);
            o.from = from;
            o.to = args[3];
            sms.invoice(o, function(r) {
                res.send(JSON.stringify(r));
            });
        } else if (command == 'info') {
            secret = args[1];
            sms.getInfo(secret, function(msg, obj) { 
                sms.sendSMS(from, msg); 
                return res.send(JSON.stringify(obj));
            });
        } else {
            sms.smsSyntaxError(from);
            res.send('{"error": "syntax error"}');
        }
        
    };
       
module.exports = sms;