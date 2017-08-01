const express = require('express');
const bodyParser = require('body-parser');
const mongo = require('mongodb').MongoClient;
const dbS = require('./databaseSecret');
const mailS = require('./mailSecret');
const ObjectID = require('mongodb').ObjectID;

const app = express();

const sendgrid = require('sendgrid')(mailS.key);
const helper = require('sendgrid').mail;
const _idRegex = /^[0-9a-fA-F]{24}$/;

app.set('port', process.env.PORT || 443);
app.get('/',function(req, res, next){
    res.send("I'm a student and this is an application for learning");
});
app.listen(app.get('port') , function(){
    console.log('Server started ...');
});

app.use(bodyParser.json());
//app.use(bodyParser.urlencoded({ extended: true }));

function sendEmail(sendOption, toMail){
	let mail = new helper.Mail();
	mail.setFrom(new helper.Email('registration@vmev.com'));
	mail.addContent(new helper.Content('text/html', 'Template'));
	
	if(sendOption == "registration"){
		mail.setSubject("VMEV - Registration");
		
		let personalization = new helper.Personalization();
		personalization.addTo(new helper.Email(toMail));
		personalization.addSubstitution(new helper.Substitution('-username-', 'Jamie Urukalo'));
		//dodati za dugme i namestiti u template-u
		mail.addPersonalization(personalization);
		
		mail.setTemplateId("abb90154-540e-4cb3-b1de-b46d1afcb60d");
	}
	else if(sendOption == "verification"){
		//kod odozgo samo promeniti neke stvari
	}
	
	let request = sendgrid.emptyRequest({
	    method: 'POST',
	    path: '/v3/mail/send',
	    body: mail.toJSON()
	});
	sendgrid.API(request, function (error, response) {
		if (error) {
			console.log('Error: Email response received -> '+ error + " -- response -> " + response);
		}
	});
}

function dbQuery(callback){
	mongo.connect(dbS.host + dbS.database + dbS.tail, function(error, db) {
        if(error){
			res.status(500).json({"server": "Bad connecting with database."});
        }
        else{
			callback(db);
		}
	});
}


/*
***************
**  ROUTING  **
***************
*/

//
//	login in application
//
app.post('/login', function(req,res,next){
	let userdata =  {};
		
	if((/^\S+@\S+\.\S{2,4}$/).test(req.body.email)){
		userdata['email'] = req.body.email;	
	}
		
	if((/^\S{8,128}$/).test(req.body.password)){
		userdata['password'] = req.body.password;
	}
		
	if(Object.keys(userdata).length != 2){
		res.status(400).json({"Server": "Bad input!"});
	}
	else{
		dbQuery(function(db){
			userdata['status'] = 'Verified';
			db.collection('users').findOne(userdata,{"password": 0, "dateOfReg": 0, "verificationCode": 0, "status": 0, "friends": 0}, function(err , user){
				if(err == null && user != null){
					res.status(200).send(user);
				}
				else{
					res.status(400).json({"Server": "No one with this email OR password."});
				}
				db.close();
			});
		});
	}
});

//
//	register in application
//
app.post('/register', function(req,res,next){
    let user =  {};
    
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
        user['dateOfReg'] = Math.floor(new Date().getTime() / 1000) | 0;
        user['verificationCode'] = Math.random().toString(25).substr(2, 22);
        user['status'] = 'Waiting';
        user['peerID'] = '';
		user['friends'] = [];
		
		dbQuery(function(db){
			db.collection('users').insertOne(user, function(err , data){
				if(err == null){
					sendEmail(user.email,'Sending with SendGrid is Fun','and easy to do anywhere, even with Node.js');
					
					res.status(200).json({"Server": "Thanks for registering. We sent you email to verifying it."});
				}
				else{
					res.status(400).json({"Server": "Email exist!"});
				}
				db.close();
			});
         
		});
    }
    else{
        res.status(400).json({"good-input": "false", "user-data": user});
    }
});

//
//	change password for application
//
app.post('/changePassword', function(req,res,next){
	let user =  {};
    let newPass = null;
	
	if(_idRegex.test(req.body._id)){
		user['_id'] = new ObjectID(req.body._id);
	}
    if((/^\S{8,128}$/).test(req.body.old_pass)){
        user['password'] = req.body.old_pass;
    }
    if(req.body.password == req.body.repass){
        if((/^\S{8,128}$/).test(req.body.password)){
            newPass = req.body.password;
        }
    }

    if(Object.keys(user).length == 2 && newPass != null){
		dbQuery(function(db){
			db.collection('users').updateOne(user,{$set:{'password': newPass}}, function(err , resultData){
				if(err == null && resultData.result.nModified == 1){
					res.status(200).json({"Server": "Password have been changed." , "returned: " : resultData});
				}
				else{
					res.status(400).json({"Server": "User don't exist!"});
				}
				db.close();
			});
		});
	}
	else{
		res.status(400).json({"Server": "Bad input!"});
	}
});

//
//	reset password for application
//
app.get('/resetpassword/:code', function(req,res,next){
	let codeData = {};
	
	if((/^\w{30,40}$/).test(req.params.code)){
		let Code = req.params.code;
		codeData['validCode'] = Code.substr(0, 5) + Code.substr(-5);
		codeData['_id'] = new ObjectID( Code.substr(5 , Code.length - 10 ) );
		if(!_idRegex.test(codeData._id)){
			codeData['_id'] = "";
		}
		
		dbQuery(function(db){
			db.collection('requestForPasswordChange').findOneAndDelete(codeData, function(error_remove, userData) {
				if(error_remove == null && userData.value != null){
					let newPass = Math.random().toString(25).substr(5, 10);
					db.collection('users').findOneAndUpdate({'_id': userData.value.user_id},{$set:{'password': newPass}}, {projection : {"email": 1 , "_id": 0}}, function(err , resultData){
						if(err == null && resultData.value != null){
							sendEmail(resultData.value.email,'VMEV - Request for password change',"<h1>VMEV application</h1> <h2>Please change password at first login</h2> <p>New password: <span>"+newPass+"</span></p>");
							res.status(200).json({"Server": "We have send you email with new password."});
						}
						else{
							res.status(400).json({"Server": "User don't exist!"});
						}
						db.close();
					});
				}
				else{
					res.status(400).json({"Server": "You didn't request to reset password."});
					db.close();
				}
			});
        });
	}
	else{
		res.status(400).json({"error": "Bad input!"});
	}
});

//
//	abort password resetting for email
//
app.get('/abortresetpassword/:code', function(req,res,next){
	let codeData = {};
	
	if((/^\w{30,40}$/).test(req.params.code)){
		let Code = req.params.code;
		codeData['validCode'] = Code.substr(0, 5) + Code.substr(-5);
		codeData['_id'] = new ObjectID( Code.substr(5 , Code.length - 10 ) );
		if(!_idRegex.test(codeData._id)){
			codeData['_id'] = "";
		}
		
		dbQuery(function(db){
			db.collection('requestForPasswordChange').deleteOne(codeData , function(err, data) {
				if(err == null && data.deletedCount){
					res.status(200).json({"Server": "Your password is same."});
				}
				else{
					res.status(400).json({"Server": "There is no one request for this email."});
				}
				db.close();
			});
        });
	}
	else{
		res.status(400).json({"error": "Bad input!"});
	}
});

//
//	This is just to request reset 
//
app.post('/requesttoResetPassword', function(req,res,next){
	let userdata =  {};
	//let appUrl = "http://localhost:443/";
	let appUrl = "https://vmev.herokuapp.com/";
	
	if((/^\S+\@\S+\.\S{2,4}$/).test(req.body.email)){
		userdata['email'] = req.body.email;
	}
	
	if(Object.keys(userdata).length != 1){
		res.status(400).json({"error": "We don't have enough data."});
	}
	else{
		dbQuery(function(db){
			db.collection('users').findOne(userdata ,{"_id":1}, function(err , user){
				if(err == null && user != null){
					let rpData = {
						"user_id": user._id,
						"validCode": Math.random().toString(25).substr(5, 10)
					};
					db.collection('requestForPasswordChange').insertOne(rpData, function(error_insert , resData){
						if(error_insert == null){
							let emailTailCode = rpData.validCode.substr(0,5) +resData.insertedId.toString() + rpData.validCode.substr(5);
							sendEmail(userdata.email,'VMEV - Request for password change',"<h1>VMEV application</h1> <p>Did you send a request to change the password?</p> <p><a href='"+appUrl+"resetpassword/"+emailTailCode+"'>YES</a>&emsp; - &emsp;<a href='"+appUrl+"abortresetpassword/"+emailTailCode+"'>NO</a></p>");
							
							res.status(200).json({"Server":"We have sent you an email."});
						}
						else{
							res.status(400).json({"Server": "Request exist!"});
						}
					});
				}
				else{
					res.status(400).json({"error": "No one with '"+userdata.email+"' email."});
				}
				db.close();
			});
		});
	}
});
//
//	email verification for application
//
app.get('/verifiyemail/:email/:verificationCode', function(req,res,next){
	let userdata =  {};
	
	if((/^\S+@\S+\.\S{2,4}$/).test(req.params.email)){
		userdata['email'] = req.params.email;	
	}
	if((/^\w{22}$/).test(req.params.verificationCode)){
        userdata['verCode'] = req.params.verificationCode;
    }

	if(Object.keys(userdata).length != 2){
		res.status(400).json({"error": "We don't have enough data."});
	}
	else{
		dbQuery(function(db){
			db.collection('users').update({'email': userdata.email, 'verificationCode': userdata.verCode, 'status': 'Waiting'},{$set:{'status': 'Verified'}},{multi: false}, function(err , data){
				if(err == null){
					if(data.result.nModified){
						res.status(200).json({"server": "Email is verified now."});
					}
					else{
						res.status(400).json({"error": "Bad email or verification code."});
					}
				}
				else{
					res.status(400).json({"error": "Bad input."});
				}
				db.close();
			});
		});
	}	
});

// Ima nesto da se doradi
app.post('/getfriendspeer', function(req,res,next){
	if(_idRegex.test(req.body._id)){
		let userID = new ObjectID(req.body._id);
		dbQuery(function(db){
			db.collection('users').findOne({"_id": userID}, {"friends": 1, "_id": 0}, function(err , data){
				if(err == null && data != null){
					let resultData = [];
					if(data.friends.length > 0){
						// ovde ovako , dodaj da se vraca jos i link slike sa servera
						let result = db.collection('users').find({'_id': {$in: data.friends}}, {"_id": 1, "firstName": 1, "lastName": 1, "email": 1, "peerID": 1});
						result.forEach(function(row, err){
							if(!err){
								resultData.push(row);
							}
						},function(){
							db.close();
							if(resultData.length){
								res.status(200).json({"server": resultData});		
							}
							else{
								res.status(400).json({"error": "Bad input."});
							}
						});
					}
					else{
						res.status(400).json({"error": "Bad input."});
						db.close();
					}
				}
				else{
					res.status(400).json({"error": "Bad input."});
					db.close();
				}
			});
		});
	}
	else{
		res.status(400).json({"error": "Bad input."});
	}
});

//
//	search friend with %email%
//
app.post('/searchfriend', function(req,res,next){
	if((/[\s\S]{2,254}/).test(req.body.search)){
		dbQuery(function(db){
			let resultData = [];
			let result = db.collection('users').find({'email':{$regex : req.body.search, $options : 'i'}, "status": "Verified"}, {"_id": 1, "firstName": 1, "lastName": 1, "email": 1, "peerID": 1}).limit(10);
			result.forEach(function(row, err){
				if(err){
					console.log('error : '+err);
				}
				else{
					resultData.push(row);
				}
			},function(){
				db.close();
				if(resultData.length){
					res.status(200).json({"server": resultData});		
				}
				else{
					res.status(400).json({"error": "Bad input."});
				}
			});
		});
	}
	else{
		res.status(400).json({"error": "Bad input."});
	}
});


app.post('/addfriend', function(req,res,next){
	let friendReq = {};
	if(_idRegex.test(req.body.requestFrom)){
		friendReq['requestFrom'] = new ObjectID(req.body.requestFrom);
	}
	if(_idRegex.test(req.body.requestTo)){
		friendReq['requestTo'] = new ObjectID(req.body.requestTo);
	}
	if(_idRegex.test(req.body._id)){
		friendReq['_id'] = new ObjectID(req.body._id);
	}
	
	if(Object.keys(friendReq).length != 3){
		res.status(400).json({"error": "Bad input."});
	}
	else{
		dbQuery(function(db){
			db.collection('friendRequest').findOneAndDelete(friendReq, function(err , data){
				if(err == null && data.value != null){
					db.collection('users').updateOne({"_id": friendReq.requestTo},{$addToSet:{"friends" : friendReq.requestFrom} }, function(err , data){
						if(err == null){
							db.collection('users').updateOne({"_id": friendReq.requestFrom},{$addToSet:{"friends" : friendReq.requestTo} }, function(err , data){
								if(err == null){
									res.status(200).json({"Server": "Friend accepted."});
								}
								else{
									res.status(400).json({"error": "Something wrong secund layer."});
								}
								db.close();
							});
						}
						else{
							res.status(400).json({"error": "Bad input."});
							db.close();
						}
					});
				}
				else{
					res.status(400).json({"error": "Bad input."});
					db.close();
				}
			});
		});
	}
});

app.post('/removefriend', function(req,res,next){
	let pullData = {};
	
	if(_idRegex.test(req.body.friendID)){
		pullData['friendID'] = new ObjectID(req.body.friendID);
	}
	if(_idRegex.test(req.body._id)){
		pullData['_id'] = new ObjectID(req.body._id);
	}
	
	if(Object.keys(pullData).length != 2){
		res.status(400).json({"error": "Bad input."});
	}
	else {
		dbQuery(function(db){
			db.collection('users').updateOne({"_id": pullData._id},{$pull:{"friends" : pullData.friendID} }, function(err , data){
				if(err == null){
					db.collection('users').updateOne({"_id": pullData.friendID},{$pull:{"friends" : pullData._id} }, function(err , data){
						if(err == null){
							res.status(200).json({"Server": "Friend removed."});
						}
						else{
							res.status(400).json({"error": "Something wrong secund layer."});
						}
						db.close();
					});
				}
				else{
					res.status(400).json({"error": "Bad input."});
					db.close();
				}		
			});
		});
	}
});

app.post('/sendfriendrequest', function(req,res,next){
	//
	// na klijentu probaj da posaljes zahtev za taj peerID da bi ga notifikovalo ako je ulogovan,
	// a ako nije onda ce dobiti notifikaciju kada se uloguje
	//
	//	zapamti na klijentu da mu je poslat zahtev kako bi mogao da ga obrise ...
	//
	
	//
	// dont give _id to request sender only to reciver -> he can add like this if he know _id ..
	// he should only know peerID to contact you
	//
	let insertData = {};
	if(req.body.requestFrom != req.body.requestTo){
		if(_idRegex.test(req.body.requestFrom)){
			insertData['requestFrom'] = new ObjectID(req.body.requestFrom);
		}
		if(_idRegex.test(req.body.requestTo)){
			insertData['requestTo'] = new ObjectID(req.body.requestTo);
		}
	}
	if(Object.keys(insertData).length != 2){
		res.status(400).json({"error": "Bad input."});
	}
	else{
		dbQuery(function(db){
			db.collection('users').findOne({"_id": insertData.requestTo , "friends": {$nin: [insertData.requestFrom]}}, {"_id": 0, "peerID": 1},  function(e , result){
				if(e == null && result != null){
					db.collection('friendRequest').insertOne(insertData, function(err , data){
						if(err == null){
							res.status(200).json({"Server": "Request sent.", "returnData" : {"requestTo": insertData.requestTo,"peerID": result.peerID}}); //, "request_id": data.insertedId.toString()
						}
						else{
							res.status(400).json({"error": "Bad input."});
						}
						db.close();
					});
				}
				else{
					res.status(400).json({"error": "Bad input."});
					db.close();
				}
			});
		});
	}
});


app.post('/dropfriendrequest', function(req,res,next){
	let removeRequest = {};
	if(_idRegex.test(req.body.requestFrom)){
		removeRequest['requestFrom'] = new ObjectID(req.body.requestFrom);
	}
	if(_idRegex.test(req.body._id)){
		removeRequest['_id'] = new ObjectID(req.body._id);
	}
	
	if(Object.keys(removeRequest).length != 2){
		res.status(400).json({"error": "Bad input."});
	}
	else{
		dbQuery(function(db){
			db.collection('friendRequest').deleteOne(removeRequest, function(err , data){
				if(err == null && data.deletedCount){
					res.status(200).json({"Server": "Request removed."});
				}
				else{
					res.status(400).json({"error": "Bad input."});
				}
				db.close();
			});	
		});
	}
});


app.post('/setMyPeer', function(req,res,next){
	let peerData = {};
	
	if((/^[\w\d]+$/).test(req.body.peerID)){
		peerData['peerID'] = req.body.peerID;
	}
	if(_idRegex.test(req.body._id)){
		peerData['_id'] = new ObjectID(req.body._id);
	}
	
	if(Object.keys(peerData).length != 2){
		res.status(400).json({"error": "Bad input."});
	}
	else {
		dbQuery(function(db){
			db.collection('users').updateOne({"_id": peerData._id},{$set:{"peerID" : peerData.peerID} }, function(err , data){
				if(err == null){
					res.status(200).json({"Server": "Friend removed."});
				}
				else{
					res.status(400).json({"error": "Something wrong secund layer."});
				}
				db.close();
			});
		});
	}
});

//
//	samo tokom testiranja
//
/*
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
*/