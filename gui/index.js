/**
 * 
 */
//Configure!
Activity.baseUrl(settings.serverUrl);


var Debug = {};
Debug.View = Backbone.View.extend({
	tagName:'pre',
	render:function() {
		var object = this.model || this.collection;
		this.$el.text( JSON.stringify(object.toJSON ? object.toJSON() : object,null,"\t") );
	} 
});

App.addRegions({
	main: "#main",
	alerts: "#alerts"
});

App.router = new (Backbone.Router.extend({
	routes: {
		"" : "index",
		"activities/:id" : "view",
		"create" : "create"
	},
	index: function() { App.main.show(new App.Page.Index()); },
	view: function(id) { App.main.show(new App.Page.View({id:id})); },
	create: function() { App.main.show(new App.Page.Create()); }
}))();




$(function() {
	App.start(); 
	Backbone.history.start();
	
	App.alerts.show(FlashManager);
});