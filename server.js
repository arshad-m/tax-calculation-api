// call the packages we need
var express		= require('express');        // call express
var app			= express();                 // define our app using express
var bodyParser	= require('body-parser');
var morgan		= require('morgan');
var Tax			= require('./tax')

// configure app
app.use(morgan('dev')); // log requests to the console

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// set our port
var port = 8080;

// get an instance of the express Router
var router = express.Router();

// test route to make sure everything is working
router.get('/', function(req, res) {
    res.json({ message: 'hooray! welcome to our api!' });
});

// create a bear (accessed at POST http://localhost:8080/bears)
router.post('/tax', function(req, res) {
    var taxCalc = new Tax(req.body.form_fields);
    let details = taxCalc.getTaxableValue();
    res.json({ details: details, message: 'Tax Calulated' });
});


// register aur routes
// all of our routes will be prefixed with /api
app.use('/api', router);

// strat the server
app.listen(port);
console.log('Magic happens on port ' + port);