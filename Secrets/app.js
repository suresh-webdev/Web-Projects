//jshint esversion:6
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
// const bcrypt = require("bcrypt");
// const saltRounds = 10;
// const encrypt = require("mongoose-encryption");
// const md5 = require("md5")

const app = express();



app.use(express.static("public"));
app.set("view engine", 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({                     //setup-sessions
  secret:"Our little secret.",
  resave:false,
  saveUninitialized:false
}));

app.use(passport.initialize());       //initialize passport and sessions
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {
  useNewUrlParser: true
});

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId:String,
  secret:String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// userSchema.plugin(encrypt,{secret:process.env.SECRET,encryptedFields:['password']});

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());    //to create local login Strategy

// passport.serializeUser(User.serializeUser());       //To serialise
// passport.deserializeUser(User.deserializeUser());    // To Deserialise

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/oauth2/redirect/google",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/", function(req, res) {
  res.render("home");
})


app.get("/auth/google",
  passport.authenticate('google', { scope:
      [ 'email', 'profile' ] }
));

app.get('/oauth2/redirect/google', passport.authenticate('google', {
  successRedirect: '/secrets',
  failureRedirect: '/login'
}));

app.get("/login", function(req, res) {
  res.render("login");
})

app.get("/register", function(req, res) {
  res.render("register");
})

app.get("/secrets",function(req,res){
  User.find({"secret":{$ne:null}}, function(err,foundUser){     //pick the secrets which are not null
    if(err){
      console.log(err);
    }else{
      if(foundUser){
        res.render("secrets",{usersWithSecrets:foundUser});
      }
    }
  })
})

app.get("/logout",function(req,res){
  req.logout(function(err){
    if(err){
      console.log(err);
    }else{
      res.redirect("/");
    }
  });

});

app.get("/submit",function(req,res){
  if(req.isAuthenticated()){
    res.render("submit");
  }else{
    res.redirect("/login");
  }
})

app.post("/submit",function(req,res){
  const submittedSecret = req.body.secret;
  console.log(req.user._id);
  User.findById(req.user._id,function(err,foundUser){
    if(err){
      console.log(err);
    }else{
      if(foundUser){
        foundUser.secret = submittedSecret;
        foundUser.save(function(){
            res.redirect("/secrets");
        })
      }
    }

  })
})

app.post("/register", function(req, res) {

   User.register({username:req.body.username},req.body.password, function(err,user){          //using passport.js
     if(err){
       console.log(err);
       res.redirect("/register");
     }else{
       passport.authenticate("local")(req,res,function(){
         res.redirect("/secrets");
       })
     }
   })





  // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
  //   // Store hash in your password DB.
  //   const newUser = new User({
  //     email: req.body.username,
  //     password: hash //md5(req.body.password)
  //   })
  //
  //   newUser.save(function(err) {
  //     if (err) {
  //       console.log(err);
  //     } else {
  //       res.render("secrets");
  //     }
  //   })
  // });

})

app.post("/login", function(req, res) {


const user = new User({
  username:req.body.username,
  password:req.body.password
})

req.login(user,function(err){
  if(err){
    console.log(err);
  }else{
    passport.authenticate("local")(req,res,function(){
      res.redirect("/secrets");
    })
  }
})




  // const username = req.body.username;
  // const password = req.body.password;
  //
  // User.findOne({email: username}, function(err, foundUser) {
  //     if (err)
  //      {
  //       console.log(err);
  //     }
  //     else
  //     {
  //       if (foundUser)
  //       {
  //         // if(foundUser.password === md5(password)){
  //         bcrypt.compare(password, foundUser.password, function(err, result)
  //         {
  //           if (result === true)
  //           {
  //             res.render("secrets");
  //           }else{
  //             console.log("Incorrect password");
  //           }
  //
  //         });
  //       }
  //     }
  //   })
  });


app.listen(3000, function() {
  console.log("Server started on port 3000");
});
