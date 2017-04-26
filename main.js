const express = require('express');
const bodyParser = require('body-parser');
const mongo = require('mongodb').MongoClient;
const dbS = require('./databaseSecret');

const app = express();

app.set('port', 3000);
app.get('/',function(req, res, next){
    res.send('express works');
});
app.listen(app.get('port') , function(){
    console.log('Server started ...');
});
app.use(bodyParser.json());
//app.use(bodyParser.urlencoded({ extended: true }));



//
//	login in application
//
app.post('/login', function(req,res,next){
	//
	// making query -> callback . making it sync
	//
	var query = function(fn) {
		var userdata =  {};
		var errorString = "";
		
		if((/^\S+@\S+\.\S{2,4}$/).test(req.body.email)){
			userdata['email'] = req.body.email;	
		}
		else{
			errorString += "Email - bad format.\n";
		}
		
		if((/^\S{8,128}$/).test(req.body.password)){
			userdata['password'] = req.body.password;
		}
		else{
			errorString += "Password - bad format.\n";
		}
		
		if(Object.keys(userdata).length != 2){
			return fn("Error: We don't have enough data OR \n" + errorString, null);
		}
		
        mongo.connect(dbS.host + dbS.database + dbS.tail, function(error, db) {
            if(error){
				return fn("Error: Bad connecting with database. \n" + error, null);
            }
            else{
				db.collection('users').findOne(userdata, function(err , user){
					if(err == null && user != null){
						return fn(null, user);
					}
					else{
						return fn("Error: No one with this email OR password.", null);
					}
					db.close();
				});
            }
        });
    };
	//
	// calling callback function up ^ there
	//
    query(function (err, result) {
        if(err == null){
            res.status(200).send(result);
        }
        else{
            res.status(400).send(err);
        }
    });
});





app.post('/register', function(req,res,next){
    var user =  {};
    
    if((/^\w{2,30}$/).test(req.body.firstName)){
        user['firstName'] = req.body.firstName;
    }
    if((/^\w{2,40}$/).test(req.body.lastName)){
        user['lastName'] = req.body.lastName;
    }
    if((/^\S+@\S+\.\S{2,4}$/).test(req.body.email)){
        user['email'] = req.body.email;
    }
    if(req.body.password == req.body.repass){
        if((/^\S{8,128}$/).test(req.body.password)){
            user['password'] = req.body.password;
        }
    }

    if(Object.keys(user).length == 4){
        //namesti da se proveri unique za email i upisi u bazu

        user['dateOfReg'] = Math.floor(new Date().getTime() / 1000) | 0;
        user['verificationCode'] = Math.random().toString(25).substr(2, 22);
        user['role'] = 'User';
        user['status'] = 'Waiting';
        user['peerID'] = '';
		
		mongo.connect(dbS.host + dbS.database + dbS.tail, function(error, db) {
            if(error){
				res.status(500).json({"server": "Bad connecting with database."});
            }
            else{
				db.collection('users').insertOne(user, function(err , data){
					if(err == null){
						res.status(200).json(user);
					}
					else{
						res.status(400).json({"Server": "Email exist!"});
					}
					db.close();
				});
            }
        });
    }
    else{
        res.status(400).json({"good-input": "false", "user-data": user});
    }
});




app.post('/resetpassword', function(req,res,next){
	
});
app.get('/addfriend', function(req,res,next){

});
app.get('/removefriend', function(req,res,next){

});
app.post('/verifiyemail', function(req,res,next){
	
});




app.post('/getalldata', function(req,res,next){
	var data = [];
	var query = function(fn) {
		mongo.connect(dbS.host + dbS.database + dbS.tail, function(error, db) {
            if(error){
				return fn("Error: Bad connecting with database. \n" + error, null);
            }
            else{		
	var users = db.collection('users').find();
    users.forEach(function(row, err){
        if(err){
            console.log('error : '+err);
        }
        else{
            //console.log('One user : '+ JSON.stringify(row));
            //data.push(row.firstName);
            data.push(row);
        }
    },function(){
        db.close();
        if(data.length){
            return fn(null, data);
        }
        else{
            return fn("Error: no one with this email and password.", null);
        }
    });	
            }
		});
    };
    query(function (err, result) {
        if(err == null){
            res.status(200).send(result);
        }
        else{
            res.status(400).send(err);
        }
    });
});