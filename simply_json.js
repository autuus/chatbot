var fs = require('fs');

function db(db_file) {
    var self = this;
    self.db_file = db_file;
    self.o = {};

    self.save = function() {
        //console.log('saving '+JSON.stringify(self.o));
        fs.writeFile("./"+self.db_file+".json", JSON.stringify(self.o, null, 4), function(err) {
            if(err) {
                console.log(err);
            } else {

            }
        });
    };


    self.load = function() {
        fs.readFile('./'+self.db_file+'.json', 'utf8', function (err,data) {
            if (err) {
                return console.log(err);
            }
            self.o = JSON.parse(data);
            //console.log('loading '+JSON.stringify(self.o));
        });
    };

    self.load();

    self.get = function(id) {
        //console.log('getting '+JSON.stringify(self.o));
        if (!self.o[id]) { return false }
        return self.o[id];
    };
    
    self.getAll = function() {
        //console.log('getting '+JSON.stringify(self.o));
        return self.o;
    };

    self.set = function(id, data) {
        //console.log('before '+JSON.stringify(self.o));
        //console.log('data '+JSON.stringify(data));
        self.o[id] = merge_objects(self.o[id], data);
        //console.log('after '+JSON.stringify(self.o));
        self.save();
    };

    self.del = function(id) {
        delete(self.o[id]);
        self.save();
    };

    return self;
};

/**
 * Overwrites obj1's values with obj2's and adds obj2's if non existent in obj1
 * @param original
 * @param overwrite
 * @returns obj3 a new object based on obj1 and obj2
 */
function merge_objects(original, overwrite){
    var output = {};
    for (var attrname in original) { output[attrname] = original[attrname]; }
    for (var attrname in overwrite) { output[attrname] = overwrite[attrname]; }
    return output;
}

module.exports = db;