// Require all the packages
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
//const encrypt = require("mongoose-encryption");
const md5 = require("md5");

// Create Express app
const app = express();

// Make the app use some of the packages
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

// Connect to MongoDB database
mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true});

// Schema for an Uer
const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

// Encrypt the db
//userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ['password'] });

// User model
const User = mongoose.model("List", userSchema);

// Render the pages
app.get("/", function (req, res) {
    res.render("home");
});

app.get("/login", function (req, res) {
    res.render("login");
});

app.get("/register", function (req, res) {
    res.render("register");
});

app.post("/register", function (req, res) {
    const user = new User({
        email: req.body.username,
        password: req.body.password
    });

    user.save(function(err) {
        if (!err) {
            console.log("User saved successfully");
            res.render("secrets");
        } else {
            console.log(err);
        }
    });
});

app.post("/login", function (req, res) {
    const username = req.body.username;
    const password = req.body.password;

    User.findOne({email: username}, function (err, foundUser) {
        if (!err) {
            if (foundUser) {
                if (foundUser.password === password) {
                    res.render("secrets");
                }
            }
        } else {
            console.log(err);
        }
    });
});

// Listen on port 3000
app.listen(3000, function() {
    console.log("Server started successfully");
});
