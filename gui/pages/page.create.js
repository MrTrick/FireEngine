/**
 * 
 */
(function(App) {
	if (!App) throw "No App defined";
	if (!App.Page) App.Page = {};
	
	//View: Collection of designs
	var Design_List = Backbone.Marionette.CompositeView.extend({
		tagName: 'table',
		className: 'table',
		template: _.template('<thead><tr><th>Design</th><th> </th></thead><tbody></tbody>'),
		itemViewContainer: 'tbody',
		itemView: Backbone.Marionette.ItemView.extend({
			tagName: 'tr',
			template: _.template('<td><a id="create" href="#">{{ name }}</a></td>'+
				'<td><a id="diagram_toggle" href="#">Show diagram</a><div style="display:none;" id="diagram_content"><img src="{{ graph_url }}" /></div></td>'
			),
			templateHelpers: function() {
				return { graph_url: this.model.url() + '/graph' };
			},
			events: {
				"click #create": 'create',
				"click #diagram_content,#diagram_toggle": 'toggle'
			},
			create: function(e) {
				e.preventDefault();
				App.main.show(new App.Page.Prep({action:this.model.action('create')}));
			},
			toggle: function(e) {
				e.preventDefault();
				this.$('#diagram_content,#diagram_toggle').slideToggle(500);
			}
		}),
		emptyView: Backbone.Marionette.ItemView.extend({ tagName: 'tr', template: _.template("<td colspan=2><i>Loading...</i></td>") }),
		
		//Display only permitted actions
		//TODO: Same code as in page.view.js. Merge? Not quite the same - collection is designs. 
		showCollection: function(){
			var that = this;
			var ItemView;
			
			//Add each _permitted_ action.
			this.collection.each(function(item, index){
				if (item.action('create').allowed(App.context)) {
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
	
	App.Page.Create = Backbone.Marionette.Layout.extend({
		template: _.template(
			"<h2>Create new Activity</h2>" +
			"<div id='designs'></div>" +
			"<hr>" +			
			"<p><a href=\"#\">Back</a></p>"
		),
		regions: {
			designs: "#designs"
		},
		initialize: function() {
			//Fetch all designs
			var designs = new Activity.Design.Collection();
			designs.on('error', App.error.system);
			designs.fetch();
			
			//Render them into a list within the page
			var listview = new Design_List({collection:designs});
			this.on('render', function() { this.designs.show(listview); }); //Wait until the parent is rendered
		}
	});
})(App);