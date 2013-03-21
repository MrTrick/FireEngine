/**
 * 
 */
(function(App) {
	if (!App) throw "No App defined";
	if (!App.Page) App.Page = {};
	
	//Collection of activities
	var Activity_List = Backbone.Marionette.CompositeView.extend({
		tagName: 'table',
		className: 'table',
		template: _.template('<thead><tr><th>Activity</th><th>State</th><th>Last Updated</th></thead><tbody></tbody>'),
		itemViewContainer: 'tbody',
		itemView: Backbone.Marionette.ItemView.extend({
			tagName: 'tr',
			template: _.template('<td><a href="#activities/{{ _id }}">{{ design.name }}</a></td><td>{{ state }}</td><td>{{ last_updated }}</td>'),
			templateHelpers: function() {
				var history_last = _.last(this.model.get('history'));
				return { last_updated: history_last && history_last.when };
			}
		}),
		emptyView: Backbone.Marionette.ItemView.extend({ tagName: 'tr', template: _.template("<td colspan=3><i>Loading...</i></td>") }),
		//appendHtml: function(collectionView, itemView) { collectionView.$('ul').append(itemView.el); }
		
		initialize: function() {
			//Modify the isodate sorter parser so it actually *works*
			_.extend($.tablesorter.getParserById("isoDate"), {
				format: function(s, table) { return s; },
				type: "text"
			});
			
			//Make the table sortable when first rendered
			this.once('render', function() { this.$el.tablesorter({}); }, this);
			
			//Whenever the table is re-rendered, trigger an update so the sorting continues to work.
			this.on('render', function() { this.$el.trigger("update"); }, this);
		}
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