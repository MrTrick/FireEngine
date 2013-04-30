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
 * Parts of the application concerned with login and logout
 */

var Activity = require("../lib/activity.js");

/**
 * Check the user's authentication against the adapter,
 * and if successful grant them a set of session credentials 
 */
exports.login = function(req, res, next) {
	var credentials = req.body;
	console.log("[Route] User " + credentials.username + " attempting login");
	
	req.app.get('settings').auth.login(credentials, {
		success: function(identity) {
			console.log("[Route] Login success");
			
			//Create and send back their session credentials
			var credentials = req.app.get('session').create( identity );
			res.send(credentials);
		},
		error: function(error) {
			console.error("[Route] Login failure");
			next(error);
		}
	});
};

/**
 * Logout the user. Not expected to fail - adapter should handle/log errors internally
 */
exports.logout = function(req, res, next) {
	console.log("[Route] Logout");
	
	var logoutfn = req.app.get('settings').auth.logout;
	if (!logoutfn) 
		send('{}');
	else
		logoutfn(req.body, {
			success: function(out) { res.send(out); },
			error: function(error) { next(error); }
		});
};

/**
 * Read back the current user. If the user is authenticated, return their information
 */
exports.self = function(req, res, next) {
	console.log("[Route] Self");
	if (req.user) 
		res.send(req.user.toJSON());
	else
		next(new Activity.Error("No identity given", 401));
};