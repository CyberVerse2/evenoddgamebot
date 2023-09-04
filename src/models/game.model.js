const mongoose = require('mongoose');

const gameSchema = mongoose.Schema({
  creatorId: { type: Number, required: true },
  groupId: { type: Number, required: true },
  playerId: Number,
  range: [],
  chosenNumber: Number,
  outcome: String,
  inScene: Boolean,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Game = mongoose.model('gameSchema', gameSchema)

module.exports = Game