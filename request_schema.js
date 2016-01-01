/**
 * Created by autuus on 10.5.2014.
 */
// load the things we need
var mongoose = require('mongoose');

// define the schema for our user model
var requestSchema = mongoose.Schema({
    amount: Number,
    currency: String,
    from: String,
    to: String,
    time: String,
    expires: String
});

module.exports = mongoose.model('Request', requestSchema);