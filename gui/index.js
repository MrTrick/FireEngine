/**
 * 
 */
//Configure!
Activity.baseUrl(settings.serverUrl);
User.baseUrl(settings.serverUrl);
App.context = settings.environment;
var session = Auth.startSession({
	loginUrl: Activity.baseUrl()+'auth/login',
	logoutUrl: Activity.baseUrl()+'auth/logout'
});
App.user = App.context.user = Auth.user;

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
	alerts: "#alerts",
	session: "#session"
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
	App.session.show(Auth.sessionView);
	App.alerts.show(FlashManager);
});