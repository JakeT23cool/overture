const express = require('express');
const mysql = require('sync-mysql');
const crypto = require("crypto");
const cookieParser = require("cookie-parser");
const emailValidator = require('email-validator');
const bcrypt = require("bcrypt");
const app = express();
const active_dir = __dirname;

const logging = require('./src/logging');

const config = require('./config');

const sqlConnection = new mysql({host: config.host, user: config.user, password: config.password, database: config.database});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(logging.log);

app.listen(3000);

app.get('/', (req, res) => {
	res.status(200);
	if(!req.cookies.token){
		res.sendFile(active_dir+"/html/login.html");
		return 0;
	}
	let tokenResult = sqlConnection.query("SELECT * FROM `users` WHERE `uToken`=?;",[req.cookies.token]);
	if(tokenResult.length === 0){
		res.sendFile(active_dir+"/html/login.html");
		return 0;
	}
	res.sendFile(active_dir+"/html/prototype.html");
});

app.post('/bk/login', async (req, res) => {
	res.status(200);
	if(!req.body || !req.body.uPassword || !req.body.uEmail){
		let response = {'status':'failed','info':'Missing Field(s)','token':null};
		res.send(response);
		return 0;
	}
	var user = sqlConnection.query("SELECT * FROM `users` WHERE `uEmail`=?;",[req.body.uEmail]);
	if(user.length === 0){
		let response = {'status':'failed','info':'Incorrect Username Or Password','token':null};
		res.send(response);
		return 0;
	}
	var validPassword = await bcrypt.compare(req.body.uPassword, user[0].uPassword);
	if(!validPassword){
		let response = {'status':'failed','info':'Incorrect Username Or Password','token':null};
		res.send(response);
		return 0;
	}
	let response = {'status':'succeeded','info':'Logged In','token':user[0].uToken};
	res.send(response);
});

app.post('/bk/register', async (req, res) => {
	res.status(200);
	if(!req.body || !req.body.uName || !req.body.uPassword || !req.body.uEmail){
		let response = {'status':'failed','info':'Missing Field(s)','token':null};
		res.send(response);
		return 0;
	}
	if(req.body.uPassword.length < 8){
		let response = {'status':'failed','info':'Password Too Short','token':null};
		res.send(response);
		return 0;
	}
	if(!emailValidator.validate(req.body.uEmail)){
		let response = {'status':'failed','info':'Invalid Email Detected','token':null};
		res.send(response);
		return 0;
	}
	if(sqlConnection.query("SELECT * FROM `users` WHERE `uName`=?;",[req.body.uName]).length > 0){
		let response = {'status':'failed','info':'Username Already Taken','token':null};
		res.send(response);
		return 0;
	}
	if(sqlConnection.query("SELECT * FROM `users` WHERE `uEmail`=?;",[req.body.uEmail]).length > 0){
		let response = {'status':'failed','info':'Email In Use','token':null};
		res.send(response);
		return 0;
	}
	let newToken = crypto.randomBytes(32).toString('hex');
	let hashPassword = await bcrypt.hash(req.body.uPassword,10);
	var result = sqlConnection.query("INSERT INTO `users`(`uName`,`uPassword`,`uToken`,`uEmail`) VALUES (?,?,?,?);",[req.body.uName, hashPassword, newToken, req.body.uEmail]);
	res.send({'status':'succeeded','info':'Created Account','token':newToken});
});

app.all('*', (req, res) => {
	res.status(404);
	res.send('<h1>404</h1>');
});
