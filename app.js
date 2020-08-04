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

// Require strategies for login with Google and Facebook
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;

// Require module to make the findOrCreate function work
const findOrCreate = require("mongoose-findorcreate");

// Create app
const app = express();

// Make the app use ejs, bodyParser and express static
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

// Initialize passport and use it to set up session
app.use(passport.initialize());
app.use(passport.session());

// Connect to local mongodb db
mongoose.connect("mongodb://localhost:27017/userDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
mongoose.set("useCreateIndex", true); // deprecation warning thing

// Schema for an User
const userSchema = new mongoose.Schema({
    username: { // values: email address, googleId, facebookId
        type: String,
        unique: true
    },
    password: String,
    provider: String, // values: 'local', 'google', 'facebook'
    email: String
});


// Set up plug ins
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
userSchema.plugin(passportLocalMongoose, {
    usernameField: "username" // substitute the username field for the default "username"
});

// User model
const User = new mongoose.model("User", userSchema);

// Create local passport strategy
passport.use(User.createStrategy());


// Serialize user (make cookie and put message inside)
passport.serializeUser(function (user, done) {
    done(null, user.id);
});

// Deserialize user (open cookie and read message)
passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});

// Configure the Google and Facebook strategies
passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/secrets",
        userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo" // for Google+ deprecation
    },
    function (accessToken, refreshToken, profile, cb) {
        User.findOrCreate(
            { username: profile.id },
            {
                provider: "google",
                email: profile._json.email
            },
            function (err, user) {
                return cb(err, user);
            }
        );
    }
));

passport.use(new FacebookStrategy({
        clientID: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/facebook/secrets",
        profileFields: ["id", "email"] //to bring in the email
    },
    function (accessToken, refreshToken, profile, cb) {
        console.log(profile);
        User.findOrCreate(
            { username: profile.id }, 
            {
                provider: "facebook",
                email: profile._json.email
            },
            function (err, user) {
                return cb(err, user);
            }
        );
    }
));

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


// Redirect user to log in with Google
app.get("/auth/google",
    passport.authenticate("google", {
        scope: ["profile", "email"]
    })
);

// Redirect user to log in with Facebook
app.get("/auth/facebook",
    passport.authenticate("facebook" , {
        scope: ["email"]
    })
);

// Route the user is directed to after Google login
app.get("/auth/google/secrets",
    passport.authenticate("google", {
        failureRedirect: "/login"
    }),
    function (req, res) {
        // Successful authentication, redirect to secrets.
        res.redirect("/secrets");
    }
);

// Route the user is directed to after Facebook login
app.get("/auth/facebook/secrets",
    passport.authenticate("facebook", {
        failureRedirect: "/login"
    }),
    function (req, res) {
        // Successful authentication, redirect to secrets.
        res.redirect("/secrets");
    }
);

// Check if user is authenticated before rendering secrets page
app.get("/secrets", function(req, res) {
    if (req.isAuthenticated()) {
        res.render("secrets");
    } else {
        res.redirect("/register");
    }
});

// Logout and redirect home
app.get("/logout", function (req, res) {
    req.logout();
    res.redirect("/");
});

// Register users 
app.post("/register", function (req, res) {

    // Get username and password they typed in
    const username = req.body.username;
    const password = req.body.password;

    // Register (add them to db)
    User.register(
        {username: username}, 
        password, 
        function(err, user) {
            if (err) {
                console.log(err);
                res.redirect("/register");
            } else {
                // Authenticate them with local strategy
                passport.authenticate("local")(req, res, function() {
                    
                    // Update db to keep it consistent
                    User.updateOne(
                        { _id: user._id },
                        { $set: { provider: "local", email: username } },
                        function (err, writeOpResult) {
                            res.redirect("/secrets");
                        }
                    );
                });
            }
        }
    );
});

// Login users
app.post("/login", function (req, res) {
    
    // Create new User JS Object
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    // Try to authenticate user
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