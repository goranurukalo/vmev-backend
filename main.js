const express = require('express');
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

    var query = function(fn) {
        mongo.connect(dbS.host + dbS.database + dbS.tail, function(error, db) {
            if(error){
                console.log('Bad connecting with database:'+error);
            }
            else{
                console.log('We have connect with database');
                var data = [];
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
                        return fn("error: no one with this email and password.", null);
                    }
                });
            }
        });
    };
    query(function (err, result) {
        if(err == null){
            //do something
            res.send(JSON.stringify(result));
            //console.log(result);
            //res.send('ovde smo');
        }
        else{
            res.send(err);
        }
    });
});

app.get('/register', function(req,res,next){

});

app.get('/addfriend', function(req,res,next){

});

app.get('/removefriend', function(req,res,next){

});