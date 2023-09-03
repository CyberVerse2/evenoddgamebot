const Game = require('../models/game.model');

function checkChatType(ctx) {
  const chatType = ctx.chat.type;
  if (chatType === 'private') {
    return true;
  } else if (chatType === 'group') {
    return false;
  }
}

function validateRange(range, ctx) {
  const isNumber = range.every((element) => {
    const newElement = parseInt(element);
    return isNaN(newElement) === false;
  });
  console.log(isNumber);
  return isNumber;
}

function getUserId(ctx) {
  return ctx.from.id;
}
async function getLatestGame(ctx) {
  const userId = getUserId(ctx);
  const [latestGame] = await Game.find({ creatorId: userId })
    .sort({ createdAt: -1 })
    .limit(1);
  return latestGame;
}
async function updateGame(ctx, property, value) {
  const latestGame = await getLatestGame(ctx);
  console.log(latestGame);
  latestGame[property] = value;
  const updatedGame = await latestGame.save();
  return updatedGame;
}
async function checkInScene(ctx) {
  const latestGame = await getLatestGame(ctx);
  console.log(latestGame)
  const isInScene = latestGame.inScene;
  return isInScene;
}
module.exports = {
  checkChatType,
  validateRange,
  getUserId,
  getLatestGame,
  updateGame,
  checkInScene
};
