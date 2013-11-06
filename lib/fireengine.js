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
	var is_client = (typeof window != 'undefined');
	var FireEngine = this.FireEngine = is_client ? {} : exports;
	if (!is_client) {
		_ = require("underscore");
		Backbone = require("backbone");
		JSV = require("JSV").JSV;
		Allowed = require("./allowed");
		Errors = require("./errors");
	}
	if (typeof log === 'undefined') log = console;

 	/**
 	 * Convert a function defined as a string into a real function.
 	 * Using the 'new Function' method is safer than eval, as the function
 	 * has no scope. Using 'with' and .call()ing the function, we can inject
 	 * back into the function the desired level of scope.
 	 * 
 	 * @param string src
 	 * @return {Function}
 	 */
 	var coerce = FireEngine.coerce = function(src) {
 		if (_.isString(src)) return new Function(
			"with(this) {\n" + 
				src + 
			"\n};"
		);
 		else if (_.isFunction(src)) return src;
 		else throw new Error("Invalid function: " + typeof src);
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
 	// Utility members
 	//------------------------------------------------------------------------------
 	
 	FireEngine.baseUrl = '';
 	//If on the client, automatically set baseUrl (assumes at SERVERURL/fireengine.js)
 	if (this.window) FireEngine.baseUrl = $('script[src$="fireengine.js"]').attr('src').slice(0, -('fireengine.js'.length));

 	//------------------------------------------------------------------------------
 	// Designs
 	//------------------------------------------------------------------------------
 	
 	/**
 	 * An Activity Design
 	 * Represents a template for how the activity will work
 	 */
	FireEngine.Design = Backbone.Model.extend({
		defaults: {},
		urlRoot: function() { return FireEngine.baseUrl + "designs/"; },

		/**
		 * Fetch an action by name
		 * At this time, the only supported design action is 'create'.
		 * @param name
		 * @returns {FireEngine.Action}
		 */
		action: function(name) {
			if (name != "create") throw "Design actions other than 'create' not supported yet.";
			
			return new FireEngine.Action(
				_.extend( this.get(name), { id: name } ),
				{
					design: this, 
					activity: new FireEngine.Activity({design:this.id}, {design: this})
				}
			);
		},
		
		/**
		 * Build and return a graphviz representation of the Design
	     * To convert to an image, pipe the output through a graphviz tool, eg:
	     *   echo output | dot -Tpng > dot.png
	     *   echo output | neato -Tpng > neato.png
	     * @returns string Graph of states and actions  
		 */
		graph: function() {
			var o = [
	        	"digraph "+this.id+" {",
	        	"overlap=false;",
	            "rankdir=LR;",
	        ];
			var states = this.get('states');
			var start = this.action('create').get('to');
			var actions = new FireEngine.Action.Collection(this.attributes.actions); 
			function add_node(state) {
				label = state.charAt(0).toUpperCase() + state.substring(1); //ucfirst
				o[o.length] = state + " [ label=\"" + label + "\" ];"; 
			}
			
	        //Start / End states
			o[o.length] = "\nnode [shape = doublecircle, width=1.5,height=1.5];";
			_.each(start, add_node);
			_.each(_.intersection(states, ['closed']), add_node);
			
			//Other states
			o[o.length] = "\nnode [shape = circle];";
			_.each(_.difference(states, start, ['closed']), add_node);
			
			//Actions
			o[o.length] = "\nnode [shape = box, width=0, height=0];";
			actions.each(function(action) {
				o[o.length] = action.id + " [ label=\"" + action.get('name') + "\"];";
			});
			
			//Connections between states and actions
			o[o.length] = "";
			actions.each(function(action) {
				//From 'from' states to actions
				_.each(action.get('from'), function(from) {
					o[o.length] = from+"->"+action.id+";";
				});
				//From Actions to 'to' states
				_.each(action.get('to'), function(to) {
					o[o.length] = action.id+"->"+to+";";
				});
			});
			
			o[o.length] = "\}\n";
			return o.join("\n");
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
			var instance = FireEngine.environment.createInstance(data, this.id);
			var report = FireEngine.schemas.design.validate( instance );

			if (report.errors.length) return report.errors; //TODO: Report should be formatted to match some standard?
		}
	});
	
	/**
	 * Collection of FireEngine.Design items
	 */
	FireEngine.Design.Collection = Backbone.Collection.extend({
		view: null, //The collection view, eg 'active', 'all'.
		url: function() { return this.view ? (FireEngine.baseUrl + "designs/view/" + this.view) : (FireEngine.baseUrl + "designs/"); },
		model: FireEngine.Design,
		/**
		 * Fetch the subset of designs where the given design action's name is permitted by the context
		 */
		allowed: function(name, context) {
			return new FireEngine.Design.Collection( this.filter(function(design) { return design.action(name).allowed(context); }) );
		}
	});
	FireEngine.Design.Collection.all = new FireEngine.Design.Collection();
	
 	//------------------------------------------------------------------------------
 	// Activities
 	//------------------------------------------------------------------------------

 	/**
 	 * A single Activity  
 	 */
	FireEngine.Activity = Backbone.Model.extend({
		urlRoot: function() { return FireEngine.baseUrl + "activities/"; },
		/**
		 * The design associated with the activity. (id: attrs.design)
		 * @var FireEngine.Design  
		 */
		design: null,
		initialize: function(attrs, options) {
			//If design was set in the options, push it into the class
			if (options && options.design) this.set('design', options.design.id, _.extend({}, options, {validate:true}));
			//If the design attribute changes, update the design. 
			this.on('change:design', function(activity, design_id) { activity.design = FireEngine.Design.Collection.all.get(design_id); });
			//If design is set, trigger that change.
			if (this.get('design')) this.trigger('change:design', this, this.get('design'), options );
		},
		/**
		 * Return all actions on the activity
		 * @returns {Backbone.Collection}
		 */
		actions: function actions() { 
			return new FireEngine.Action.Collection(this.design.get('actions'), {activity:this});
		},
		/**
		 * Return an action by name
		 * NB: Creates a new object each time it's called.   
		 * @param name
		 * @returns {FireEngine.Action}
		 */
		action: function(id) {
			var attrs = _.find(this.design.get('actions'), function(a) { return a.id==id; });
			return attrs ? new FireEngine.Action(attrs, {activity:this}) : null;
		},
		/**
		 * Given a user_id, return the roles on the Activity that mention them
		 * @param user_id
		 * @returns array
		 */
		roles: function(user_id) {
			var roles = [];
			//(roles is a map of role: users. Adds the roles that mention the user.)
			_.each(this.get('roles'), function(users, role) {
				if (_.contains(users, user_id)) roles[roles.length] = role;  
			});
			return roles;
		},
		/**
		 * Return the collection of history notes
		 * @returns {FireEngine.Activity.History.Collection}
		 */
		history: function() {
			return new FireEngine.Activity.History.Collection(this.attributes.history);
		},
		
		/**
		 * Is the given operation (read/fire) allowed on the activity?
		 * @param operation string currently 'read' or 'fire'
		 * @param context Contextual information (like current user) that might be needed
		 * @returns bool 
		 */
		allowed: function(operation, context) {
			//TODO: This has to run build-rule per Activity, per invocation. It would be better served 
			var rule = this.design.get('allowed') && Allowed.buildRule(this.design.get('allowed')[operation]);
			
			//If no rule defined, allowed.
			if (!rule) return true;
			
			//Test the rule with some built-in context
			context = _.extend({}, context, {
				activity:this,
				console: prefixconsole("["+this.design.id+" : allowed : "+operation+"]")
			});
			try {
				return rule.call(context); 
			} catch(e) {
				context.console.error("Uncaught exception in rule handler");
			}
		},
		/**
		 * Validate the activity according to its schema
		 * @param attrs
		 * 
		 * @returns
		 */
		validate: function(attrs) {
			//var data = _.filter(_.extend({}, this.attributes, attrs), function(val) { return typeof val !== 'undefined'; });
			var data = _.extend({}, this.attributes, attrs);
			var instance = FireEngine.environment.createInstance(data, this.id);
			var report = FireEngine.schemas.activity.validate( instance );

			//Ensure that the design id exists
			var design_id = data.design;
			if (design_id && !FireEngine.Design.Collection.all.get(design_id)) {
				log.error("ERROR: Design "+design_id+" does not exist." + (data.id ? " Referenced by activity "+data.id : ''));
				report.errors.push("Design "+design_id+" does not exist.");
			}
			
			if (report.errors.length) return report.errors; //TODO: Report should be formatted to match some standard?
		}
	});
	
	/**
	 * Collection of FireEngine.Activity items
	 */
	FireEngine.Activity.Collection = Backbone.Collection.extend({
		view: null, //The collection view, eg 'active', 'all'.
		url: function() { return this.view ? (FireEngine.baseUrl + "activities/view/" + this.view) : (FireEngine.baseUrl + "activities/"); },
		model: FireEngine.Activity
	});
	
	/**
	 * An entry in the Activity's change history 
	 */
	FireEngine.Activity.History = Backbone.Model.extend({
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
	FireEngine.Activity.History.Collection = Backbone.Collection.extend({
		model: FireEngine.Activity.History,
		sync: function() { throw "Can't sync directly - sync the parent activity"; },
		comparator: function(model){
			return -Date.parse(model.get("when"));
		}
	});
	
 	//------------------------------------------------------------------------------
 	// Action
 	//------------------------------------------------------------------------------
	/**
	 * FireEngine.Action
	 */
	FireEngine.Action = Backbone.Model.extend({
		//defaults: {"from":null,"if":null,"prep":null},
		sync: function() { throw "Can't sync directly - sync the parent activity, or fire"; },
		
		fullId: function() {
			return this.design.id + '/' + this.id;
		},
		
		fullName: function() { 
			return this.design.get('name') + ': ' + this.get('name');
		},
		
		/**
		 * Save a reference to the associated activity, if given to the constructor
		 * @param attrs
		 * @param options
		 */
		initialize: function(attrs, options) {
			options || (options = {}); 
			if (options.activity) this.activity = options.activity;

			if (options.design) this.design = options.design;
			else if (this.activity && this.activity.design) this.design = this.activity.design;
			
			//Set 'name' if not given.
			if (!this.has('name') && this.id) this.set('name', this.id.charAt(0).toUpperCase() + this.id.substring(1) ); //ucfirst)
			
			_.bindAll(this, 'allowed', 'prepare', 'url', 'fire');
		},
		
		/**
		 * Is the action permitted to be fired?
		 * - Checks that any 'from' states are present
		 * - Checks the 'allowed' handler, if defined for the action
		 * 
		 * Will be called from client and server.
		 * Returns synchronously.
		 * @param context Contextual information (like current user) that might be needed by the 'allowed' handler 
		 * @returns true|false
		 */
		allowed: function(context) {
			var attrs = this.attributes;
			var action = this;
			var activity = action.activity;
			
			//Is the user allowed to fire actions on this activity at all?
			if (!activity.allowed("fire", context)) return false;
			
			//Are all the "from" states found in the current state? If not, short-circuit fail.
			if (attrs.from && _.difference(attrs.from, activity.get("state") ).length ) return false;
			
			//Are any of the "notfrom" states in the current state? If so, short-circuit fail.
			if (attrs.notfrom && _.intersection(attrs.notfrom, activity.get("state") ).length ) return false;	
			
			//Is an "allowed" handler defined? If not, short-circuit pass.
			var allowed_handler = this.get("allowed") && Allowed.buildRule(this.get("allowed"));
			if (!allowed_handler) return true;
			
			//Invoke it with some built-in context
			context = _.extend({}, context, {
				activity: activity,
				action: action,
				console: prefixconsole("["+action.fullId()+" : allowed]"),
				Allowed: Allowed
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
		    is_client 
			?
		//Client implementation
		function(inputs) {
			var action = this;
			
			return $.ajax(this.url(), { 
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
		}
			:
		//Server implementation
		function(inputs, context, options) {
			if (!context || !options) throw new Error("Cannot call fire without context and options");
			var action = this;
			var activity = action.activity;
			var fire_handler = this.get('fire');
			var listener = _.extend({}, Backbone.Events);
			
			//Add some built-in data to the context  
			context = _.extend({}, context, {
				inputs: inputs || {},			
				action: action,
				activity: action.activity,
				console: prefixconsole("["+action.fullId()+" : fire]"),
				
				//Completion methods - call this.complete(outputs) or this.error(...) when done 
				complete: function(outputs) { listener.trigger("complete", outputs); },
				error: function(error, status_code, inner) { listener.trigger("error", error, status_code, inner); }
			});
			
			//Set up a timeout if configured, in case the handler takes too long
			if (options.timeout > 0) setTimeout(function() { 
				listener.trigger('error', "Fire handler timed out");
				listener.on('success', function() { console.error("[Action:Fire] Fire handler for "+action.fullId()+" took too long, request timed out. Response was:", out); });
			}, options.timeout);
						
			//If an error occurs while firing - pass up the chain
			//'Smart' error handler - Parses string errors into 'real' ones
			listener.on('error', function(error, status_code, inner) {
				listener.off();
				if (!_.isObject(error) || !error.message) {  
					var E = Errors[status_code] || Errors.ServerError; 
					error = new E( _.isString(error) ? error : "Firing error", inner || status_code || error); 
				}
				options.error(activity, error, options);
			});
			
			//If the handler completes - FIRE! 
			listener.on('complete', function(outputs) {
				//Where they're not given, set the default outputs
				outputs = _.defaults(outputs || {}, {
					message: activity.isNew() ? "Created" : "Fired action "+action.get('name'),
				    to: action.get('to'),
				    id: null 
 				});
				//-------------------------------------------------
				// Modify the Activity
				//-------------------------------------------------
				var attrs = {};
				
				//Set attributes given via outputs 
				if (outputs.data) attrs.data = outputs.data;
				if (outputs.links) attrs.links = outputs.links;
				if (outputs.roles) attrs.roles = outputs.roles;
				
				//What are the new Activity states?
				if ( _.difference(outputs.to, action.get('to') ).length ) 
					return listener.trigger('error', "Fire handler set invalid 'to' states: "+JSON.stringify(outputs.to));
				attrs.state = activity.get('state') || [];
				attrs.state = _.difference(attrs.state, action.get('from') || []);
				attrs.state = _.union(attrs.state, outputs.to || []);
				
				//Add history
				attrs.history = activity.get('history') || [];
				attrs.history.push({ message: outputs.message, when: (new Date()).toISOString(), action: action.id, who: context.user ? context.user.id : null });
					
				//If creating and id given, set id
				if (activity.isNew() && outputs.id) attrs.id = outputs.id;

				//Auto-set 'creator' and 'actor' roles
				attrs.roles = attrs.roles || activity.get('roles') || {};
				if (activity.isNew()) attrs.roles.creator = _.union(attrs.roles.creator || [], context.user.id);
				attrs.roles.actor = _.union(attrs.roles.actor || [], context.user.id);
				
				if (!activity.set(attrs, {validate:true})) 
					return listener.trigger('error', "Couldn't modify Activity, validation error:" + JSON.stringify( activity.validationError ));
				//-------------------------------------------------
				// Save the changes
				//-------------------------------------------------				
				listener.off();
				activity.save(null, options); //When complete, calls the options.success function to return
			});
			
			//Call the fire handler if one is defined
			if (fire_handler) {
				try { coerce(fire_handler).call(context); } 
				catch(e) {
					console.error("["+action.fullId()+" : fire] Uncaught exception in fire handler", e);
					listener.trigger('error', e);
				}
			//Otherwise just immediately finish
			} else {
				listener.trigger('complete', {});
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
			var instance = FireEngine.environment.createInstance(data, this.id);
			var report = FireEngine.schemas.action.validate( instance );

			if (report.errors.length) return report.errors; //TODO: Report should be formatted to match some standard?
		}
	});
	
	/**
	 * Collection of FireEngine.Action items
	 */
	FireEngine.Action.Collection = Backbone.Collection.extend({
		model: FireEngine.Action,
		/**
		 * Fetch the subset of actions which are permitted by the given context
		 */
		allowed: function(context) {
			return new FireEngine.Action.Collection( this.filter(function(action) { return action.allowed(context); }) );
		}		
	});
	
 	//------------------------------------------------------------------------------
 	// Validation
 	//------------------------------------------------------------------------------
	
	//TODO: extend this environment, later.
 	var environment = JSV.createEnvironment();
 	FireEngine.environment = environment;
 	FireEngine.schemas = {};
 	
 	FireEngine.schemas.states = environment.createSchema({
 		id: "states",
 		description: "A set of states within an activity",
 		type: "array",
 		items: { type: "string", pattern: "^\\w+$" },
 		uniqueItems: true
 	}, null, "FireEngine.schemas");
 	
 	FireEngine.schemas.states_required = environment.createSchema({
 		id: "states_required", 
		extends: "states", 
		required: true, 
		minItems: 1 
	});
 	
 	FireEngine.schemas.callback = environment.createSchema({
 		id: "callback",
 		description: "A javascript handler function. Written without enclosing 'function() {', '}' surrounds.",
 		type: ["string", "null", "function"],
 		minLength: 1
 		//Any other restrictions?
 	}, null, "FireEngine.schemas");
 	
 	FireEngine.schemas.action = environment.createSchema({
 		id: "action",
		description: "An action within a design, like 'approve' or the special action 'create'",
		type: "object",
		properties: {
			id: { type: "string", pattern: "^\\w+$", required: true },
			name: { type: "string", minLength: 1 },
			from: { $ref: "states" },
			notfrom: { $ref: "states" },
			to: { $ref: "states" },
			allowed: { }, //Might be null, string, array, object, or function
			prepare: { $ref: "callback" },
			fire: { $ref: "callback" },
			validate: { type: "object" } //.... this is meant to be a valid json-schema (or a function?)
		}
 	}, null, "FireEngine.schemas");
 	
 	FireEngine.schemas.design_action = environment.createSchema({
 		extends: "action",
 		id: "design_action", 
 		required: true,
 		properties: { 
 			id: { required: false },
 			to: { $ref: "states_required" } 
		}
	});
 	
 	FireEngine.schemas.design = environment.createSchema({
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
 	}, null, "FireEngine.schemas");

	FireEngine.schemas.activity = environment.createSchema({
		id: "activity",
		description: "Storage of all relevant information about an activity in progress",
		type: "object",
		properties: {
			id: { type: "string" },
			_rev: { type: "string" },
			design: { type: "string", required: true },
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