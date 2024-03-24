# Overture

How to install and run:

- DDL
```sql
CREATE TABLE `users` (
    `uId` int(11) NOT NULL AUTO_INCREMENT,
    `uName` text DEFAULT NULL,
    `uToken` text NOT NULL,
    `uPassword` text DEFAULT NULL,
    `uVerified` tinyint(1) DEFAULT 0,
    `uEmail` text DEFAULT NULL,
    PRIMARY KEY (`uId`)
);
```

```sql
CREATE TABLE `messageBank` (
    `mId` varchar(128) NOT NULL, -- messageID
    `uId` int(11) NOT NULL, -- userID
    `player` boolean NOT NULL, -- player condition
    `aId` text DEFAULT NULL, -- AI ID
    `pId` text DEFAULT NULL, -- prompt ID
    `chatId` text NOT NULL, -- Chat ID
    `message` text NOT NULL, -- actual messages
    PRIMARY KEY (`mID`),
    FOREIGN KEY (`uId`) REFERENCES users(`uId`)
);
```
<!----->
- install packages
  ```npm install express bcrypt cookie-parser email-validator express sync-mysql ollama uuid```

- install [ollama](https://ollama.com/download)

- install prototype model
```ollama pull dolphin-mistral```

- start ollama
```ollama serve```

- run
```node server.js```

## TODO
- add client map
- implement matchmaking
- create landing page
- improve main UI
- chat retrieval
- error handling
- move main UI to next.js
- tune a model to provide concise and human like responses.
