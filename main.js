const express = require('express');
const database = require('./database');

const app = express();

app.set('port', 3000);
app.get('/',function(req, res, next){
    res.send('express works');
});
app.listen(app.get('port') , function(){
    console.log('Server started ...');
});


app.get('/login', function(req,res,next){
    database.Login('goran', true);
    res.send('good');
});
