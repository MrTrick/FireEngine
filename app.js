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
//Ensure the application knows where it is.

//-----------------------------------------------------------------------------
//Modules needed by the application
var fs = require("fs");
var http = require("http");
var url = require("url");
var Backbone = require("backbone");

//-----------------------------------------------------------------------------
//Where is everything?

//Where is the application?
process.chdir(__dirname);
global.APP_PATH = __dirname;

//Look at the FE_CONFIG_PATH environment variable for the location.
//By default, look in the 'config' subfolder. Or the 'config.example' subfolder, if 'config' is not defined.
global.CONFIG_PATH = process.env.FE_CONFIG_PATH || (fs.existsSync("./config") ? "./config" : "./config.example");
if (CONFIG_PATH == './config.example/') console.warn("Warning: Using configuration from ./config.example/");
CONFIG_PATH = require('path').resolve(CONFIG_PATH)+'/'; //Accept both relative and absolute forms

//Set up and configure logging
var log4js = require('log4js');
log4js.configure(CONFIG_PATH + 'log4js.json');
global.log = log4js.getLogger();

//-----------------------------------------------------------------------------

var FireEngine = require("./lib/fireengine.js");
var User = require("./lib/user.js");
var Session = require("./lib/session.js");

//-----------------------------------------------------------------------------
//Load the application settings?
var settings = require(CONFIG_PATH + "settings.js");

//Have Activities and designs use the correctly configured sync functions 
FireEngine.Activity.prototype.sync = FireEngine.Activity.Collection.prototype.sync = settings.sync.activity;
FireEngine.Design.prototype.sync = FireEngine.Design.Collection.prototype.sync = settings.sync.design;
User.Model.prototype.sync = settings.sync.user;
//Load all designs into .all
FireEngine.Design.Collection.all.fetch({error: function() { throw new Error("Could not load designs");}});

//Load the context builder
var buildContext = require(CONFIG_PATH + "context.js");
if (typeof buildContext != 'function') throw("context.js must export a function");

//Create the application
var express = require('express');
var app = express();
var app_auth = require('./app/auth.js');
var app_design = require('./app/design.js');
var app_activity = require('./app/activity.js');

app.enable('trust proxy');
app.set('settings', settings);
app.set('session', Session(settings.session));

//Configure global middleware
var checkAcls = require('./lib/allowed.js').systemAccess(settings.acl_rules);

//Set up CORS compliance; access control, and responding to OPTIONS requests
app.use(function(req, res, next) {
	res.set({ //Set the globally-used headers
		'Access-Control-Allow-Origin' : '*',
		'Access-Control-Allow-Methods' : 'GET, POST',
		'Access-Control-Allow-Headers' : 'Content-Type, Depth, User-Agent, Authorization',
		'Date' : (new Date()).toUTCString()
	});
	next();
});
app.use(function(req, res, next) { 
	if (req.method == 'OPTIONS') res.send(200, {}); //Give happy empty responses to any OPTIONS request 
	else next(); 
});

//Configure logging - after the OPTIONS handling
var log_stream = { write: function(msg) { log.info(msg.trimRight()); } };
app.use(express.logger({immediate:true, format:'short', stream:log_stream})); //Before 
app.use(express.logger({format:'short', stream:log_stream})); //After

//Other server configuration
app.use(express.json());       //Parse requests with json-encoded bodies
app.use(express.urlencoded()); //Parse requests with url-encoded bodies
app.use(buildContext);

//Define site routes
app.post('/auth/login', app_auth.login);
app.post('/auth/logout', app_auth.logout);
app.get('/auth/self', checkAcls, app_auth.self);
app.param('design', app_design.loadDesign);
app.get('/designs', checkAcls, app_design.index);
app.get('/designs/:design', checkAcls, app_design.read);
app.get('/designs/:design/graph', app_design.graph);
app.post('/designs/:design/fire/create', checkAcls, app_design.create);
app.param('activity', app_activity.loadActivity);
app.get('/activities', checkAcls, app_activity.index);
app.get('/activities/view/:view', checkAcls, app_activity.view);
app.get('/activities/:activity', checkAcls, app_activity.read);
app.post('/activities/:activity/fire/:action', checkAcls, app_activity.fire);
app.get('/', function(req, res, next) {
	res.send({api: {
		"GET /": "This page",
		"GET /activities" : "Fetch all activities",
		"GET /activities?{querystring}" : "TODO: Fetch some subset of activities, filtered by query",
		"GET /activities/:view" : "TODO: Fetch some pre-made view?",
		"GET /activities/:id" : "Fetch an activity",
		"POST /activities/:id/fire/:action" : "Fire an action on the activity with the given POST data, and return the updated activity",
		"GET /designs" : "Fetch available designs",
		"GET /designs/:design" : "Fetch a design",
		"POST /designs/:design/fire/create" : "Create a new activity of that design with the given POST data, and return the new activity"
	}});
});
app.get('/fireengine.js', function(req, res, next) {
	//Transparently concatenate 'fireengine.js' with the components it depends on
	var files = ['./lib/fireengine.js', './lib/allowed.js', './lib/errors.js'];
	var out = '';
	var done = _.after(files.length, function done() { res.type("application/javascript").send(out); });
	_.each(files, function(filename) { fs.readFile(filename, function(err, data) { 
		if (err) return next(err);
		out += data;
		done();
	}); });
});

//Handle client errors - not as serious 
app.use(function(error, req, res, next) {
	if (error.status && error.status >= 400 && error.status < 500) {
		console[error.status===401?'info':'warn']("Client error: "+error.toString()+" ( "+error.status+" )");
		
		res.send(error.status || 500, {error: error});
	} else next(error); 
});

//Handle other errors
app.use(function(error, req, res, next) {
	//Log a detailed error message
	console.error("Error: "+error.toString()+" ( "+error.status+" )");
	if (error.inner) console.error("  Inner:", error.inner.toString);
	if (error.stack) console.error(error.stack);
	
	res.send(error.status || 500, {error: error});	
});

//-----------------------------------------------------------------------------
app.listen(settings.serverport);
console.log("Server listening on port "+settings.serverport+"...");