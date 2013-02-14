/**
 * 
 */
(function(App) {
	if (!App) throw "No App defined";
	if (!App.Page) App.Page = {};
	
	//Helper function - returns a human representation of an interval
	function timeSince(e){var t=Math.floor;var n=t((new Date-e)/1e3);var r=t(n/31536e3);if(r>1){return r+" years";}r=t(n/2592e3);if(r>1){return r+" months";}r=t(n/86400);if(r>1){return r+" days";}r=t(n/3600);if(r>1){return r+" hours";}r=t(n/60);if(r>1){return r+" minutes";}return t(n)+" seconds";}
	
	//View: One activity, stand-alone
	//TODO: Add read control, and customisation of view from design?
	var Activity_View = Backbone.Marionette.ItemView.extend({
		template: _.template("<dt>State</dt><dd>{{ state }}</dd><dt>Data</dt><dd>{{ data }}</dd>"),
		templateHelpers: function() {
			rendered_data = [];
			_.each(this.model.get('data'), function(el, key) { 
				rendered_data.push("<dt>"+_.escape(key)+"</dt><dd>"+_.escape(JSON.stringify(el))+"</dd>");
			});
			return {
				data: rendered_data.length>0 ? "<dl>"+rendered_data.join("")+"</dl>" : "<i>None</i>"
			};
		},
		tagName: 'dl'
	});
	
	//View: The actions the user can take
	var Action_List_View = Backbone.Marionette.CollectionView.extend({
		tagName: 'ul',
		attributes: {class: "unstyled"},
		itemView: Backbone.Marionette.ItemView.extend({
			tagName: 'li',
			template: _.template("<button class=\"btn\">{{ name }}</button>"),
			//Include extra data when rendering; the activity object
			templateHelpers: function() { return {activity:this.model.activity.attributes}; },
			events: { 
				"click button": "run"
			},
			run: function() { 
				App.main.show(new App.Page.Prep({action:this.model}));
			}
		}),
		//Display only permitted actions
		showCollection: function(){
			var that = this;
			var ItemView;
			
			//Add each _permitted_ action.
			this.collection.each(function(item, index){
				if (item.allowed(App.context)) {
					ItemView = that.getItemView(item);
					that.addItemView(item, ItemView, index);
			    }
			});
			//If nothing in the collection is valid, revert to the empty view.
			if (this.children.length == 0) { 
				this.showEmptyView();
			}
		},
		//If empty, then none available
		emptyView: Backbone.Marionette.ItemView.extend({ tagName: 'li', template: _.template("<em>None available</em>") })
	});
	
	//View: History
	var History_View = Backbone.Marionette.CollectionView.extend({
		tagName: 'ul',
		itemView: Backbone.Marionette.ItemView.extend({
			tagName: 'li',
			template: _.template("{{ message }} <span style='font-style:italic' title='{{ when }}'>- {{ since }} ago</span>"),
			templateHelpers: function() { return {since:timeSince(Date.parse(this.model.get('when')))}; }
		})
	});

	// View a single page
	App.Page.View = Backbone.Marionette.Layout.extend({
		template: _.template("<h2>{{ design_name }}</h2>" +
			"<div id=\"debug_container\">" +
			"	<a href=\"#\" id=\"debug_toggle\">Debug info</a>" +
			"	<div style=\"display:none;\" id=\"debug_content\"></div>" +
			"</div>" +
			"<div id=\"activity\"></div>" +
			"<h3>Actions</h3>"+
			"<div id=\"actions\"></div>" +
			"<h3>History</h3>"+
			"<div id=\"history\"></div>" +
			"<hr>" +
			"<p><a href=\"#\">Back</a></p>"
		),
		//Temporary - gives a valid title even if the model isn't loaded yet
		templateHelpers: function() { 
			return {design_name: this.model.get('design') ? this.model.get('design').name : 'Loading...' }; 
		},
		regions: { 
			main_region: "#activity", 
			actions_region: "#actions",
			history_region: "#history",
			debug: "#debug_content" 
		},
		initialize: function(options) {
			//Fetch the activity with the given id		
			var id = options.id;
			var activity = this.model = new Activity.Model({_id:id});
			activity.on('error', function(model, error, options) {
				$(this.main_region.el).html("ERROR: "+error.status+" "+error.statusText); 
			}, this).on('sync', function() {
				//Need to re-render after sync, now that the model has loaded
				this.render();
				
				//Render the main activity region
				this.main_region.show( new Activity_View({model:activity}) );
				
				//Render the available actions
				var actions = activity.actions();
				this.actions_region.show( new Action_List_View({collection:actions, context:App.context }) );
				
				//Render the history
				this.history_region.show( new History_View({collection:activity.history()}));
				
				$("#debug_toggle,#debug_content").click(function(e) { $("#debug_content").slideToggle(500); e.preventDefault(); });
				this.debug.show(new Debug.View({model:activity}));
			}, this).fetch();
		}
	});
})(App);