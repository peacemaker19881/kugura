const express = require('express');
const mysql = require('mysql');
const path = require('path')
const dotenv = require('dotenv');
const port = 5000;
const app = express();

dotenv.config({ path: '/.env'});

const db =mysql.createConnection({
    host:'localhost',
    user: 'root',
    password:'',
    database:'sellsdb'
});

app.set('view engine', 'hbs');

db.connect( (error) =>{
    if(error) {
        console.log(error)
    } else {
        console.log("Database connected ")
    }
});

app.get('/',(req, res) => {
    res.send("<h1>Home page</h1>")
});

app.listen(port, () =>{
    console.log(`Server is running on port 5000`);
});