const express = require('express');
const database = require('./database');
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


app.get('/login', function(req,res,next){

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

    res.send('good');
});

app.get('/register', function(req,res,next){

});

app.get('/addfriend', function(req,res,next){

});

app.get('/removefriend', function(req,res,next){

});