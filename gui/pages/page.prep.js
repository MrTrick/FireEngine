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
			action.oncefirst( {
				'prep:cancel' : function(msg) {
					FlashManager.info("Cancelled action '"+action.get('name')+"'. " + msg); 
				},
				'prep:error' : function(msg) {
					FlashManager.error(msg);
				},
				'prep:complete;' : function(data) {
					//Preparation completed - fire the action (back to the server)
					action.fire(data)
					.done(function(response) {
						FlashManager.success("Fired action '"+action.get('name')+"'.");
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
						//Go back to the previous view (activity, or create)
						Backbone.history.loadUrl();
					});
				}
			}); //oncefirst returns an 'off' function to unregister those events if externally necessary. 
			action.prepare(context);
		}
	});

})(App);