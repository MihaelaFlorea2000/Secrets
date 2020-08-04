//jshint esversion:6

// Set up the .env file
require('dotenv').config();

// Require all usual packages
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");

// Require modules for passport
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

// Create app
const app = express();

// Make the app use some of the packages
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));

// Initialize session
app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
}));

// Initialize passport
app.use(passport.initialize());

// Use passport to set up session
app.use(passport.session());


// Connect to local mongodb db
mongoose.connect("mongodb://localhost:27017/userDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
mongoose.set("useCreateIndex", true);

// Schema for an User
const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

// Set up passport-local-mongoose
userSchema.plugin(passportLocalMongoose);

// User model
const User = new mongoose.model("User", userSchema);

// Set up passport-local
passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

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

app.get("/secrets", function(req, res) {
    if (req.isAuthenticated()) {
        res.render("secrets");
    } else {
        res.redirect("/register");
    }
});

app.get("/logout", function (req, res) {
    req.logout();
    res.redirect("/");
});

// Register users 
app.post("/register", function (req, res) {
    User.register(
        {username: req.body.username}, 
        req.body.password, 
        function(err, user) {
            if (err) {
                console.log(err);
                res.redirect("/register");
            } else {
                passport.authenticate("local")(req, res, function() {
                    res.redirect("/secrets");
                });
            }
        }
    );
});

// Login users
app.post("/login", function (req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err){
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets");
            });
        }
    });
});

// Listen on local port 3000
app.listen(3000, function () {
    console.log("Server started on port 3000.");
});