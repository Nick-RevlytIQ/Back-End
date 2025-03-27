const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String }, // No hashing, stored as plain text
  phoneNo: { type: String },
  googleId: { type: String },
  subscription: { type: String, enum: ['none', 'silver', 'gold', 'diamond'], default: 'none' }
});

module.exports = mongoose.model('User', userSchema);
