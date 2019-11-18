//login
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var exphbs = require('express-handlebars');
var expressValidator = require('express-validator');
var flash = require('connect-flash');
var session = require('cookie-session');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var mongo = require('mongodb');
var mongoose = require('mongoose');

// mongoose.connect('mongodb://localhost/Updated');
/*this is to stop the deprecation warning of the mongoose
*in mongoose higher version we need our own mongoose promise so by
*having this @param mongoose.promise = global.promise
*and using useMongoClient:true = it will prevent deprecation warning
*/
mongoose.Promise = global.Promise; 
mongoose.connect('mongodb://loginapp123:loginapp@ds143131.mlab.com:43131/loginapp1234', { useMongoClient: true }, function (ignore, connection) {
  connection.onOpen()
}).then(() => {
  console.log('connected')
})
.catch(console.error)
// ---------- end -------------
var db = mongoose.connection;

var routes = require('./routes/index');
var users = require('./routes/users');
//end login

//===============================================================================
//get the path of the user.js so that we can access the userchema of the mongoose
//for the login , registration , and e-money
var User = require('./models/user');

//==============================================================================

var http = require('http'),
    url = require('url'),
    path = require('path'),
    fs = require('fs'),
    uuid = require('node-uuid');
var express = require("express");
var app = require('express')();
var io = require('socket.io')(http);
var serveStatic = require('serve-static')
var easyrtc = (require("./lib/easyrtc_server"));
//set port
var port = process.env.PORT || 8080;
//set process name
process.title = "node-easyrtc";

// Add request module to call XirSys servers
var request = require("request");

var app = express();
//app.use(serveStatic('static', {'index': ['index.html']}));


//view Engine login
app.set('views', path.join(__dirname, 'views'));
app.engine('handlebars', exphbs({defaultLayout: 'layout'}));
app.set('view engine', 'handlebars');

//BodyParser Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, 'public')));

//-------momery leaks here--------

app.set('trust proxy', 1) // trust first proxy
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: {secure: true}
    
}));
//---------------------------------------------------

//Passport Initialization
app.use(passport.initialize());
app.use(passport.session());

//express validator(github page)
app.use(expressValidator({
    errorFormatter: function(param, msg, value){
        var namespace = param.split('.'),
        root = namespace.shift(),
        formParam = root;

        while(namespace.length){
            formParam += '[' + namespace.shift() +']';
        }
        return{
            param : formParam,
            msg   : msg,
            value : value
        };
    }
}));

//connect flash
app.use(flash());

//set global variables
app.use(function(req, res, next){
    res.locals.success_msg = req.flash('success_msg');
    res.locals.teach_val = req.flash('teach_val');
    res.locals.stud_val = req.flash('stud_val');
    res.locals.admin_val = req.flash('admin_val');
    res.locals.teach_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.user || null;
    next();
});

app.use('/', routes);
app.use('/users', users);
//end

var person= "";

//button
io.on('connection',function(socket){
    // socket.on("chat user", function(name){
    //     person = name;
        // io.emit('chat user',person);
    // });

    //bulb
    socket.on('chat message', function(msg){
        io.emit('chat message',msg);
    });
    //ask a question
    socket.on('ask question', function(aquestion){
        io.emit('ask question',aquestion);
    });
    //raise hand
    socket.on('raise hand',function(raisehands){
        io.emit('raise hand',raisehands);
    });
    //say i
    socket.on('say i', function(say){
        io.emit('say i', say);
    });
    socket.on('chat live', function(user,chat){
        io.emit('chat live',user,chat);
    });

    socket.on('btn muted', function(vclss){
        io.emit('video id',vclss);
    });

    socket.on('con notif', function(uid,stud,stat){
        io.emit('tech notif',uid,stud,stat);
    });

    socket.on('stud notif', function(uid,stud,stat){
        io.emit('stud notif',uid,stud,stat);
    });

    socket.on('message', function (data) {
        var fileName = uuid.v4();
        
        socket.emit('ffmpeg-output', 0);

        writeToDisk(data.audio.dataURL, fileName + '.wav');

        // if it is chrome
        if (data.video) {
            writeToDisk(data.video.dataURL, fileName + '.webm');
            merge(socket, fileName);
        }

        // if it is firefox or if user is recording only audio
        else socket.emit('merged', fileName + '.wav');
    });

    socket.on('update e-money', function (lahat) {
        var userName = lahat.username;
        // var newMoney = lahat.newMoney;
        var inf = lahat.inf;
        var ineasyrtcid = lahat.ineasyrtcid;
        var inAdd = parseFloat(lahat.deduct);
        var inMoney = 0;
        var inNewMoney = 0;
        var stNewMoney = 0;
        User.findOne({"username":userName}, function (err, valuest) {
            stNewMoney = parseFloat(valuest.e_money)-inAdd;
            if (stNewMoney >= 0 ) {
                User.findOne({"username":inf}, function (err, value) {

                    if(err){
                        io.emit('e-money error', {err:err, userNameSt: userName});
                    } else {
                        // io.emit('e-money response', {newMoney: value.e_money});
                        inMoney = parseFloat(value.e_money);
                      //   //var query = {"name": userName};
                        inNewMoney = inMoney + inAdd;
                      // update the entry on the database
                        User.findOneAndUpdate({"username":userName}, {"$set":{"e_money": stNewMoney }}, { upsert: true, returnOriginal:false }, function (err, doc) {

                            if(err){
                                io.emit('e-money error', {err:err, userNameSt: userName});
                            } else {
                                io.emit('e-money response', {newMoney: stNewMoney, userNameSt: userName, ineasyrtcid: ineasyrtcid, inf: inf});
                                console.log(doc);
                                User.findOneAndUpdate({"username":inf}, {"$set":{"e_money": inNewMoney }}, { upsert: true, returnOriginal:false }, function (err, doc2) {

                                    if(err){
                                        io.emit('e-money error', {err:err, userNameSt: userName});
                                    } else {
                                        io.emit('e-money influence', {newMoneyIn: inNewMoney, userName: inf});
                                        console.log(doc2);
                                    }
                                });
                            }
                        });
                    }        
                });
            }else{
                io.emit('stud notif', userName,userName,'infunds');
                console.log("Insufficient Student Credit : "+parseFloat(valuest.e_money));
            }
        });
    });

    socket.on('give coffee', function(allneed){
        var studUsername = allneed.username;
        var inUsername = allneed.inUserId;
        var coFee = allneed.cofee;

        User.findOne({"username":studUsername}, function (err, valuest) {
            stNewMoney = parseFloat(valuest.e_money)-coFee;
            if (stNewMoney >= 0 ) {
                User.findOne({"username":inUsername}, function (err, value) {

                    if(err){
                        io.emit('e-money error', {err:err, userNameSt: userName});
                    } else {
                        // io.emit('e-money response', {newMoney: value.e_money});
                        inMoney = parseFloat(value.e_money);
                      //   //var query = {"name": userName};
                        inNewMoney = inMoney + coFee;
                      // update the entry on the database
                        User.findOneAndUpdate({"username":studUsername}, {"$set":{"e_money": stNewMoney }}, { upsert: true, returnOriginal:false }, function (err, doc) {

                            if(err){
                                io.emit('e-money error', {err:err, userNameSt: userName});
                            } else {
                                io.emit('e-money response', {newMoney: stNewMoney, userNameSt: studUsername});
                                console.log(doc);
                                User.findOneAndUpdate({"username":inUsername}, {"$set":{"e_money": inNewMoney }}, { upsert: true, returnOriginal:false }, function (err, doc2) {

                                    if(err){
                                        io.emit('e-money error', {err:err, userNameSt: userName});
                                    } else {
                                        io.emit('e-money influence', {newMoneyIn: inNewMoney, userName: inUsername});
                                        io.emit('stud notif', studUsername,inUsername,'sendCof');
                                        io.emit('tech notif', inUsername,studUsername,'sendCof');
                                        console.log(doc2);
                                    }
                                });
                            }
                        });
                    }        
                });
            }else{
                io.emit('stud notif', studUsername,studUsername,'infunds');
                console.log("Insufficient Student Credit : "+parseFloat(valuest.e_money));
            }
        });
    });

    socket.on('dollar quest', function(dolquest,dolamnt,uid,stud,stat){
        User.findOne({"username":stud}, function (err, valuest) {
            stNewMoney = parseFloat(valuest.e_money) - dolamnt;
            if (stNewMoney >= 0 ) {
                io.emit('tech notif',uid,stud,stat);
            }else{
                io.emit('stud notif', stud,stud,'infunds');
                console.log("Insufficient Student Credit : "+parseFloat(valuest.e_money));
            }
        });
    });
});
//end

//start express http server on port 8080
var webServer = http.createServer(app).listen(port);

var socketServer = io.listen(webServer,{"log level": 1});

easyrtc.setOption("logLevel", "debug");

// Overriding the default easyrtcAuth listener, only so we can directly access its callback
easyrtc.events.on("easyrtcAuth", function(socket, easyrtcid, msg, socketCallback, callback) {
    easyrtc.events.defaultListeners.easyrtcAuth(socket, easyrtcid, msg, socketCallback, function(err, connectionObj){
        if (err || !msg.msgData || !msg.msgData.credential || !connectionObj) {
            callback(err, connectionObj);
            return;
        }

        connectionObj.setField("credential", msg.msgData.credential, {"isShared":false});

        console.log("["+easyrtcid+"] Credential saved!", connectionObj.getFieldValueSync("credential"));

        callback(err, connectionObj);
    });
});

// To test, lets print the credential to the console for every room join!
easyrtc.events.on("roomJoin", function(connectionObj, roomName, roomParameter, callback) {
    console.log("["+connectionObj.getEasyrtcid()+"] Credential retrieved!", connectionObj.getFieldValueSync("credential"));
    easyrtc.events.defaultListeners.roomJoin(connectionObj, roomName, roomParameter, callback);
});

easyrtc.on("getIceConfig",function(connectionObj, callback){
    //this object will  take in arrays of Xirsys STUN and TURN servers
    var iceConfig = [];

    request.post('https://service.xirsys.com/ice',{
        form:{
            ident: "ginxx",
            secret: "db051954-4290-11e7-a95e-0ea6b39d0c6a",
            domain: "www.test-livestream.com",
            application: "test-livestream",
            room: "test-livestream-room",
            secure: 1
        },
        json:true
    },
    function(error, response, body){
        if(!error && response.statusCode == 200){
            //body.d.iceServers is where the array of ICE servers lives
            iceConfig = body.d.iceServers;
            console.log(iceConfig);
            callback(null,iceConfig);
        }
    });
});

// Start EasyRTC server
var rtc = easyrtc.listen(app, socketServer, null, function(err, rtcRef) {
    console.log("Initiated");

    rtcRef.events.on("roomCreate", function(appObj, creatorConnectionObj, roomName, roomOptions, callback) {
        console.log("roomCreate fired! Trying to create: " + roomName);

        appObj.events.defaultListeners.roomCreate(appObj, creatorConnectionObj, roomName, roomOptions, callback);
    });
});

// Start EasyRTC server with options to change the log level and add dates to the log.
// var rtc = easyrtc.listen(
//         app,
//         socketServer,
//         null,
//         function(err, rtc) {
//             // Creates a new application called easyrtc.instantMessaging with locked down rooms.
//             rtc.createApp(
//                 "easyrtc.multistream", 
//                 {
//                     "roomAutoCreateEnable":false,
//                     "roomDefaultEnable":false
//                 },
//                 null
//             );
//         }
// );

// Callback listener for the EasyRTC application "easyrtc.instantMessaging"  
// var myEasyrtcApp = function(err, appObj) {
//     appObj.createRoom("redroom",null,function(err, roomObj){});
//     appObj.createRoom("blueroom",null,function(err, roomObj){});
//     appObj.createRoom("greenroom",null,function(err, roomObj){});
// };

webServer.listen(port, function(){
  console.log('listening on *:' + port);
});




// isn't it redundant?
// app.listen(8888);

function writeToDisk(dataURL, fileName) {
    var fileExtension = fileName.split('.').pop(),
        fileRootNameWithBase = 'public/uploads/' + fileName,
        filePath = fileRootNameWithBase,
        fileID = 2,
        fileBuffer;

    // @todo return the new filename to client
    while (fs.existsSync(filePath)) {
        filePath = fileRootNameWithBase + '(' + fileID + ').' + fileExtension;
        fileID += 1;
    }

    dataURL = dataURL.split(',').pop();
    fileBuffer = new Buffer(dataURL, 'base64');
    fs.writeFileSync(filePath, fileBuffer);

    console.log('filePath', filePath);
}

function merge(socket, fileName) {
    var FFmpeg = require('fluent-ffmpeg');

    var audioFile = path.join(__dirname, 'public/uploads', fileName + '.wav'),
        videoFile = path.join(__dirname, 'public/uploads', fileName + '.webm'),
        mergedFile = path.join(__dirname, 'public/uploads', fileName + '-merged.webm');

    new FFmpeg({
            source: videoFile
        })
        .addInput(audioFile)
        .on('error', function (err) {
            socket.emit('ffmpeg-error', 'ffmpeg : An error occurred: ' + err.message);
        })
        .on('progress', function (progress) {
            socket.emit('ffmpeg-output', Math.round(progress.percent));
        })
        .on('end', function () {
            socket.emit('merged', fileName + '-merged.webm');
            console.log('Merging finished !');

            // removing audio/video files
            fs.unlink(audioFile);
            fs.unlink(videoFile);
        })
        .saveToFile(mergedFile);
}
