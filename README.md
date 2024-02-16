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
- install packages
  ```npm install express bcrypt cookie-parser email-validator express sync-mysql```

- install [ollama](https://ollama.com/download)

- install prototype model
```ollama pull dolphin-mistral```

- start ollama
```ollama serve```

- run
```sudo node server.js```
