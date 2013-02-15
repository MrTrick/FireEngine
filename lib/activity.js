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
	var Activity = this.Activity = (typeof exports !== "undefined") ? exports : {};
 	if ((typeof _ == "undefined") && (typeof require !== "undefined")) _ = require("underscore");
 	if ((typeof Backbone == "undefined") && (typeof require !== "undefined")) Backbone = require("backbone");
 	
 	/**
 	 * Convert a function defined as a string into a real function.
 	 * Using the 'new Function' method is safer than eval, as the function
 	 * has no scope. Using 'with' and .call()ing the function, we can inject
 	 * back into the function the desired level of scope.
 	 * 
 	 * @param string src
 	 * @return {Function}
 	 */
 	function coerce(src) {
 		return new Function(
			"with(this) {" + 
				src + 
			"}"
		);	
 	}
 	
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
		defaults: [],
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
		 * Fetch the collection of history notes
		 * @returns {Activity.Model.History.Collection}
		 */
		history: function() {
			return new Activity.Model.History.Collection(this.attributes.history);
		}
	});
	
	/**
	 * Collection of Activity.Model items
	 */
	Activity.Collection = Backbone.Collection.extend({
		url: function() { return baseUrl + "activities/"; },
		model: Activity.Model,
		parse: function(resp, options) {
			return _.reject(resp, function(doc) { return /^_design/.test(doc._id); }); 
		}
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
	 * 
	 * TODO: Should more of the client code be in here? eg to fire more easily?
	 */
	Activity.Action = Backbone.Model.extend({
		idAttribute: "id",
		defaults: {"from":null,"if":null,"prep":null},
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
			if (!this.has('name')) this.set('name', this.id.charAt(0).toUpperCase() + this.id.substring(1) ); //ucfirst)
			
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
			var allowed_handler = this.get("allowed");
		
			//Are all the "from" states found in the current state? If not, short-circuit fail.
			if (attrs.from && _.difference(attrs.from, activity.get("state") ).length ) return false;
			
			//Is an "allowed" handler defined? If not, short-circuit pass.
			if (!allowed_handler) return true;
			
			//Coerce the "allowed" handler into a real function
			allowed_handler = coerce(attrs.allowed);
			
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
		 * If a 'prepare' handler is defined, delegates to it.
		 * Otherwise, completes immediately.
		 * 
		 * TODO: This should perhaps fire events instead?
		 * 
		 * @param context Contextual information (like current user) that might be needed by the 'allowed' handler
		 * @param options An object that may contain 'success' and 'error' callbacks.
		 */
		prepare: function(context, options) {
			var action = this;
			
			//Is a "prepare" handler defined? If not, short-circuit complete
			var prepare_handler = this.get("prepare");
			if (!prepare_handler) {
				this.trigger('prep:complete',{});
				return;
			}
			
			//Coerce the prep string into a real function
			prepare_handler = coerce(prepare_handler);
			
			//Invoke it with some built-in context
			context = _.extend({}, context, {
				activity: action.activity,
				action: action,
				console: prefixconsole("["+action.fullId()+" : prepare]"),
				
				//Convenience methods - hides the exact eventing implementation 
				complete: function(data) { action.trigger("prep:complete", data); },
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
		
		url: function() {
			if (this.design) return this.design.url() + "/fire/" + this.id;
			else return this.activity.url() + "/fire/" + this.id; 
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
			
			$.ajax(this.url(), { type: "post", data: JSON.stringify( inputs ) } )
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
			
			//Set up a timeout if configured, in case the handler takes too long
			var timeout_id = null, timed_out = false;
			if (options.timeout > 0) {
				timeout_id = setTimeout(function() {
					timed_out = true;
					action.trigger('fire:error', new Activity.Error("Fire handler timed out"));
				}, options.timeout);
			}
			
			//What to do once fired? 
			this.oncefirst({
				'fire:complete': function(out) {
					//Did a timeout occur before the handler finished?
					if (options.timeout > 0) {
						if (timed_out) {
							return console.error("[Action:Fire] Fire handler took too long, request timed out. Response was:", out);
						} else {
							clearTimeout(timeout_id);
						}
					}
					
					out || (out={});
					var attrs = {};
					
					//What state do we go to?
					//Remove any 'from' states, add any 'to' states.
					var from = action.get('from') || [];
					var to = out.state || action.get('to') || []; //Use the overriden state if given
					var state = activity.get('state') || [];
					attrs.state = _.chain(state).difference(from).union(to).value();
					
					//Add a history entry
					attrs.history = activity.get('history') || [];
					var default_msg = activity.isNew() ? "Created" : "Fired action "+action.get('name');
					attrs.history.push({
						when: (new Date()).toISOString(),
						message: out.history || default_msg
					});

					//Was the data modified or replaced? Ensure it's set back in the action (and validated?). 
					attrs.data = out.data || context.data;
					
					//Push the data and state/history changes into the activity and save it
					console.log("[Action:Fire] Firing completed, saving activity");
					activity.save(attrs, options);
				},
				'fire:error': function(error) {
					clearTimeout(timeout_id);
					options.error(activity, error, options);
				}
			});
			
			//Is a "fire" handler defined? If not, short-circuit complete
			if (!fire_handler) return this.trigger('fire:complete');
			
			//Coerce the handler into a real function
			fire_handler = coerce(fire_handler);
			
			//Invoke it with some context
			context = _.extend({}, context, {
				action: action,
				activity: activity,
				inputs: inputs,
				data: activity.get('data') || {},
				console: prefixconsole("["+action.fullId()+" : fire]"),
				
				//Convenience methods - hides the exact eventing implementation
				complete: function(out) { action.trigger("fire:complete", out); },
				error: function(error, status_code, inner) {
					//'Smart' error handler - Parses errors into a 'real' ones, if they're not. 
					if (!_.isObject(error) || !error.message) {
						error = new Activity.Error( _.isString(error) ? error : "Firing error", status_code || 500, inner || error);
					}
					action.trigger("fire:error", error); 
				}
			});
			
			try {
				fire_handler.call(context);
			} catch(e) {
				console.error("["+action.fullId()+" : fire] Uncaught exception in fire handler", e);
				this.trigger('fire:error', e);
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
			var off = function() { this.off(listeners); };
			this.once( _.keys(listeners).join(' '), off );
			this.on(listeners);
			return off;
		}
	});
	
	/**
	 * Collection of Activity.Action items
	 */
	Activity.Action.Collection = Backbone.Collection.extend({
		model: Activity.Action
	});

}).call(this);