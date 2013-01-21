/**
 * 
 */
(function() {
	//Housekeeping - ensures the file is usable on node.js and on client
	var Activity = this.Activity = (typeof exports !== "undefined") ? exports : {};
 	if ((typeof _ == "undefined") && (typeof require !== "undefined")) _ = require("underscore");
 	if ((typeof Backbone == "undefined") && (typeof require !== "undefined")) Backbone = require("backbone");
 	
 	/**
 	 * An Activity Design
 	 * Represents a template for how the activity will work
 	 */
	Activity.Design = Backbone.Model.extend({
		idAttribute: "id",
		defaults: [],
		urlRoot: "designs/",
		createAction: function() {
			return new Activity.Action(_.extend(
				{
					id:this.id,
					name:this.get("name"),
					version:this.get("version")
				}, 
				this.get("create")
			)); 
		},
	});
	
	/**
	 * Collection of Activity.Design items
	 */
	Activity.Design.Collection = Backbone.Collection.extend({
		model: Activity.Design,
		url: "designs/"
	});

 	/**
 	 * A single Activity  
 	 */
	Activity.Model = Backbone.Model.extend({
		idAttribute: "_id",
		urlRoot: "activities\/",
		actions: function() { 
			return new Backbone.Collection(this.attributes.design.actions, {activity:this, model:Activity.Action});
		},
		history: function() {
			return new Activity.Model.History.Collection(this.attributes.history);
		}
	});
	
	/**
	 * Collection of Activity.Model items
	 */
	Activity.Collection = Backbone.Collection.extend({
		model: Activity.Model,
		url: "activities\/"
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
		},
		sync: function() { throw "Can't sync directly - sync the parent activity"; }
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
			if (typeof options != 'undefined' && options.activity) {
				this.activity = options.activity;
			}
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
			var allowed_handler = new Function(attrs.allowed);
			
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
			prepare_handler = new Function(prepare_handler);
			
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
			var url;
			if (this.activity) url = this.activity.url() + "/fire/" + this.id;
			else url = "activities/create/" + this.id;
			
			return $.ajax(url, { type: "post", data: JSON.stringify( data ) } );
		}
			:
		//Server implementation
		function(data, context, options) {
			var action = this;
			var activity = action.activity;
			var fire_handler = this.get('fire');
			var before_state = _.clone(activity.get('state'));
			
			//What to do once fired? 
			function success() {
				//If a 'to' state is defined and the fire handler didn't already modify the state, transition.
				//TODO: Should this be done by setting say "this.new_state" inside the handler?
				var state = activity.get('state');
				if (action.get('to') && _.isEqual(state.sort(), before_state.sort())) {
					//Remove any 'from' states, add any 'to' states.
					state = _.chain(state).difference(action.get('from')).union(action.get('to')).value();
				}

				//Add a history entry
				//TODO: Allow the fire handler to choose the history message  
				var history = activity.get('history');
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
			fire_handler = new Function(fire_handler);
			
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