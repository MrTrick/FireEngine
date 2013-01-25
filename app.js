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
//Application and system modules needed by the application
var Activity = require("./lib/activity.js");
var Sanitize = require("./lib/sanitizer.js");
var bb_couch = require("./lib/bb_couch.js");

var fs = require('fs');
var Backbone = require("backbone");
var http = require("http");
var url = require("url");

//-----------------------------------------------------------------------------
//Where is everything? Load the site settings

//Look at the FE_CONFIG_PATH environment variable for the location.
//By default, look in the 'config' subfolder. Or the 'config.example' subfolder, if 'config' is not defined.
var CONFIG_PATH = process.env.FE_CONFIG_PATH || (fs.existsSync("./config") ? "./config/" : "./config.example/");

var settings = require(CONFIG_PATH + "settings.js");
var environment = require(CONFIG_PATH + "environment.js");
var contextBuilder = require(CONFIG_PATH + "context.js");
if (typeof contextBuilder != 'function') throw("context.js must export a function");

//Load all designs on start-up
//(This is partly because designs are modules, asynchronous 'require' calls
// can be complex, and `always` will restart the server if a design changes)
var designs = {};
fs.readdirSync(CONFIG_PATH + "designs/").forEach(function(file) {
	if (file.match(/\.js$/)) {
		var design = Sanitize(require(CONFIG_PATH + "designs/" + file));
		designs[design.id] = new Activity.Design(design);
	}
});

//-----------------------------------------------------------------------------
//Have Activities use the configured sync function 
Activity.Model.prototype.sync = Activity.Collection.prototype.sync = bb_couch.backboneSync(settings.db);
//-----------------------------------------------------------------------------
//Build the HTTP server
http.createServer(function(request, response) {
	var data = '';
	//-------------------------------------------------------------------------
	function send(data, code, headers) {
		var headers = _.extend({'Content-Type': 'application/json'}, headers || {});
		response.writeHead( code || 200, headers);
		response.write(JSON.stringify(data) + "\n");
		response.end();
	}
	function send_error(message, detail, code, headers) {
		var error = {message: message || 'Server error', code: code || 500};
		if (detail) error.detail = detail;
		send({error: error}, code || 500, headers);
	}
	
	//-------------------------------------------------------------------------
	//Request routers
	var activity_router = {
		route: function(path) {
			if (path == '') this.index();
			else if (m=/^\w+$/.exec(path)) this.read(path);
			else if (m=/^(\w+)\/fire\/(\w+)$/.exec(path)) this.fire(m[1], m[2]);
			else send_error("Not found", url_parts.pathname, 404);
		},
		/**
		 * Display all activities 
		 * TODO: Filtering?
		 */
		index: function() {
			console.log("Fetching all activities.");
			var activities = new Activity.Collection();
			activities.fetch({error: this.sync_error, success: function() { send(activities.toJSON()); } });
		},
		/**
		 * Display an activity with the given id
		 */
		read: function(id) {
			console.log("Fetching activity '"+id+"'");
			var activity = new Activity.Model({_id:id});
			activity.fetch({ 
				error: this.sync_error,
				success: function() { send(activity.toJSON());	}
			});
		},
		/**
		 * Fire the given action on an activity
		 */
		fire: function(id, action_id) {
			console.log("Firing action '"+action_id+"' on activity '"+id+"'");
			
			if (request.method != 'POST') return send_error("Fire request must be POST", null, 405, {Allow: "POST"});
			var activity = new Activity.Model({_id:id});
			
			//(Wait until both dependent events are finished; the POST data has been read and the activity fetched)
			var whenReady = _.after(2, function() {
				console.log("Received data and loaded activity; ");
				var action = activity.action(action_id);
				var context = _.extend({}, environment, contextBuilder(request, data, action));
				if (!action) return send_error("No such action", {id: id, action_id: action_id}, 404);
				console.log("Activity state: ", activity.get('state'));
				console.log("Action: ", action.attributes);
				if (!action.allowed(context)) return send_error("Action forbidden",  {id: id, action_id: action_id}, 403);
								
				//Fire the action - if successful output the activity's new state
				action.fire(data, context, {
					error: function(activity, error, options) { 
						send_error("Could not update activity"+(error.message?": "+error.message:''), error.detail || error , error.status_code || 500);
						console.error("Could not update activity");
						console.error(error);
					},
					success: function() {
						console.log("Successfully created. New state", activity.get('state'));
						send(activity.toJSON());
					}
				});	
			});
			waitForPost(whenReady); //Wait until the POST data is received
			activity.fetch({error: this.sync_error, success: whenReady}); //And the activity is fetched ) 
		},
		/**
		 * Called when an activity sync fails 
		 */
		sync_error: function(m_or_c, error) {
			send_error(error.message, error, error.status_code); //TODO: Send less detail than the whole error
			console.error(error.message, error.request.uri, error.status_code);
			console.error(error);
		}
	};
	
	var design_router = {
		route: function(path) {
			if (path == '') this.index();
			else if (m=/^\w+$/.exec(path)) this.read(path);
			else if (m=/^(\w+)\/fire\/create$/.exec(path)) this.create(m[1]); //For now, just the 'create' option
			else send_error("Not found", url_parts.pathname, 404);
		},	
		/**
		 * Display all available designs
		 * TODO: Filtering? 
		 * TODO: Use a real collection for sanity checking? (or a design 'loader'?)
		 */
		index: function() {
			console.log("Fetching all designs.");
			send(_.values(designs));
		},
		/**
		 * Display a design with the given id
		 * TODO: Use a real collection for sanity checking? (or a design 'loader'?) 
		 */
		read: function(id) {
			console.log("Fetching design '"+id+"'");
			if (!_.has(designs, id)) send_error("Not found", {id: id}, 404);
			else send(designs[id]);
		},
		/**
		 * Create a new activity from the given design
		 */
		create: function(id) {
			if (request.method != 'POST') return send({error:"Fire request must be POST"}, 405, {Allow: "POST"});
			console.log("Creating new activity from design '"+id+"'");
			
			var design = designs[id];
			if (!design) return send_error("Not found", {id: id}, 404);
			var action = design.action('create');
			if (!action) return send_error("Design error - no create action", {id:id}, 500);
			 
			//Wait for the data to be received
			waitForPost(function() {
				//Create an empty new activity of that design, and store in the action
				var activity = new Activity.Model({design: design.attributes});
				action.activity = activity;
				var context = _.extend({}, environment, contextBuilder(request, data, action));
				if (!action.allowed(context)) return send_error("Create forbidden", {id:id}, 403);;
				
				//Fire the create action - if successful output the newly-created activity
				action.fire(data, context, {
					error: function(activity, error, options) { 
						send_error("Could not create activity"+(error.message?": "+error.message:''), error.detail || error , error.status_code || 500);
						console.error("Could not create activity");
						console.error(error);
					}, 
					success: function() {
						console.log("Successfully created. ID:", activity.id, "State:", activity.get('state'));
						send(activity.toJSON());
					}
				});
			});
		}
	};
	
	/**
	 * Top-level handler. Returns human-readable (ish) reflective API information 
	 */
	function index() {
		send({
			api: {
				"GET /": "This page",
				"GET /activities" : "Fetch all activities",
				//TODO: Implement
				//"/activities?{querystring}" : "Fetch some subset of activities, filtered by query",
				//"GET /activities/:view" : "Fetch some pre-made view,"
				"GET /activities/:id" : "Fetch an activity",
				"POST /activities/:id/fire/:action" : "Fire an action on the activity with the given POST data, and return the updated activity",
				"GET /designs" : "Fetch available designs",
				"GET /designs/:design" : "Fetch a design",
				"POST /designs/:design/fire/create" : "Create a new activity of that design with the given POST data, and return the new activity"
			}
		});
	}
	
	//-------------------------------------------------------------------------
	//Start collecting the request data
	function waitForPost(callback) {
		request.on('data', function (chunk) { 
			data += chunk; 
			if (data.length > 1e6) {
				send_error("Too much data", null, 413); //Sanity check - prevent killing the server with too much data 
				request.connection.destroy();
			}
		});
		request.on('end', function() {
			if (data == '') data = {};
			else try { data = JSON.parse(data); }
			catch(e) { return send_error("Request data must be valid JSON", null, 403); }
			
			callback();
		});
	}
	
	//Process and route the request
	var url_parts = url.parse(request.url);
	var path = url_parts.pathname = url_parts.pathname.replace(/\/{2,}/,'/').replace(/\/$/,''); //Strip out any extra or trailing slashes
	console.log("Received a request for '"+path+"'");
	
	if (path == '') index();
	else if (m=/^\/activities\/?(.*)$/.exec(path)) activity_router.route(m[1]);
	else if (m=/^\/designs\/?(.*)$/.exec(path)) design_router.route(m[1]);
	else send_error("Not found", path, 404);
}).listen(settings.serverport);
//-----------------------------------------------------------------------------
console.log("Server listening on port "+settings.serverport+"...");