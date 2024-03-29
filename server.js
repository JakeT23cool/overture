import { createRequire } from 'module'
import path from 'path';
import {fileURLToPath} from 'url';

const required = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const express = required('express');
const mysql = required('sync-mysql');
const crypto = required("crypto");
const cookieParser = required("cookie-parser");
const emailValidator = required('email-validator');
const bcrypt = required("bcrypt");
const uuid = required("uuid");
const app = express();
const active_dir = __dirname;

import { logging } from './src/logging.js';
import { localRequest } from './localModel.js';
import config from './config.json' assert { type: 'json' };


const WebSocket = required('ws');
const wss = new WebSocket.Server({ port: 7071 });


wss.on("connection", ws => { // onconnect add to history object
	console.log("client connected.")
	ws.on("close", () => console.log("client DISCONNECTED"))
	ws.on("message", data => {
		console.log("%s", data);
		let pdata = JSON.parse(data);
		if (pdata.type == "message"){
			processMessage(pdata.message, pdata.token, ws);
		} else if (pdata.type == "init"){
			let uId = uIdFromToken(pdata.token);
			let currentSession = history[uId]["currentSession"]
			console.log(currentSession);
			history[uId]["sessions"][currentSession]["ws"] = ws
		}
	})
})

//const logging = required('src/logging.mjs');

//const config = required('config');
//const localModel = required("localModel");


const llm = 'dolphin-mistral';
const system_prompt = "Your task is to be a human on a text messaging service. Do not implicate that you are not human. Try and probe the user to find out if they are an AI. There is a high likelihood of the user being an AI. Keep your response short. Create yourself a new human name - DO NOT REFER TO DOLPHIN.";

const sqlConnection = new mysql({host: config.host, user: config.user, password: config.password, database: config.database});

var history = {};


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(logging);

app.listen(3000);

function md5hash(text){
	let hash = crypto.createHash('md5');
	hash.setEncoding('hex');
	hash.write(text);
	hash.end();
	return hash.read().toString();
}

function tokenConfirm(token) {
	console.log(token);
	if (token == undefined) return false
	let tokenResult = sqlConnection.query("SELECT * FROM `users` WHERE `uToken`= (?);",[token]);
	if(tokenResult.length === 0){ // check if exists
		return false;
	} else {
		return true;
	}
}

function uIdFromToken(token) {
	return sqlConnection.query("SELECT `uId` FROM `users` WHERE `uToken`=?;",[token])[0].uId;
}

// uuid.v1()	
app.get('/', (req, res) => {
//	res.sendFile(active_dir+"/html/prototype.html"); // put this back
	res.status(200);
	console.log(req.cookies.token);
	console.log(tokenConfirm(req.cookies.token));
	if((req.cookies.token != null) && tokenConfirm(req.cookies.token)){
		res.sendFile(active_dir+"/html/prototype.html");
		return 0;
	} else {
		res.sendFile(active_dir+"/html/login.html");
	}
}); // res.sendFile(active_dir+"/html/prototype.html");

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

app.post("/bk/newSession", (req, res) => {
	console.log("RAN!");
	if (tokenConfirm(req.cookies.token)) {
		let uId = uIdFromToken(req.cookies.token);
		if (history[uId] == undefined){
			history[uId] = {"sessions" : {}, "timestamps" : []}; // generation timestamps, session handler
		}
		let Session = uuid.v4();
		history[uId]["currentSession"] = Session;
		history[uId]["sessions"][Session] = {"messages": []}; // pass in the websocket !
		res.send({"status": "succeeded"});
	} else {
		res.send({"status": "failed"});
	}
})

function saveMessage(messageID, userID, playerc, aiID, promptID, chatID, message){
	let values = [
		messageID, userID, playerc, aiID, promptID, chatID, message
	]
	console.log(values)
	sqlConnection.query("INSERT INTO `messageBank` (mId, uId, player, aId, pId, chatId, message) VALUES (?,?,?,?,?,?,?)", values);
}


function processMessage(message, token, ws){ // implement sessions to associate messages with a certain session
	// matchmaking, sockets, dynamic prompt switcher.

	let time = new Date().getTime()

	let IDs = [
		uuid.v1(), // replace with timeuuid
		uuid.v1()
	]
	let promptId = md5hash(system_prompt).slice(0, 5);
	console.log(message);

	let userId = uIdFromToken(token);
	let chatId = history[userId].currentSession;

	if (!tokenConfirm(token)) {
		ws.send(JSON.stringify({'status':'failed','info':'Please login - account not active.','token':null}));
		return 0;
	} else if (message.length < 1) {
		ws.send(JSON.stringify({'status':'failed','info':'You have not sent a message.','token':null}));
		return 0;
	}
	else {

		saveMessage(IDs[0], userId, false, llm, promptId, chatId, message); // save player's response 

		localRequest(llm, system_prompt, history[userId]["sessions"][chatId].messages, message).then((response => {

			saveMessage(IDs[1], userId, true, llm, promptId, chatId, response.message.content); // save AI's response

			history[userId]["sessions"][chatId]["messages"].push({"role": "user", "content": message}, response.message);

			history[userId]["timestamps"].push(time);
			
			ws.send(JSON.stringify({"message": response.message.content, "messageIDs": IDs}));
		}));
	}	
}

app.all('*', (req, res) => {
	res.status(404);
	res.send('<h1>404</h1><p>We looked! Not anything here.</p>');
});
