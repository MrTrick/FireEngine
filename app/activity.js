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
var Activity = require("../lib/activity.js");

/**
 * Used with app.param to pre-load any referenced activity into the request
 */
exports.loadActivity = function(req, res, next, id) {
	console.log("[Param] Loading activity " + id);
	var activity = new Activity.Model({_id:id});
	activity.fetch({
		//If fetched successfully, push the activity into the request
		success: function(activity) {
			req.activity = activity;
			next();
		},
		//If failed to fetch, forward the error
		error: function(activity, error) { next(error); }
	});
};

/**
 * Read all activities
 * GET /activities
 */
exports.index = function(req, res, next) {
	console.log("[Route] Fetching all active activities");
	var activities = new Activity.Collection();
	
	//TODO: Use req.query to implement querying.
	//TODO: Set default query behaviour, like return only activities that don't have state 'closed'
	
	activities.fetch({
		success: function(activities) {
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
	res.send(req.activity);
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
	if (!action) return next(new Activity.Error("No such action '"+action_id+"'", 404));
	
	//Check authorisation				
	if (!action.allowed(req.context)) return next(new Activity.Error("Action '"+action_id+"' forbidden", 403));
		
	//Fire the create action - if successful output the newly-created activity
	debugger;
	action.fire(req.body, req.context, {
		timeout: req.app.get('settings').fire_timeout, 
		success: function() {
			console.log("[Route] Fired "+action_id+". New state:", activity.get('state'));
			res.send(activity.toJSON());
		},
		error: function(activity, error) { next(error); }
	});
};