//jshint esversion:6

// Require all usual packages
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");

// Create app
const app = express();

// Make the app use some of the packages
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));


// Connect to local mongodb db
mongoose.connect("mongodb://localhost:27017/userDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Schema for an User
const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

// User model
const User = new mongoose.model("User", userSchema);

// Render the pages that don't need authentication
app.get("/", function (req, res) {
    res.render("home");
});

app.get("/login", function (req, res) {
    res.render("login");
});

app.get("/register", function (req, res) {
    res.render("register");
});

// Register users 
app.post("/register", function (req, res) {

    // Create new user
    const user = new User({
        email: req.body.username,
        password: req.body.password
    });

    // Save the user to db
    user.save(function (err) {
        if (err) {
            console.log(err);
        } else {
            res.render("secrets");
        }
    });
});

// Login users
app.post("/login", function (req, res) {

    // Get the username and the password they entered
    const username = req.body.username;
    const password = req.body.password;

    // Find a user with that username
    User.findOne({ email: username }, 
        function (err, foundUser) {
            if (err) {
                console.log(err);
            } else {
                if (foundUser) {
                    // If user was found check if password was correct
                    if (foundUser.password === password) {
                        res.render("secrets");
                    }
                }
            }
        }
    );
});

// Listen on local port 3000
app.listen(3000, function () {
    console.log("Server started on port 3000.");
});