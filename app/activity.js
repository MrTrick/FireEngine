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
 * Parts of the application concerned with handling activity requests
 */
var FireEngine = require("../lib/fireengine.js");
var Errors = require("../lib/errors.js");

/**
 * Used with app.param to pre-load any referenced activity into the request
 */
exports.loadActivity = function(req, res, next, id) {
	console.log("[Param] Loading activity " + id);
	var activity = new FireEngine.Activity({id:id});
	activity.fetch({
		//If fetched successfully, push the activity into the request
		success: function(activity) {
			//If the user is not allowed to read it, error
			if (!activity.allowed('read', req.context)) {
				next(new Errors[req.context&&req.context.user ? 'Forbidden' : 'Unauthorized']("Reading this activity not permitted") );
			} else {						
				req.activity = activity;
				next();
			}
		},
		//If failed to fetch, forward the error
		error: function(activity, error) { next(error); }
	});
};

/**
 * Alias for /activities/view/active
 * GET /activities
 */
exports.index = function(req, res, next) {
	req.params.view = 'active';
	return exports.view(req, res, next);
};

/**
 * Fetch a list of activities from the given view
 * GET /activities/view/:view
 */
exports.view = function(req, res, next) {
	var view = req.params.view;
	console.log("[Route] Fetching activities in view '"+view+"'");
	var activities = new FireEngine.Activity.Collection();
	
	//TODO: Use req.query to implement proper a querying API.
	var params = {};
	if (req.query.key) params.key = req.query.key;
	
	//Special rule - the "mine" view goes to "by_user", key=req.user.id
	if (view === "mine") {
		view = "by_user";
		params.key = req.user.id;
	}
	
	activities.fetch({
		validate: true,
		view: { 
			design: 'fireengine',
			name: view //Fetch from the given view. If the view name is incorrect couchdb will reject it
		},
		params: params,
		success: function(activities) {
			console.log("[Route] Read "+activities.length+" activities. Filtering...");
			//Remove any activities that are not allowed to be read
			activities.set( 
				activities.filter(function(activity) { return activity.allowed('read', req.context); })
			);
			console.log("[Route] Sending "+activities.length+" activities.");
			res.send(activities.toJSON()); 
		},
		error: function(activities, error) { next(error); }		
	});
},

/**
 * Read the given activity 
 * GET /activities/:activity
 */
exports.read = function(req, res, next) {
	console.log("[Route] Sending activity '"+req.activity.id+"'");
	res.send(req.activity.toJSON());
};

/**
 * Fire the given action on the activity 
 * POST /activities/:activity/fire/:action
 */
exports.fire = function(req, res, next) {
	var action_id = req.param('action'); 
	var activity = req.activity;
	
	console.log("[Route] Firing action '"+action_id+"' on activity '"+activity.id+"'");
	
	var action = activity.action(req.param('action'));
	if (!action) return next(new Errors.NotFound("No such action '"+action_id+"'"));
	
	//Check authorisation				
	if (!action.allowed(req.context)) return next(new Errors.Forbidden("Action '"+action_id+"' forbidden"));
		
	//Fire the given action - if successful output the updated activity.
	console.log("Firing: Logging", req.body);
	action.fire(req.body, req.context, {
		timeout: req.app.get('settings').fire_timeout, 
		success: function() {
			console.log("[Route] Fired "+action_id+". New state:", activity.get('state'));
			res.send(activity.toJSON());
		},
		error: function(activity, error) { next(error); }
	});
};