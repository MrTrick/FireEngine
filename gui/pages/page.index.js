/**
 * 
 */
(function(App) {
	if (!App) throw "No App defined";
	if (!App.Page) App.Page = {};
	
	//Collection view - list of activities
	//TODO: Make this a table
	var Activity_List = Backbone.Marionette.CollectionView.extend({
		tagName: 'ul',
		itemView: Backbone.Marionette.ItemView.extend({
			tagName: 'li',
			template: _.template("<a href=\"#activities/{{ _id }}\">{{ design.name }} - state: {{ state }}</a>")
		}),
		emptyView: Backbone.Marionette.ItemView.extend({ template: _.template("<i>Loading...</i>"), tagName: 'li' })
		//appendHtml: function(collectionView, itemView) { collectionView.$('ul').append(itemView.el); }
	});


	App.Page.Index = Backbone.Marionette.Layout.extend({
		template: _.template(
			"<h2>Activities</h2>" +
			"<div id='search'></div>" +
			"<div id='activities'></div>" +
			"<p><a href=\"#create\">Create new</a></p>"
		),
		regions: {
			search: "#search",
			activities: "#activities"
		},
		initialize: function() {
			//Fetch all activities (when fetched will be caught by the enclosing view)
			var activities = new Activity.Collection();
			activities.on('error', App.error.system);
			activities.fetch();
			
			//Render them into a list within the page
			var listview = new Activity_List({collection:activities});
			this.on('render', function() { this.activities.show(listview); }); //Wait until the parent is rendered
		}
	});
})(App);