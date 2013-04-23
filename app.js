/*
 * FireEngine - Javascript Activity Engine 
 * 
 * @license Simplified BSD
 * Copyright (c) 2013, Patrick Barnes
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * 
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *    
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
/**
 * Main node application file;
 * 
 * - Loads the system configuration, environment, and designs
 * - Connects to the couchdb backend
 * - Starts listening for HTTP connections
 * - On connection
 *   - Routes to the appropriate handler (as per API)
 *   - Processes the request and responds to the caller
 */

//-----------------------------------------------------------------------------
//Modules needed by the application
var fs = require("fs");
var http = require("http");
var url = require("url");
var Backbone = require("backbone");

var Activity = require("./lib/activity.js");
var User = require("./lib/user.js");
var Session = require("./lib/session.js");
//-----------------------------------------------------------------------------
//Where is everything? Load the site settings

//Look at the FE_CONFIG_PATH environment variable for the location.
//By default, look in the 'config' subfolder. Or the 'config.example' subfolder, if 'config' is not defined.
GLOBAL.CONFIG_PATH = process.env.FE_CONFIG_PATH || (fs.existsSync("./config") ? "./config/" : "./config.example/");
var settings = require(CONFIG_PATH + "settings.js");
	
//Have Activities and designs use the correctly configured sync functions 
Activity.Model.prototype.sync = Activity.Collection.prototype.sync = settings.sync.activity;
Activity.Design.prototype.sync = Activity.Design.Collection.prototype.sync = settings.sync.design;
User.Model.prototype.sync = settings.sync.user;

//Load the context builder
var buildContext = require(CONFIG_PATH + "context.js");
if (typeof buildContext != 'function') throw("context.js must export a function");

//Create the application
var express = require('express');
var app = express();
var app_auth = require('./app/auth.js');
var app_design = require('./app/design.js');
var app_activity = require('./app/activity.js');

app.set('settings', settings);
app.set('session', Session(settings.session));

//Configure global middleware
app.use(express.logger({immediate:true}));
app.use(express.bodyParser());
app.use(function(req, res, next) {
	res.set({ //Set the globally-used headers
		'Access-Control-Allow-Origin' : '*',
		'Access-Control-Allow-Methods' : 'GET, POST',
		'Access-Control-Allow-Headers' : 'Content-Type, Depth, User-Agent, Authorization',
		'Date' : (new Date()).toUTCString()
	});
	next();
});
app.use(buildContext);

//Give happy empty responses to any OPTIONS request for CORS
app.options('*', function(req, res, next) { res.send(200, {}); });

//Require authentication for some routes
var requireUser = function(req, res, next) { if (req.user) next(); else next(new Activity.Error("Authenticated user required", 401)); }; 

//Define site routes
app.post('/auth/login', app_auth.login);
app.post('/auth/logout', app_auth.logout);
app.get('/auth/self', requireUser, app_auth.self);
app.param('design', requireUser, app_design.loadDesign);
app.get('/designs', requireUser, app_design.index);
app.get('/designs/:design', requireUser, app_design.read);
app.post('/designs/:design/fire/create', requireUser, app_design.create);
app.param('activity', requireUser, app_activity.loadActivity);
app.get('/activities', requireUser, app_activity.index);
app.get('/activities/:activity', requireUser, app_activity.read);
app.post('/activities/:activity/fire/:action', requireUser, app_activity.fire);

//Handle errors
app.use(function(error, req, res, next) {
	console.error("Error: " + error);
	res.send({error: error}, error.status_code || 500);
	console.error(error, error.status_code, "for", req.method, req.url);
	if (error.inner) console.error("Inner:", error.inner);	
});

app.listen(8000);

//TODO: Replace index
//	/**
//	 * Top-level handler. Returns human-readable (ish) reflective API information 
//	 */
//	function index() {
//		send({
//			api: {
//				"GET /": "This page",
//				"GET /activities" : "Fetch all activities",
//				//TODO: Implement
//				//"/activities?{querystring}" : "Fetch some subset of activities, filtered by query",
//				//"GET /activities/:view" : "Fetch some pre-made view,"
//				"GET /activities/:id" : "Fetch an activity",
//				"POST /activities/:id/fire/:action" : "Fire an action on the activity with the given POST data, and return the updated activity",
//				"GET /designs" : "Fetch available designs",
//				"GET /designs/:design" : "Fetch a design",
//				"POST /designs/:design/fire/create" : "Create a new activity of that design with the given POST data, and return the new activity"
//			}
//		});
//	}

//-----------------------------------------------------------------------------
console.log("Server listening on port "+settings.serverport+"...");