var express    = require('express')
var bodyParser = require('body-parser')
//var http = require('http');
var fs = require('fs');
var config = require('./config.json');
var logic = require('./logic/btc_exchange.js');
var beautify = require('js-beautify').js_beautify;
var path = require('path'); 
var nodemailer = require('nodemailer');


var toSource = require('tosource');

var app = express();
 
// imported funtion, to clone an object.
function clone(obj) {
    //return obj;
    // Handle the 3 simple types, and null or undefined
    if (null === obj || "object" != typeof obj) return obj;
    
    var copy;
    // Handle Date
    if (obj instanceof Date) {
        copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
    }

    // Handle Array
    if (obj instanceof Array) {
        copy = [];
        for (var i = 0, len = obj.length; i < len; i++) {
            copy[i] = clone(obj[i]);
        }
        return copy;
    }

    // Handle Object
    if (obj instanceof Object) {
        copy = {};
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
        }
        return copy;
    }

    throw new Error("Unable to copy obj! Its type isn't supported.");
}


var memory = {};

function meaningParser(app, req, res) {



    // goto goes something like this
    function goto(o, address) {
        var _ = logic;
        for (var i = 0; i < address.length; i++) {
            _ = logic.options[address[i]].select(o);
        }
        return _;
    }

    function next(o) {
        //console.log("saved");
        memory[o.req.sessionID] = o.todo;
        //o.todo.callback = o.todo.callback.toString();
        if (config.devmode) {
            //console.log(toSource(o.todo));
            //console.log(beautify(toSource(o.todo), { "wrap_line_length": 80}));
            o.todo.edit = beautify(toSource(o.todo), { "wrap_line_length": 80});
        }
        console.log("\n\n\n\n");
        if (o.req.phone_call) {
            console.log("nyah");
            o.res.send('<?xml version="1.0" encoding="UTF-8"?>'
                + '<Response>'
                + '<Say voice="woman">yo</Say>'
                + '<Record maxLength="20" />'
                + '</Response>');
        } else {
            if (config.devmode) {
                //console.log(o.todo);
            }
            o.res.send(JSON.stringify(o.todo));
        }
        delete o.todo.edit;
        //console.log(memory[o.req.sessionID]);
    }
    
    function require(file) {
        if (path.existsSync(file)) {
            require(file);
        } else {
            file.split("/");
        }
    }

    function error(o) {
        o.res.send(JSON.stringify({ say: "There was an error.", options: [{"option": "Ok."}] }));
    }

    function quit(o) {
        logic(o);
    }
    
    function ask(o, variable, callback) {
        memory[o.req.sessionID+"_ask"] = {};
        memory[o.req.sessionID+"_ask"].function_callback = callback;
        o.req.session.variable_to_ask = variable;
        o.todo.callback = function(o) {
            o.req.session[o.req.session.variable_to_ask] = o.message;
            memory[o.req.sessionID+"_ask"].function_callback(o, o.message);
        };
        o.next(o);
    };
    
    function email(email, subject, message) {
        var transporter = nodemailer.createTransport();
        transporter.sendMail({
            'from': config.admin,
            'to': email,
            'subject': subject,
            'text': message
        });
    }


    if (req.body.message == "*user enters the server*" || req.phone_call) {
        memory[req.sessionID] = {"say": "I have not been told what to do.."};
    }
    
    var o = {
        "app" : app,
        "req" : req,
        "res": res,
        "next": next,
        "quit": quit,
        "ask": ask,
        "email": email,
        "todo": clone(memory[req.sessionID])
    };
    
    if (req.body.message == "*user enters the server*" || req.phone_call) {
        logic(o);
        return;
    }
    
    console.log(o.todo);
    console.log("loaded");

    if (typeof req.body === 'undefined') {
        error(o);
        return;
    } else {
        o.message = req.body.message;
    }

    if (typeof o.message === "undefined") {
        error(o);
        return;
    }
    
    console.log("message: "+o.message);

    if (o.message == "*user enters the server*") {
        memory[req.sessionID] = clone(logic);
        memory[req.sessionID+"_ask"] = "";
        o.todo = memory[req.sessionID];
        o.next(o);
        console.log("Destroy sesstion");
        return;
    }

    if (typeof o.todo === "undefined") {
        o.todo = clone(logic);
        next(o);
        return;
    }

    if (typeof o.todo.options == "undefined") {
        o.todo.options = [];
    }

    for (var key in o.todo.options) {
        console.log(o.todo.options[key].option);
        if (o.todo.options[key].option === o.message) {
            if (typeof o.todo.options[key].value !== "undefined") {
                o.value = o.todo.options[key].value;
            }
            
            //if (typeof o.todo.options[key].say !== 'undefined') {
            //    o.todo.say = o.todo.options[key].say;
            //}
            
            if (typeof o.todo.options[key].select !== "undefined") {
                o.todo.options[key].select(o);
                return;
            }
        }
    }

    if (typeof o.todo.callback === "function") {
        o.todo.callback(o);
        return;
    }

    console.log("fall");
    error(o);

}

app.use(express.cookieParser());
app.use(express.session({secret: 'My balls hurt'}));
app.use(bodyParser.urlencoded({
    extended: true
}));


function middleware(req, res, next) {
    console.log(req.url);
    next();
}

app.use(middleware);

app.get('/', function(req, res){
    res.send(fs.readFileSync("public/index.html", "utf8"));
});

app.post('/voice', function(req, res){
    console.log(req.body);
    req.phone_call = true;
    meaningParser(req, res);
});
app.post('/chat', function(req, res) {
    meaningParser(app, req, res);
});

app.post('/sms_api', require("./sms_integration").smsNXTExpressHook);

app.use('/api', function(req, res) {
    // call with ["chat options", "next option"]; or something...
});


app.use(express.static(__dirname + '/public'));
console.log("Running on "+config.port);
app.listen(config.port);



/*
    if (typeof o.message === "undefined") {
        if (o.todo['options'].toString() === "[object Object]") {
        console.log("hey");
        res.send({ say: "What?", options: [{"text": "File a bug report"}] });
        return;
    }
*/

/*
     else if (typeof o.todo === "undefined") {
        memory[req.sessionID] = clone(logic);
        o.todo = memory[req.sessionID];
        console.log("conclusion 1");
    } else if (typeof o.todo['options'] === "undefined") {
        pipe.todo = brainFart();
        console.log("conclusion 2");
        end(pipe);
    } else if (typeof todo.next === "function") {
        console.log("call next function with "+message);
        todo.next(pipe);
        console.log("conclusion 3");
    } else if (typeof todo === "function") {
        console.log("function with "+message);
        todo(req, res, end);
        console.log("conclusion 4");
    }
    else if (todo['options'].toString() === "[object Object]") {
        if (typeof todo['options'][message] === "undefined") {
            pipe.todo = brainFart();
            console.log("conclusion 5");
        } else if (typeof todo['options'][message].next !== "undefined") {
            pipe.todo = todo['options'][message];
            todo['options'][message].next(pipe);
            console.log("conclusion 6");
        } else {
            pipe.todo = todo['options'][message];
            console.log("conclusion 6");
        }
        end(pipe);
    } else {
        todo = brainFart();
        console.log("conclusion 7");
        end(pipe);
    }
*/
    /*
    if (typeof(todo) === "undefined") {
        todo = { say: "What?" };

    var hmm;

    if (req.session.ask) {
        req.session[req.session.ask] = req.body.message;
        hmm = phrases[req.session.next];
        delete(req.session.ask);
        console.log(hmm);
    } else {
        hmm = phrases[req.body.message];
    }
    var data = {};
    if (typeof(hmm) === "undefined") {
        data = {message: "What?"};
    } else if (typeof(hmm) === "function") {
        data = hmm(req, res);
    } else {
        data = hmm;
    }
    res.send(JSON.stringify(data));
    */
    
    /*app.post('/chat', function(req, res) {
        console.log(req.body);
        var hmm;

        if (req.session.ask) {
            req.session[req.session.ask] = req.body.message;
            hmm = phrases[req.session.next];
            delete(req.session.ask);
            console.log(hmm);
        } else {
            hmm = phrases[req.body.message];
        }
        var data = {};
        if (typeof(hmm) === "undefined") {
            data = {message: "What?"};
        } else if (typeof(hmm) === "function") {
            data = hmm(req, res);
        } else {
            data = hmm;
        }
        res.send(JSON.stringify(data));
    });*/