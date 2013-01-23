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
		urlRoot: "designs/",
		/**
		 * Fetch an action by name
		 * At this time, the only supported design action is 'create'.
		 * @param name
		 * @returns {Activity.Action}
		 */
		action: function(name) {
			if (name != "create") throw "Design actions other than 'create' not supported.";
			
			return new Activity.Action(
				_.extend( this.get(name), { id: name } ),
				{design: this}
			);
		}
	});
	
	/**
	 * Collection of Activity.Design items
	 */
	Activity.Design.Collection = Backbone.Collection.extend({
		model: Activity.Design,
		url: "designs/"
	});
	
 	//------------------------------------------------------------------------------
 	// Activities
 	//------------------------------------------------------------------------------

 	/**
 	 * A single Activity  
 	 */
	Activity.Model = Backbone.Model.extend({
		idAttribute: "_id",
		urlRoot: "activities\/",
		/**
		 * Fetch all actions on the activity
		 * @returns {Backbone.Collection}
		 */
		actions: function() { 
			return new Activity.Collection(this.attributes.design.actions, {activity:this});
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
		model: Activity.Model
	});
	
	/**
	 * An entry in the Activity's change history 
	 */
	Activity.Model.History = Backbone.Model.extend({
		idAttribute: "id",
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
		/**
		 * Save a reference to the associated activity, if given to the constructor
		 * @param attrs
		 * @param options
		 */
		initialize: function(attrs, options) {
			options || (options = {}); 
			if (options.activity) this.activity = options.activity;
			if (options.design) this.design= options.design;
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
		
			//Are all the "from" states found in the current state? If not, short-circuit fail.
			if (attrs.from && _.difference(attrs.from, this.activity.get("state") ).length ) return false;
			
			//Is an "allowed" handler defined? If not, short-circuit pass.
			if (!attrs.allowed) return true;
			
			//Coerce the "allowed" handler into a real function
			var allowed_handler = coerce(attrs.allowed);
			
			//Invoke it with some built-in context
			context = _.extend(context, {
				activity: this.activity,
				action: this.action,
				console: this.console //For debugging
			});
			return allowed_handler.call(context);
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
			//Is a "prepare" handler defined? If not, short-circuit complete
			var prepare_handler = this.get("prepare");
			if (!prepare_handler) {
				options.success && options.success({});
				return;
			}
			
			//Coerce the prep string into a real function
			prepare_handler = coerce(prepare_handler);
			
			//Invoke it with some built-in context
			context = _.extend(context, {
				activity: this.activity,
				action: this.action,
				console: this.console,
				success: options.success,
				error: options.error
			});
			return prepare_handler.call(context);
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
		 * @param data The data to fire the action with
		 */		
		fire: 
		(typeof window != 'undefined') 
			?
		//Client implementation
		function(data) {
			return $.ajax(this.url(), { type: "post", data: JSON.stringify( data ) } );
		}
			:
		//Server implementation
		function(data, context, options) {
			var action = this;
			var activity = action.activity;
			var fire_handler = this.get('fire');
			var before_state = _.clone(activity.get('state') || []);
			
			//What to do once fired? 
			function success() {
				//If a 'to' state is defined and the fire handler didn't already modify the state, transition.
				//TODO: Should this be done by setting say "this.new_state" inside the handler?
				var state = activity.get('state') || [];
				if (action.get('to') && before_state && _.isEqual(state.sort(), before_state.sort())) {
					//Remove any 'from' states, add any 'to' states.
					state = _.chain(state).difference(action.get('from')).union(action.get('to')).value();
				}

				//Add a history entry
				//TODO: Allow the fire handler to choose the history message  
				var history = activity.get('history') || [];
				history.push({
					when: (new Date()).toISOString(),
					message: activity.isNew() ? "Created" : "Fired action "+action.get('name')
				});
				
				//Push the data and state/history changes into the activity and save it 
				activity.save({state:state, history:history}, options);
			}
			
			//Is a "fire" handler defined? If not, short-circuit complete
			if (!fire_handler) {
				activity.set(data);	//Set any given data straight into the activity
				success();			//Done!
				return;
			}
			
			//Coerce the handler into a real function
			fire_handler = coerce(fire_handler);
			
			//Invoke it with some context
			context = _.extend(context, {
				action: action,
				activity: activity,
				data: data,
				console: console, //Allow debugging output
				require: require, //Allow other modules/code to be loaded
				//Pass errors back to the fire() caller
				error: options.error, 
				//If fired successfully, make and save the transition
				success: success
			});
			fire_handler.call(context);
		}
	});

}).call(this);