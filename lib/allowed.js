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

var Activity = require("./activity.js");

/**
 * Enforce access control according to the given user and rules.
 */
(function() {
	//Housekeeping - ensures the file is usable on node.js and on client
	var Allowed = this.Allowed = (typeof exports !== "undefined") ? exports : {};
	if (typeof require != "undefined") {
		if (typeof _ == "undefined") _ = require("underscore");
	}
	
	/**
	 * Convert a rule into a true/false assert function
	 */
	Allowed.buildRule = function(rule) {
		//If empty or a function, return early 
		if (_.isEmpty(rule)) return null;
		else if (_.isFunction(rule)) return rule;
		else if (_.isString(rule) && rule.indexOf(" ") != -1) return new Function("with(this) {\n"+rule+"\n}"); //Assume strings containing spaces are functions 
	
		//If a role list, build and return a closure over it
		var all, any;
		if (_.isString(rule) || _.isArray(rule)) any = _.union(rule);
		else if (_.isObject(rule)) {
			all = _.union(rule.all);
			any = _.union(rule.any);
		}
		return function() {
			//Load the user roles
			var roles = this && this.user && this.user.roles(this.activity);
			
			//Valid if the user has every 'all' role, or at least one 'any' role.
			return (!all || !all.length || _.intersection(roles, all).length == all.length) &&
				   (!any || !any.length || _.intersection(roles, any).length > 0);
		};
	};
	
	/**
	 * Build several rules into a middleware closure 
	 */
	Allowed.systemAccess = function(rules) {
		//Convert each to standard form
		_.each(rules, function(rule, route) { rules[route] = Allowed.buildRule(rule); });
	
		//Return the middleware	that implements access control
		return function(req, res, next) {
			console.log("[ACL] Checking access for", req.user ? req.user.id : "null", "on", req.route.path);
			
			//Require the user to have authenticated
			if (!req.user) 
				return next(new Activity.Error("Authenticated user required", 401));
			
			//Enforce all-route rules
			if (rules._all && !rules._all.call(req.context))
				return next(new Activity.Error("Access forbidden", 403));
			
			//Find the relevant rule
			var rule = rules[ req.route.path ];
			if (typeof rule == "undefined")
				console.warn("Route " + req.route.path + " was invoked with acl middleware, but no rule for that route was known."); //TODO: How else to log warnings?
			else if (rule && !rule.call(req.context))
				return next(new Activity.Error("Access forbidden", 403));
			
			return next();
		};
	};	
}).call(this);