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
 * Parts of the application concerned with handling design requests
 */
var Activity = require("../lib/activity.js");

/**
 * Used with app.param to pre-load any referenced design into the request
 */
exports.loadDesign = function(req, res, next, id) {
	console.log("[Param] Loading design " + id);
	var design = new Activity.Design({id:id});
	design.fetch({
		//If fetched successfully, push the design into the request
		success: function(design) {
			req.design = design;
			next();
		},
		//If failed to fetch, forward the error
		error: function(design, error) { next(error); }
	});
};

/**
 * Read all designs
 * GET /designs 
 */
exports.index = function(req, res, next) {
	console.log("[Route] Fetching all designs");
	var designs = new Activity.Design.Collection();
	designs.fetch({
		success: function(designs) {
			console.log("[Route] Sending "+designs.length+" designs");
			res.send(designs.toJSON()); 
		},
		error: function(designs, error) { next(error); }		
	});
},

/**
 * Read the given design 
 * GET /designs/:design
 */
exports.read = function(req, res, next) {
	console.log("[Route] Sending design '"+req.design.id+"'");
	res.send(req.design);
};

/**
 * Create a new activity from the given design
 * POST /designs/:design/fire/create
 */
exports.create = function(req, res, next) {
	console.log("[Route] Creating new activity from design '"+req.design.id+"'");

	var design = req.design;
	var action = design.action('create');
	if (!action) return next(new Activity.Error("Design error - no create action", 500, design.id));
	
	//Check authorisation
	if (!action.allowed(req.context)) return next(new Activity.Error("Create forbidden", 403, design.id));
		
	//Fire the create action - if successful output the newly-created activity
	action.fire(req.body, req.context, {
		timeout: req.app.get('settings').fire_timeout, 
		success: function() {
			console.log("[Route] Activity created. ID:", activity.id, "State:", activity.get('state'));
			res.send(activity.toJSON());
		},
		error: function(activity, error) { next(error); }
	});
};