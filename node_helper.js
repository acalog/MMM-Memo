/* Magic Mirror
 * Module: MMM-Memo
 *
 * By Schnibel @schnibel
 * March 2017
 * MIT Licensed.
 *
 */

const NodeHelper = require("node_helper");
const url = require("url");
const fs = require("fs");

module.exports = NodeHelper.create({
	
	start: function() {
		this.expressApp.get('/AddMemo', (req, res) => {

			var query = url.parse(req.url, true).query;
			var level = query.level;
			var memoTitle = query.memoTitle;
			var item = query.item;

            if (typeof level === "undefined") {
                level = "INFO";
                console.log("automatically set level to INFO");
            }

			if (memoTitle == null && item == null && level == null) {
				res.send({"status": "failed", "error": "No 'memoTitle', 'level' and 'item' given."});
			}
			else if (memoTitle == null) {
				res.send({"status": "failed", "error": "No 'memoTitle' given."});
			}
			else if (item == null){
				res.send({"status": "failed", "error": "No 'item' given."});
			}
			else if (level == null) {
				res.send({"status": "failed", "error": "No 'level' given."});
			}
			else {
				this.refreshMemosFromFile();
				var new_item = {"memoTitle": memoTitle.toLowerCase(), "level": level, "item": item, "timestamp": new Date()};
				res.send({"status": "success", "item": new_item});
				this.sendSocketNotification("ADD", new_item);
				this.storeMemos(new_item);
			}
		}),

		this.expressApp.get('/RemoveMemo', (req, res) => {

			var query = url.parse(req.url, true).query;
			var memoTitle = query.memoTitle;
			var item = query.item;

			if (memoTitle == null && item == null){
				res.send({"status": "failed", "error": "No 'memoTitle' and 'item' given."});
			}
			else if (memoTitle == null) {
				res.send({"status": "failed", "error": "No 'memoTitle' given."});
			}
			else if (item == null) {
				res.send({"status": "failed", "error": "No 'item' given."});
			}
			else {
				this.refreshMemosFromFile();
				var old_item = {"memoTitle": memoTitle.toLowerCase(), "item": item};
				res.send({"status": "success", "payload": old_item});
			    this.removeMemos(old_item);
				this.sendSocketNotification("INIT", this.memos);
			}
		});

		this.expressApp.get('/DisplayMemo', (req, res) => {

			var query = url.parse(req.url, true).query;
			var memoTitle = query.memoTitle;
			var item = query.item;

			if (memoTitle == null && item == null){
				res.send({"status": "failed", "error": "No 'memoTitle' and 'item' given."});
			}
			else if (memoTitle == null) {
				res.send({"status": "failed", "error": "No 'memoTitle' given."});
			}
			else if (item == null) {
				res.send({"status": "failed", "error": "No 'item' given."});
			}
			else {
				this.refreshMemosFromFile();
				var display_item = {"memoTitle": memoTitle.toLowerCase(), "item": item};
				res.send({"status": "success", "payload": display_item});
			    this.displayMemos(display_item);
			}
		});
	},
	
	socketNotificationReceived: function(notification, payload) {

		if(notification === "LOAD_MEMOS"){
		    this.memoTitle = payload.memoTitle.toLowerCase();
			this.memoMaxItems = payload.memoMaxItems;
			this.memoFilename = payload.memoFilename;
			console.log("MMM-Memo using memo file: '" + this.memoFilename + "'");
			this.loadMemos();
		}
	},

	storeMemos: function(item){
		this.memos.push(item);
		this.writeMemosToFile();
	},


	loadMemos: function(){
		this.refreshMemosFromFile();
		this.sendSocketNotification("INIT", this.memos);
    	},

    removeMemos: function(old_item){

        var j = 0;
        for (var i = this.memos.length - 1; i >= 0; i--) {
            if (this.memos[i].memoTitle.toLowerCase() == old_item.memoTitle.toLowerCase()) {
                if (old_item.item == 'ALL') this.memos.splice(i, 1);
                else {
                    j = j+1;
                    if (j == old_item.item) this.memos.splice(i, 1);
                }
            }
        }

        if (j == 0) console.log("The memoTitle '"+old_item.memoTitle.toLowerCase()+"' doesn't exist");
        this.writeMemosToFile();
    },

    displayMemos: function(item){

        // Create a temporary array to deal with expected memos
	    var tempMemos = [];
	    for (var i = 0; i < this.memos.length ; i++ ) {
	        if (this.memos[i].memoTitle.toLowerCase() == item.memoTitle.toLowerCase()) {
	            tempMemos.push(this.memos[i]);
	        }
	    }

        var j = 0;

        // If ALL is specified, send the whole array
        if (item.item == 'ALL') {
            j = -1;
            this.sendSocketNotification("DISPLAY", tempMemos);
        }
        // else, find the expected item
        else {
            for (var i = tempMemos.length - 1; i >= 0; i--) {
                    j = j+1;
                    if (j == item.item) this.sendSocketNotification("DISPLAY", tempMemos[i]);
            }
        }
        if (j == 0) console.log("The memoTitle '"+item.memoTitle.toLowerCase()+"' doesn't exist");
    },

	fileExists: function(path){
		try {
			return fs.statSync(path).isFile();
		} catch(e) {
			return false;
		}
	},

	refreshMemosFromFile: function() {
		if (!this.fileExists(this.memoFilename)) {
			this.memos = [];
			return;
		}

		try {
			var content = JSON.parse(fs.readFileSync(this.memoFilename, 'utf8'));
			this.memos = Array.isArray(content.memos) ? content.memos : [];
		} catch (e) {
			console.log("Unable to parse memo file '" + this.memoFilename + "': " + e.message);
			this.memos = [];
		}
	},

	writeMemosToFile: function() {
		try {
			fs.writeFileSync(this.memoFilename, JSON.stringify({"memos": this.memos}), 'utf8');
		} catch (e) {
			console.log("Unable to write memo file '" + this.memoFilename + "': " + e.message);
		}
	}
	
});
