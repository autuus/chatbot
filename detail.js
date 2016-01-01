/**
 * Created by autuus on 10.5.2014.
 */
// load the things we need
var mongoose = require('mongoose');

// define the schema for our user model
var detailSchema = mongoose.Schema({
    user: String,
    fullname: String,
    address: String,
    phone_number: String,
    bank_account_number: String,
    bic: String,
    bank_name: String,
    fimk_address: String,
    btc_address: String,
    email_confirmed: Boolean,
    phone_confirmed: Boolean
});

module.exports = mongoose.model('Detail', detailSchema);