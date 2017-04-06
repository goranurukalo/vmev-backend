const mongo = require('mongodb').MongoClient;
const dbS = require('./databaseSecret');

exports.Login = function(email , password){
    mongo.connect(dbS.host + dbS.database + dbS.tail, function(error, db) {
        if(error){
            console.log('Bad connecting with database:'+error);
        }
        else{
            console.log('We have connect with database');
            var users = db.collection('users').find();
            users.forEach(function(row, err){
                if(err){console.log('error : '+err);}
                console.log('One user : '+ row.firstName);
            });
            db.close();
        }
    });
};