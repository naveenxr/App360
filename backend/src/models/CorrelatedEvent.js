const mongoose = require('mongoose');
const Event = require('./Event');

if (!mongoose.models.CorrelatedEvent) {
  try {
    mongoose.model('CorrelatedEvent', Event.schema);
  } catch (e) {
    // Already registered
  }
}

module.exports = Event;
