var router = require('express').Router();

// split up route handling
router.use('/', require('./append_attribute_key.controller'))

module.exports = router;