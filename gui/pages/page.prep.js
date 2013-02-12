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
			"<div id=\"body\"></div>" +
			"<hr>" +
			"<a id=\"cancel\" href=\"#\">Back</a>"
		),
		events: { 
			"click #cancel" : function(e) { e.preventDefault(); this.model.trigger('prep:cancel', "Action cancelled"); }},		
		regions: { 
			body: "#body"
		},
		templateHelpers: function() { return {activity: this.model.activity.attributes}; },
		
		//
		disableBody: function() {
			var body = this.$("#body");
			
			//Cover the area with an overlay
			this.$el.append("<div id='prep_overlay'></div>");
			this.$("#prep_overlay").css({
				'opacity' : 0.5,
				'background-color': '#000',
				'position' : 'absolute',
				'z-index' : 1000,
				'top' : body.position().top,
				'left' : body.position().left,
				'width' : body.width(),
				'height' : body.height()
			});
			
			//Disable any form elements
			body.find('*').prop('disabled', true);
		},
		
		enableBody: function() {
			//Remove the overlay
			this.$("#prep_overlay").remove();
			
			//Enable any form elements
			//TODO: This might break prep handlers that intentionally disable parts of their form.
			//A better implementation would store a reference to the ones that were disabled *before* disableBody was called, and avoid them. (diff?)
			this.$("#body").find('*').removeProp('disabled');
		},
		
		initialize: function(options) {
			console.log("Initializing prep function");
			var view = this;
			var action = this.model = options.action;
			if (!options.action) throw "Expect to be constructed with an action";
			var immediate = true;
			
			//Run prep!
			action.oncefirst( {
				'prep:cancel' : function(msg) {
					FlashManager.info("Cancelled action '"+action.get('name')+"'. " + msg);
					//Go back to the previous view (activity, or create)
					Backbone.history.loadUrl();					
				},
				'prep:error' : function(msg) {
					FlashManager.error(msg);
					//And then?
					alert("Not sure what to do here... after prep error");
				},
				'prep:complete' : function(data) {
					//Disable the body area while we wait for a response
					view.disableBody();
					//Preparation completed - fire the action (back to the server)
					action.fire(data)
					.on('fired', function(action) {
						FlashManager.success("Fired action '"+action.get('name')+"'.");
						//Go to the activity view
						//(If a 'create' action, 'action.activity' will be the newly created activity)
						App.router.view(action.activity.id);
					})
					.on('error', function(error) {
						console.error(error);
						FlashManager.error("Server Error", error.message);
						
						//After an error - if the prepare function returned immediately						
						//go back to the previous view (activity, or create)
						//
						//If it's asynchronous maybe the user entered data, so stay.
						//
						//TODO: This isn't very elegant.
						if (immediate) Backbone.history.loadUrl();
						else view.enableBody();
					});
				}
			}); //oncefirst returns an 'off' function to unregister those events if externally necessary.
			
			//Run the prep!			
			var out = action.prepare(App.context);
			
			//If the handler returns a view object, show it in the page 
			if (_.isObject(out) && _.isFunction(out.render)) {
				//Wait until the outer has rendered.
				this.on('render', function() {
					this.body.show(out);
				});
			}
			immediate = false;
		}
	});

})(App);