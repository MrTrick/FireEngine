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
			var oncancel = function() {
				//TODO:
			}
			
			
			options.action.prepare(context, {
				success: function(data) {
					//Completed - fire the action.
					//(send back to the server)
					action.fire(data)
					//When finished, go back to the view page
					.done(function() {
						//TODO: Bootstrap Notification.
						console.log("fired!", data);
						
						//App.router.navigate('view/'+action.activity.id, {trigger: true});
						App.router.view(action.activity.id);
					})
					//If the action fails, TODO ?					
					.fail(function(action, err, options) {
						console.log("error!", arguments);
					});
				},
				//TODO: What else to catch? Cancel? Error?
				error: function() {
					console.log("failed to prep", arguments);
				}
			});
		}
	});

})(App);