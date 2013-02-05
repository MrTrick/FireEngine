/**
 * 
 */
(function(App) {
	if (!App) throw "No App defined";
	if (!App.Page) App.Page = {};
	
	//Prepare the action for firing... 
	App.Page.Prep = Backbone.Marionette.Layout.extend({
		template: _.template(
			"<h2>{{ activity.design.name }} : {{ name }} </h2>" +
			"<div id=\"body\"></div>"
		),
		regions: { 
			body: "#body"
		},
		templateHelpers: function() { return {activity:this.model.activity.attributes}; },		
		initialize: function(options) {
			console.log("Initializing prep function");
			var action = this.model = options.action;
			if (!options.action) throw "Expect to be constructed with an action";
			
			//Give access to the body region - so that prep can fill it.
			var context = _.extend({}, App.context, {
				body: this.body
			});
			
			//Run prep!
			var oncancel = function(msg) {
				FlashManager.info("Cancelled action '"+action.get('name')+"'. " + msg); 
				cleanup();
			};
			var onerror = function(msg) {
				FlashManager.error(msg);
				cleanup();
			};
			var oncomplete = function(data) {
				//Preparation completed - fire the action (back to the server)
				action.fire(data)
				.done(function(response) {
					FlashManager.success("Fired action '"+action.get('name')+"'.");
					cleanup();
					
					//Set the received data back in the activity
					action.activity.set(response);
					
					//Go to the activity view
					App.router.view(action.activity.id);
				})
				.fail(function(jqxhr) {
					var error;
					try { error = JSON.parse(jqxhr.responseText).error; } 
					catch(e) { error = {"message": "Unspecified server error"}; }
					console.log(error);
					FlashManager.error("Server Error", error.message);
					cleanup();
					
					//Go back to the previous view (activity, or create)
					Backbone.history.loadUrl();
				});
			};
			var cleanup = function() {
				action.off('cancel', oncancel);
				action.off('error', onerror);
				action.off('complete', oncomplete);
			};
			action.on('cancel', oncancel);
			action.on('error', onerror);
			action.on('complete', oncomplete);
			action.prepare(context);
		}
	});

})(App);