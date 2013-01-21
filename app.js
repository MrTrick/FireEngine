/*
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
var CONFIG_PATH = process.env.FE_CONFIG_PATH || (fs.existsSync("./config") ? "./config/" : "./config.example/");
var settings = require(CONFIG_PATH + "settings.js");
var environment = require(CONFIG_PATH + "environment.js");

//Load all designs on start-up
//(This is partly because designs are modules, asynchronous 'require' calls
// can be complex, and `always` will restart the server if a design changes)
var designs = {};
fs.readdirSync(CONFIG_PATH + "designs/").forEach(function(file) {
	if (file.match(/\.js$/)) {
		var design = Sanitize(require(CONFIG_PATH + "designs/" + file));
		designs[design.id] = design;
	}
});

//-----------------------------------------------------------------------------
//Connect Backbone through to the database
Backbone.sync = bb_couch.backboneSync(settings.db);
//-----------------------------------------------------------------------------
//Build the HTTP server
http.createServer(function(request, response) {
	function send(data, code, headers) {
		var headers = _.extend({'Content-Type': 'application/json'}, headers || {});
		response.writeHead( typeof code == 'undefined' ? 200 : code, headers);
		response.write(JSON.stringify(data) + "\n");
		response.end();
	}
	function read_error(something, error) {
		console.error(error.message, error.request.uri, error.status_code);
		if (error.status_code == 404) return send({error:error.message}, 404);
		else {
			send({error: "Server error"}, 500);
			console.error("SERVER ERROR", error);
		}
	}
	//-------------------------------------------------------------------------
	//Process and route the request
	var url_parts = url.parse(request.url);
	var path = url_parts.pathname = url_parts.pathname.replace(/\/{2,}/,'/').replace(/\/$/,''); //Strip out any extra or trailing slashes
	console.log("Received a request for ", path);
	
	if (path == '') {
		index();
	} else if (path == '/activities') {
		activities_index();
	} else if (m=/^\/activities\/(\w+)$/.exec(path)) {
		activities_read(m[1]);
	} else if (m=/^\/activities\/(\w+)\/fire\/(\w+)$/.exec(path)) {
		activities_fire(m[1], m[2]);
	} else if (path == '/designs') {
		designs_index();
	} else if (m=/^\/designs\/(\w+)$/.exec(path)) {
		designs_read(m[1]);
	} else if (m=/^\/designs\/(\w+)\/create$/.exec(path)) {
		designs_create(m[1]);
	} else {
		not_found();
	}
	
	//-------------------------------------------------------------------------
	//Request handlers
	
	/**
	 * Display all activities 
	 * TODO: Filtering?
	 */
	function activities_index() {
		console.log("Fetching all activities.");
		var activities = new Activity.Collection();
		activities.fetch({
			error: read_error,
			success: function() { send(activities.toJSON()); }
		});
	}
	/**
	 * Display an activity with the given id
	 */
	function activities_read(id) {
		console.log("Fetching activity '"+id+"'");
		var activity = new Activity.Model({_id:id});
		activity.fetch({ 
			error: read_error,
			success: function() { send(activity.toJSON());	}
		});
	}
	/**
	 * Fire the given action on an activity
	 */
	function activities_fire(id, action_id) {
		console.log("Firing action '"+action_id+"' on activity '"+id+"'");
		if (request.method != 'POST') return send({error:"Fire request must be POST"}, 405, {Allow: "POST"});
		
		var context = {}; //TODO! Load at request handling level
		var activity = new Activity.Model({_id:id});
		var data = '';
		
		//(Has to be called twice to run - waits until *both* the POST data has been read and the activity fetched) 
		var whenReady = _.after(2, function() {
			console.log("Received data and loaded activity; ");
			
			var action = activity.actions().get(action_id);
			if (!action) return send({error:"No such action"}, 404);
			if (!action.allowed(context)) return send({error:"Action forbidden"}, 403);
			try { data = JSON.parse(data); }
			catch(e) { return send({error:"Data must be valid JSON"}, 403); }
			
			//Fire the action - if successful output the activity's new state
			action.fire(data, context, {
				error: function(activity, error, options) { 
					send({error:"Could not update activity", error_detail:error}, 500); 
				},
				success: function() {
					console.log("Successfully created. New state", activity.get('state'));
					send(activity.toJSON());
				}
			});	
		});
		
		//Read in the data
		request.on('data', function (chunk) { 
			data += chunk; 
			if (data.length > 1e6) {
				send({error:"Too much data"}, 413); //Sanity check - prevent killing the server with too much data 
				request.connection.destroy();
			}
		});
		request.on('end', whenReady);
		
		//Fetch the activity
		activity.fetch({
			error: read_error,
			success: whenReady
		}); 
	}
	/**
	 * Display all available designs
	 * TODO: Filtering? 
	 * TODO: Use a real collection for sanity checking? (or a design 'loader'?)
	 */
	function designs_index() {
		console.log("Fetching all designs.");
		send(_.values(designs));
	}
	/**
	 * Display a design with the given id
	 * TODO: Use a real collection for sanity checking? (or a design 'loader'?) 
	 */
	function designs_read(id) {
		console.log("Fetching design '"+id+"'");
		if (!_.has(designs, id)) send({error:"Not found"}, 404);
		else send(designs[id]);
	}
	/**
	 * Create a new activity from the given design
	 */
	function designs_create(id) {
		console.log("Creating new activity from design '"+id+"'");
		if (!designs[id]) return send({error:"Not found"}, 404);
		var design = designs[id];

		if (request.method != 'POST') return send({error:"Fire request must be POST"}, 405, {Allow: "POST"});
		 
		//Read in the data
		var data = '';
		request.on('data', function (chunk) { 
			data += chunk; 
			if (data.length > 1e6) {
				send({error:"Too much data"}, 413); //Sanity check - prevent killing the server with too much data 
				request.connection.destroy();
			}
		});
		request.on('end', function() {
			try { data = JSON.parse(data); }
			catch(e) { return send({error:"Data must be valid JSON"}, 403); }
			
			var context = {};
			
			//Create an empty new activity of that design
			var activity = new Activity.Model({
				design: design,
				history:[],
				state:[]
			});
			console.log(design);
			if (!design.create) return send({error:"Design error - no create action"}, 500);
			var create = new Activity.Action(design.create, {activity:activity});
			if (!create.allowed(context)) return send({error:"Create not permitted"}, 403);
			
			//Fire the create action - if successful output the newly-created activity
			create.fire(data, context, {
				error: function(activity, error, options) { 
					send({error:"Could not create activity", error_detail:error}, 500); 
				},
				success: function() {
					console.log("Successfully created. ID:", activity.id, "State:", activity.get('state'));
					send(activity.toJSON());
				}
			});
		});
	}
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
				"POST /designs/:design/create" : "Create a new activity of that design with the given POST data, and return the new activity"
			}
		});
	}
	/**
	 * Simple 404 page 
	 */
	function not_found() {
		send({ error: 'Not found'}, 404);
	}
}).listen(8000);
//-----------------------------------------------------------------------------
console.log("Server listening on port 8000...");
