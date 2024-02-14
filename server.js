const express = require('express')
const app = express()
const active_dir = __dirname


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
//app.use(cookieParser());
app.listen(3000);

app.get('/', (req, res) => {
    res.sendFile(active_dir+"/prototype.html");
  })