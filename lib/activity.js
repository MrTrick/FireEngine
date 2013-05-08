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

(function() {
	//Housekeeping - ensures the file is usable on node.js and on client
	var Activity = this.Activity = this.window ? {} : exports;
	if (typeof require != "undefined") {
		if (typeof _ == "undefined") _ = require("underscore");
		if (typeof Backbone == "undefined") Backbone = require("backbone");
		if (typeof JSV == "undefined") JSV = require("JSV").JSV;
		if (typeof Allowed == "undefined") Allowed = require("./allowed.js");
	}

 	/**
 	 * Convert a function defined as a string into a real function.
 	 * Using the 'new Function' method is safer than eval, as the function
 	 * has no scope. Using 'with' and .call()ing the function, we can inject
 	 * back into the function the desired level of scope.
 	 * 
 	 * @param string src
 	 * @return {Function}
 	 */
 	var coerce = Activity.coerce = function(src) {
 		return new Function(
			"with(this) {\n" + 
				src + 
			"\n};"
		);	
 	};
 	
 	/**
 	 * Create a copy of console, returning a console object whose 
 	 * output functions (log info warn error) are all prefixed with 
 	 * the given string.
 	 * Usage: 
 	 * var myconsole = prefixconsole("[Prefix]");
 	 * myconsole.log("Foo"); //Prints: [Prefix] Foo
 	 */
 	function prefixconsole(prefix) {
 		var con = _.extend({}, console);
 		
 		//try window/
 		con.log = _.bind(console.log, console, prefix);
 		con.info = _.bind(console.info, console, prefix);
 		con.warn = _.bind(console.warn, console, prefix);
 		con.error = _.bind(console.error, console, prefix);
 		
 		con.dir = function(obj) { console.log(prefix); console.dir(obj); };
 		con.timeEnd = function(label) { console.log(prefix); console.timeEnd(label); };
 		
 		return con;
 	};
 	
 	//------------------------------------------------------------------------------
 	// Utility functions
 	//------------------------------------------------------------------------------
 	
 	var baseUrl = '';
 	Activity.baseUrl = function(url) {
 		if (arguments.length) baseUrl = url;
 		return baseUrl; 
 	};
 	
 	//------------------------------------------------------------------------------
 	// Errors
 	//------------------------------------------------------------------------------
 	
 	Activity.Error = function(message, status_code, inner) {
 		this.name = "Activity.Error";
 		this.message = message || "An error occurred";
 		this.status_code = status_code || 500;
 		this.inner = inner || null;
 	};
 	Activity.Error.prototype = new Error();
 	Activity.Error.prototype.constructor = Activity.Error;
 	
 	//------------------------------------------------------------------------------
 	// Designs
 	//------------------------------------------------------------------------------
 	
 	/**
 	 * An Activity Design
 	 * Represents a template for how the activity will work
 	 */
	Activity.Design = Backbone.Model.extend({
		idAttribute: "id",
		defaults: {},
		urlRoot: function() { return baseUrl + "designs/"; },
		/**
		 * Fetch an action by name
		 * At this time, the only supported design action is 'create'.
		 * @param name
		 * @returns {Activity.Action}
		 */
		action: function(name) {
			if (name != "create") throw "Design actions other than 'create' not supported yet.";
			
			return new Activity.Action(
				_.extend( this.get(name), { id: name } ),
				{design: this, activity: new Activity.Model({design: this.attributes})}
			);
		},
		
		/**
		 * Validate the design according to its schema
		 * @param attrs
		 * 
		 * @returns
		 */
		validate: function(attrs) {
			//var data = _.filter(_.extend({}, this.attributes, attrs), function(val) { return typeof val !== 'undefined'; });
			var data = _.extend({}, this.attributes, attrs);
			var instance = Activity.environment.createInstance(data, this.id);
			var report = Activity.schemas.design.validate( instance );

			if (report.errors.length) return report.errors; //TODO: Report should be formatted to match some standard?
		}
	});
	
	/**
	 * Collection of Activity.Design items
	 */
	Activity.Design.Collection = Backbone.Collection.extend({
		model: Activity.Design,
		url: function() { return baseUrl + "designs/"; }		
	});
	
 	//------------------------------------------------------------------------------
 	// Activities
 	//------------------------------------------------------------------------------

 	/**
 	 * A single Activity  
 	 */
	Activity.Model = Backbone.Model.extend({
		idAttribute: "_id",
		urlRoot: function() { return baseUrl + "activities/"; },
		/**
		 * Fetch all actions on the activity
		 * @returns {Backbone.Collection}
		 */
		actions: function() { 
			return new Activity.Action.Collection(this.attributes.design.actions, {activity:this});
		},
		/**
		 * Fetch an action by name  
		 * @param name
		 * @returns {Activity.Action}
		 */
		action: function(id) {
			var attrs = _.find(this.attributes.design.actions, function(a) { return a.id==id; });
			return attrs ? new Activity.Action(attrs, {activity:this}) : null;
		},
		
		/**
		 * Given a user_id, return the roles on the Activity that mention them
		 * @param user_id
		 * @returns array
		 */
		roles: function(user_id) {
			roles = [];
			//(roles is a map of role: users. Adds the roles that mention the user.)
			_.each(this.get('roles'), function(users, role) {
				if (_.contains(users, user_id)) roles[roles.length] = role;  
			});
			return roles;
		},
		
		/**
		 * Fetch the collection of history notes
		 * @returns {Activity.Model.History.Collection}
		 */
		history: function() {
			return new Activity.Model.History.Collection(this.attributes.history);
		},
		
		/**
		 * Is the given operation (read/fire) allowed on the activity?
		 * @param operation string currently 'read' or 'fire'
		 * @param context Contextual information (like current user) that might be needed
		 * @returns bool 
		 */
		allowed: function(operation, context) {
			//TODO: This has to run build-rule per Activity, per invocation. It would be better served 
			var rule = this.attributes.design.allowed && Allowed.buildRule(this.attributes.design.allowed[operation]);
			
			//If no rule defined, allowed.
			if (!rule) return true;
			
			//Test the rule with some built-in context
			context = _.extend({}, context, {
				activity:this,
				console: prefixconsole("["+this.attributes.design.id+" : allowed : "+operation+"]")
			});
			try {
				return rule.call(context); 
			} catch(e) {
				context.console.error("Uncaught exception in rule handler");
			}
		},
		
		/**
		 * Validate the action according to its schema
		 * @param attrs
		 * 
		 * @returns
		 */
		validate: function(attrs) {
			//var data = _.filter(_.extend({}, this.attributes, attrs), function(val) { return typeof val !== 'undefined'; });
			var data = _.extend({}, this.attributes, attrs);
			var instance = Activity.environment.createInstance(data, this.id);
			var report = Activity.schemas.activity.validate( instance );

			if (report.errors.length) return report.errors; //TODO: Report should be formatted to match some standard?
		}
	});
	
	/**
	 * Collection of Activity.Model items
	 */
	Activity.Collection = Backbone.Collection.extend({
		view: null, //The collection view, eg 'active', 'all'.
		url: function() { return this.view ? (baseUrl + "activities/view/" + this.view) : (baseUrl + "activities/"); },
		model: Activity.Model
	});
	
	/**
	 * An entry in the Activity's change history 
	 */
	Activity.Model.History = Backbone.Model.extend({
		idAttribute: "id",
		sync: function() { throw "Can't sync directly - sync the parent activity"; },
		/**
		 * Generate an unique id for each history item, so they can be placed in a collection.
		 */
		initialize: function() {
			this.set("id", _.uniqueId("history"));
		}
	});
	
	/**
	 * A time-sorted collection of Activity History entries
	 */
	Activity.Model.History.Collection = Backbone.Collection.extend({
		model: Activity.Model.History,
		sync: function() { throw "Can't sync directly - sync the parent activity"; },
		comparator: function(model){
			return -Date.parse(model.get("when"));
		}
	});
	
 	//------------------------------------------------------------------------------
 	// Action
 	//------------------------------------------------------------------------------
	/**
	 * Activity.Action
	 */
	Activity.Action = Backbone.Model.extend({
		idAttribute: "id",
		//defaults: {"from":null,"if":null,"prep":null},
		sync: function() { throw "Can't sync directly - sync the parent activity, or fire"; },
		
		fullId: function() {
			return this.activity.get('design').id + '/' + this.id;
		},
		
		/**
		 * Save a reference to the associated activity, if given to the constructor
		 * @param attrs
		 * @param options
		 */
		initialize: function(attrs, options) {
			options || (options = {}); 
			if (options.activity) this.activity = options.activity;
			if (options.design) this.design= options.design;
			
			//Set 'name' if not given.
			if (!this.has('name') && this.id) this.set('name', this.id.charAt(0).toUpperCase() + this.id.substring(1) ); //ucfirst)
			
			_.bindAll(this);
		},
		
		/**
		 * Is the action permitted to be fired?
		 * - Checks that any 'from' states are present
		 * - Checks the 'allowed' handler, if defined for the action
		 * 
		 * Will be called from client and server
		 * @param context Contextual information (like current user) that might be needed by the 'allowed' handler 
		 * @returns
		 */
		allowed: function(context) {
			var attrs = this.attributes;
			var action = this;
			var activity = action.activity;
			var allowed_handler = this.get("allowed") && Allowed.buildRule(this.get("allowed"));
			
			//Is the user allowed to fire actions on this activity at all?
			if (!activity.allowed("fire", context)) return false;
			
			//Are all the "from" states found in the current state? If not, short-circuit fail.
			if (attrs.from && _.difference(attrs.from, activity.get("state") ).length ) return false;
			
			//Is an "allowed" handler defined? If not, short-circuit pass.
			if (!allowed_handler) return true;
			
			//Invoke it with some built-in context
			context = _.extend({}, context, {
				activity: activity,
				action: action,
				console: prefixconsole("["+action.fullId()+" : allowed]")
			});
			try {
				return allowed_handler.call(context);
			} catch(e) {
				console.error("["+action.fullId()+" : allowed] Uncaught exception in allowed handler", e);
				return false;
			}
		},
		
		/**
		 * Prepare the action for firing
		 * 
		 * When finished, triggers one of these events;
		 *  - 'prep:complete' (inputs) - Preparation is complete, and any action inputs have been collected
		 *  - 'prep:error' (message) - An error has occurred, and the action can not be fired.
		 *  - 'prep:cancel' (message) - The user has cancelled the action
		 *  
		 * If a 'prepare' handler is defined, delegates to it.
		 * Otherwise, completes immediately.
		 * 
		 * If the prepare handler wants to display a graphical interface, it returns a view object.
		 * 
		 * @param context Contextual information (like current user) that might be needed by the 'allowed' handler
		 * @param options An object that may contain 'success' and 'error' callbacks.
		 * @returns nothing, or a view object
		 */
		prepare: function(context, options) {
			var action = this;
			var inputs = (options && options.inputs) || {}; //Make any preset inputs available
			
			//Is a "prepare" handler defined? If not, short-circuit complete
			var prepare_handler = this.get("prepare");
			if (!prepare_handler) {
				this.trigger('prep:complete', inputs);
				return;
			}
			
			//Coerce the prep string into a real function
			prepare_handler = coerce(prepare_handler);
			
			//Invoke it with some built-in context
			context = _.extend({}, context, {
				inputs: inputs,			
				activity: action.activity,
				action: action,
				console: prefixconsole("["+action.fullId()+" : prepare]"),
				
				//Convenience methods - hides the exact eventing implementation 
				complete: function(inputs) { action.trigger("prep:complete", inputs); },
				error: function(message) { action.trigger("prep:error", message); },
				cancel: function(message) { action.trigger("prep:cancel", message); }
			});
			try { 
				return prepare_handler.call(context);
			} catch (e) {
				console.error("["+action.fullId()+" : prepare] Uncaught exception in prepare handler", e);
				this.trigger('prep:error', e);
			}
				
		},
		
		/**
		 * Fetch the url associated with this action.
		 * 
		 * If the action is on an existing activity, will be under that activity's url.
		 * Otherwise, will be under the design's url.
		 * @returns url
		 */
		url: function() {
			return !this.activity.isNew()
				? this.activity.url() + "/fire/" + this.id 
				: this.design.url() + "/fire/" + this.id;
		},
		
		/**
		 * Fire the action
		 * 
		 * If invoked on the client, fires back to the server.
		 * If invoked on the server, processes and fires the action, then saves the activity.  
		 * 
		 * @param inputs The data to fire the action with
		 */		
		fire: 
		(typeof window != 'undefined') 
			?
		//Client implementation
		function(inputs) {
			var action = this;
			
			
			$.ajax(this.url(), { 
				type: "post", 
				data: JSON.stringify( inputs ), 
				dataType: 'json',
			    contentType: "application/json; charset=utf-8"
			})
			.done(function(response) {
				//Set the received data back in the activity.
				action.activity.set(response);
				
				//Trigger - so any listeners know it's been fired.
				action.trigger('fire:complete', action);
			})
			.fail(function(jqxhr) {
				//Try to parse the error from the response
				var error;
				try { error = JSON.parse(jqxhr.responseText).error; } 
				catch(e) { error = {message: "Unknown server error", status_code:jqxhr.statusCode(), inner:jqxhr.responseText}; }
				
				//Trigger
				action.trigger('fire:error', error, action);
			});
			
			return this;
		}
			:
		//Server implementation
		function(inputs, context, options) {
			console.log("[Action:Fire] Firing");
			var action = this;
			var activity = action.activity;
			var fire_handler = this.get('fire');
			
			//Context is the object passed into the fire handler.
			//Make the modifiable attributes available
			context = _.extend({}, context, {
				_id: null,							//If creating a new activity, allow the id to be set
				data: activity.get('data') || {},  	//Custom activity data
				roles: activity.get('roles') || {},	//Roles for users associated with the activity
				links: activity.get('links') || {},	//Any references to external objects
				
				to: action.get('to'),				//The destination states for the action
				
				message: activity.isNew() ? "Created" : "Fired action "+action.get('name')
												//The message text to be saved into the history 
			});
			
			//Set up a timeout if configured, in case the handler takes too long
			var timed_out = false;
			if (options.timeout > 0) {
				var timeout_id = setTimeout(function() {
					timed_out = true;
					action.trigger('fire:error', new Activity.Error("Fire handler timed out"));
				}, options.timeout);
				this.once('fire:complete', function() { clearTimeout(timeout_id); });
			};
			
			//What to do once fired? 
			this.oncefirst({
				'fire:complete': function() {
					var attrs = {}; //Attributes to save into the activity
					
					//Did a timeout occur before the handler finished?
					if (timed_out) return console.error("[Action:Fire] Fire handler took too long, request timed out. Response was:", out);
					
					//What is the new activity state?
					var from = action.get('from') || [];
					var to = context.to || [];
					var state = activity.get('state') || [];
					attrs.state = _.chain(state).difference(from).union(to).value(); //Remove any 'from' states, add any 'to' states.
					
					//What activity attributes need to be set?
					attrs.data = context.data;
					attrs.roles = context.roles;
					attrs.links = context.links;
					
					//Add history
					attrs.history = activity.get('history') || [];
					attrs.history.push({
						when: (new Date()).toISOString(),
						message: context.message,
						action: action.id,
						who: context.user ? context.user.id : null
					});
					
					//If creating and _id given, set _id
					if (context._id && activity.isNew())
						attrs._id = context._id;
					
					//Set roles
					if (activity.isNew()) { //If creating, set creator role
						attrs.roles.creator = _.union(attrs.roles.creator || [], context.user.id); 
					}
					attrs.roles.actor = _.union(attrs.roles.actor || [], context.user.id);
					
					//Push the data and state/history changes into the activity and save it
					console.log("[Action:Fire] Firing completed, saving activity");
					if (!activity.set(attrs, {validate:true})) {
						options.error(activity, activity.validationError, options);
					} else {
						activity.save(null, options);
					}
				},
				'fire:error': function(error) {
					clearTimeout(timeout_id);
					options.error(activity, error, options);
				}
			});
			
			//Is a "fire" handler defined? If not, short-circuit complete
			if (!fire_handler) return this.trigger('fire:complete');
			
			//Push relative information into the context
			context.action = action;
			context.activity = activity;
			context.inputs = inputs || {};
			
			//Provide convenience methods
			context.console = prefixconsole("["+action.fullId()+" : fire]");
			context.complete = function(data) {
				if (data) context.data = data; //Allow the old data setting mechanism to work
				action.trigger("fire:complete"); 
			};
			context.error = function(error, status_code, inner) { //'Smart' error handler - Parses errors into a 'real' ones, if they're not. 
				if (!_.isObject(error) || !error.message) error = new Activity.Error( _.isString(error) ? error : "Firing error", status_code || 500, inner || error);
				action.trigger("fire:error", error); 
			};
			
			try {
				coerce(fire_handler).call(context);
			} catch(e) {
				console.error("["+action.fullId()+" : fire] Uncaught exception in fire handler", e);
				context.error(e);
			}
		},
		
		/**
		 * Given an event map, register each event handler. If any of those 
		 * events are triggered, unregister all the given handlers. 
		 * 
		 * Only one handler will be called, and only once.
		 * (Unless events are triggered simultaneously? TODO: Test.)
		 * 
		 * Returns the unregister function - call if the given handlers should be removed before any are triggered. 
		 */
		oncefirst: function(listeners) {
			var self = this;
			var off = function() { self.off(listeners); };
			this.once( _.keys(listeners).join(' '), off );
			this.on(listeners);
			return off;
		},
		
		/**
		 * Validate the action according to its schema
		 * @param attrs
		 * 
		 * @returns
		 */
		validate: function(attrs) {
			//var data = _.filter(_.extend({}, this.attributes, attrs), function(val) { return typeof val !== 'undefined'; });
			var data = _.extend({}, this.attributes, attrs);
			var instance = Activity.environment.createInstance(data, this.id);
			var report = Activity.schemas.action.validate( instance );

			if (report.errors.length) return report.errors; //TODO: Report should be formatted to match some standard?
		}
	});
	
	/**
	 * Collection of Activity.Action items
	 */
	Activity.Action.Collection = Backbone.Collection.extend({
		model: Activity.Action
	});
	
 	//------------------------------------------------------------------------------
 	// Validation
 	//------------------------------------------------------------------------------
	
	//TODO: extend this environment, later.
 	var environment = JSV.createEnvironment();
 	Activity.environment = environment;
 	Activity.schemas = {};
 	
 	Activity.schemas.states = environment.createSchema({
 		id: "states",
 		description: "A set of states within an activity",
 		type: "array",
 		items: { type: "string", pattern: "^\\w+$" },
 		uniqueItems: true
 	}, null, "Activity.schemas");
 	
 	Activity.schemas.states_required = environment.createSchema({
 		id: "states_required", 
		extends: "states", 
		required: true, 
		minItems: 1 
	});
 	
 	Activity.schemas.callback = environment.createSchema({
 		id: "callback",
 		description: "A javascript handler function. Written without enclosing 'function() {', '}' surrounds.",
 		type: ["string", "null"],
 		minLength: 1
 		//Any other restrictions?
 	}, null, "Activity.schemas");
 	
 	Activity.schemas.action = environment.createSchema({
 		id: "action",
		description: "An action within a design, like 'approve' or the special action 'create'",
		type: "object",
		properties: {
			id: { type: "string", pattern: "^\\w+$", required: true },
			name: { type: "string", minLength: 1 },
			from: { $ref: "states" },
			to: { $ref: "states" },
			allowed: { }, //Might be null, string, array, object, or function
			prepare: { $ref: "callback" },
			fire: { $ref: "callback" },
			validate: { type: "object" } //.... this is meant to be a valid json-schema (or a function?)
		}
 	}, null, "Activity.schemas");
 	
 	Activity.schemas.design_action = environment.createSchema({
 		extends: "action",
 		id: "design_action", 
 		required: true,
 		properties: { 
 			id: { required: false },
 			to: { $ref: "states_required" } 
		}
	});
 	
 	Activity.schemas.design = environment.createSchema({
 		id: "design",
 		description: "The definition of what an activity is, can contain, and can do",
 		type: "object",
 		required: true,
		properties: {
			id: { type: "string", pattern: "^\\w+$", required: true },
			name: { type: "string", required: true },
			version: { type: "integer", minimum:1, required: true },
			states: { $ref: "states_required" },
			create: { $ref: "design_action" },
			actions: { type: "array", items: { $ref: "action" }, required: true }
		}
 	}, null, "Activity.schemas");

	Activity.schemas.activity = environment.createSchema({
		id: "activity",
		description: "Storage of all relevant information about an activity in progress",
		type: "object",
		properties: {
			_id: { type: "string" },
			_rev: { type: "string" },
			design: { $ref: "design" },
			state: { $ref: "states_required" },
			data: { type: "object" },
			roles: { type: "object", additionalProperties: {
				type: "array",
				items: { type: "string" }
			}},
			links: { type: "object" },
			
			history: {
				type: "array", 
				items: { 
					type: "object", 
					properties: {
						when: { type: "date-time", required: true },
						message: { type: "string", required: true },
						action: { type: "string", required: true }, //TODO: This should be required to be an existing action.
						who: { required: true }
					}
				}
			}
		}
	});

}).call(this);