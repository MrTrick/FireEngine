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
 * Defines the design document for the FireEngine database
 * To upload to couchdb, eg;
 *  `couchapp push couchapp/couchapp.js http://ADMINUSER:PASSWORD@localhost:5984/fireengine`
 */

var couchapp = require('couchapp');
var path = require('path');

ddoc = { 
    _id: '_design/fireengine'
};

ddoc.views = {};
ddoc.views.by_design = {
	map: function(doc) { emit(doc.design.id || doc.design, null); },
	reduce: '_count'
};

//All activities (For now, assume that having a 'design' designates a document being an activity)
ddoc.views.all = {
	map: function(doc) { if (doc.design) emit(doc._id, null); },
	reduce: '_count'
};

//Activities not in a closed state (For now, assume that having a 'design' designates a document being an activity)
ddoc.views.active = {
	map: function(doc) { if (doc.design && doc.state && doc.state.indexOf('closed') == -1) emit(doc._id, null); },
	reduce: '_count'
};

ddoc.validate_doc_update = function (newDoc, oldDoc, userCtx) {   
  if (newDoc._deleted === true && userCtx.roles.indexOf('_admin') === -1) {
    throw "Only admin can delete documents on this database.";
  } 
};

//Might be useful. Later! (for running the gui without needing apache, perhaps)
//Not using couch as a web server (yet)
/*ddoc.rewrites = [ 
    {from:"/", to:'index.html'},
    {from:"/api", to:'../../'},
    {from:"/api/*", to:'../../*'},
    {from:"/*", to:'*'}
];
couchapp.loadAttachments(ddoc, path.join(__dirname, 'attachments'));
*/

module.exports = ddoc;
