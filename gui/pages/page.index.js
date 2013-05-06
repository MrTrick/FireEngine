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

	var Activity_View_Switcher = Backbone.View.extend({
		tagName: 'div',
		className: 'btn-group',
		views: {
			active: 'Active',
			all: 'All'
		},
		current: 'active',
		render: function() {
			this.$el.empty();
			_.each(this.views, function(name, id) {
				var $button = $("<button class='btn'>"+name+"</button>");
				//Disable the current button
				if (id == this.current) $button.attr({ id: ["show_"+id, "disabled"], disabled: true});
				else $button.attr({ id:"show_"+id });
				this.$el.append($button);
			}, this);
		},
		events: {
			'click #show_active': function() { this.switchTo('active'); },
			'click #show_all': function() { this.switchTo('all'); }
		},
		switchTo: function(view) {
			if (view == this.current) return;
			this.current = view;
			this.collection.view = view;
			this.collection.fetch();
			this.render();
		}
		
	});
	
	App.Page.Index = Backbone.Marionette.Layout.extend({
		template: _.template(
			"<h2>Activities</h2>" +
			"<div id='search'></div>" +
			"<div id='view_switcher'></div>"+
			"<div id='activities'></div>" +
			"<p><a href=\"#create\">Create new</a></p>"
		),
		regions: {
			search: "#search",
			activities: "#activities",
			switcher: "#view_switcher"
		},
		initialize: function() {
			var activities = new Activity.Collection();
			
			//Provide a view over a collection of activities 
			var listview = new Activity_List({collection: activities});

			//Provide a switcher to pick between which view is shown, linked to the same collection
			var switcher = new Activity_View_Switcher({collection: activities});

			this.on('render', function() { 
				this.activities.show(listview);
				this.switcher.show(switcher);
			});
			
			//Fetch all activities (when fetched will be caught by the enclosing view)
			activities.on('error', App.error.system);
			activities.fetch();
		}
	});
})(App);