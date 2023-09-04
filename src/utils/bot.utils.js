const { group } = require('console');
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
function getGroupId(ctx) {
  return ctx.chat.id;
}
async function getLatestGame(ctx) {
  const userId = getUserId(ctx);
  const [latestGame] = await Game.find()?.sort({ createdAt: -1 }).limit(1);
  return latestGame;
}
async function updateGame(ctx, property, value) {
  const latestGame = await getLatestGame(ctx);
  // console.log(latestGame);
  latestGame[property] = value;
  const updatedGame = await latestGame.save();
  return updatedGame;
}
async function checkInScene(ctx) {
  const latestGame = await getLatestGame(ctx);
  // console.log(latestGame);
  const isInScene = latestGame?.inScene;
  return isInScene;
}
async function gameEnded(ctx, outcome) {
  const userId = getUserId(ctx);
  await updateGame(ctx, 'outcome', outcome);
  await updateGame(ctx, 'playerId', userId);
  const gameEnded = await updateGame(ctx, 'inScene', false);
  ctx.scene.leave('guessOddOrEvenGame');
  return gameEnded;
}
async function checkBotStartedBefore(ctx) {
  const userId = getUserId(ctx);
  const [latestGame] = await Game.find({ creatorId: userId })?.sort({
    createdAt: -1
  });
  if (latestGame.length === 0 || !latestGame) {
    return ctx.reply('Please chat with this bot so we can send you messages');
  }
}
async function getGroupIdDB(ctx) {
  const latestGame = await getLatestGame(ctx);
  console.log(latestGame);
  const groupId = latestGame?.groupId;
  return groupId;
}

async function stats(ctx) {
  const groupId = getGroupId(ctx);
  const allGames = await Game.find({ groupId: groupId, isScene: false })?.sort({
    createdAt: -1
  });
  console.log(allGames);
  const noOfGamesPlayed = allGames.length;
  // });
  const ranking = [];
  const leaderboard = allGames.forEach((game) => {
    const { playerId } = game;
    ranking?.forEach((count) => {
      if (playerId === count?.playerId) {
        count[`won`]++;
      } else {
        count.playerId = playerId;
        count[`won`] = 1;
      }
    });
  });
  console.log(noOfGamesPlayed, ranking);
}
module.exports = {
  checkChatType,
  validateRange,
  getUserId,
  getGroupId,
  getLatestGame,
  updateGame,
  checkInScene,
  gameEnded,
  checkBotStartedBefore,
  getGroupIdDB,
  stats
};
