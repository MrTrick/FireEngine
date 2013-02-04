/*
 * FireEngine - Javascript Activity Engine 
 * 
 * @license Simplified BSD
 * Copyright (c) 2013, Patrick Barnes
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * 
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *    
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * Alert Manager
 * Sits somewhere in the site layout and contains/manages alerts 
 */
var FlashManager = new (Backbone.Marionette.CollectionView.extend({ 
	tagName: 'ul',
	attributes: {style:'list-style-type:none; margin:0'},
	itemView: Backbone.Marionette.ItemView.extend({
		tagName: 'li',
		template: _.template(
			"<div class=\"alert alert-{{ type }}\">\n"+
			"  <button type=\"button\" class=\"close\" data-dismiss=\"alert\">&times;</button>\n"+
			"  <strong>{{ title }}:</strong> {{ message }}"+
			"</div>"
		),
		events: { "close": "close_handler" },
		close_handler: function() { this.model.collection.remove(this.model); },
		initialize: function() {
			_.bindAll(this, "close_handler");
			
			//If specified, only keep the alert open for a certain time
			var lifetime = this.model.attributes.lifetime;
			if (lifetime) {
				this.on("render", function() { 
					this.$el.delay(lifetime).slideUp(500, this.close_handler); 
				});
			};
			
			//TODO: Use slideDown to animate more smoothly on display
		}
	}),
	itemModel: Backbone.Model.extend({defaults:{lifetime:5000}}),
	addAlert: function(type, title, msg, lifetime) {
		//If called as function(type, msg), use the 2nd arg as message.
		if (arguments.length == 2) {
			msg = title;
			title = type.charAt(0).toUpperCase()+type.substring(1); //ucfirst
		}
		this.collection.add(new this.itemModel({type:type, title:title, message:msg, lifetime:lifetime}));
	},

	initialize: function() {
		this.success = _.bind(this.addAlert, this, 'success');
		this.error = _.bind(this.addAlert, this, 'error');
		this.info = _.bind(this.addAlert, this, 'info');
		//TODO: Add support for block?
		//TODO: Add support for 'warn'?
	}
}))({collection: new Backbone.Collection()});
