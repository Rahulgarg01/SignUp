require('dotenv').config();
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const bodyParser =require('body-parser');
const ejs = require('ejs');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const findOrCreate = require("mongoose-findorcreate");
var GoogleStrategy = require('passport-google-oauth20').Strategy;
app.use(express.static("public"));
app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended:true}));
app.use(session({
    secret:"My Secret Line",
    resave:false,
    saveUninitialized:false
}))
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB");
const userSchema =new mongoose.Schema({
    Email:String,
    Password:String,
    googleId:String
})
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User = mongoose.model("User",userSchema);
passport.use(User.createStrategy());
passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
  });
  
    passport.deserializeUser(function(user, cb) {
        process.nextTick(function() {
        return cb(null, user);
        });
    });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/",function (req,res) {
    res.render("home.ejs");
})
app.get("/auth/google",passport.authenticate("google",{scope:['profile']}));
app.get("/login",function (req,res) {
    res.render("login.ejs");
})
app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect('/secrets');
  });
app.get("/register",function (req,res){
    res.render("register");
})
app.get("/secrets",function(req,res){
    if(req.isAuthenticated()){
        res.render("secrets");
    }else{
        res.redirect("/login");
    }
})
app.post('/register',function (req,res) {
    User.register({username:req.body.username},req.body.password,function(err,user){
        if(err){
            console.log(err);
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            })
        }
    })
})

//     res.render("secrets.ejs");


app.post('/login',function (req,res) {
    const user = new User({
        username:req.body.username,
        password:req.body.password
    });
    req.login(user,function(err){
        if(err){
            console.log(err);
        }
        else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            })
        }
    })
})

app.get("/logout",function (req,res) {
    req.logout(function (err) {
        res.redirect("/");      
    });
})
app.get("/submit",function (req,res) {
    res.render("submit.ejs");
})

app.listen(3000,function (req,res) {
    console.log("Server is perfectly running ");
})