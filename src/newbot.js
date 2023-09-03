require('dotenv').config();

const { Telegraf, Markup, Scenes, session } = require('telegraf');

const {
  checkChatType,
  validateRange,
  getUserId,
  getLatestGame,
  updateGame,
  checkInScene
} = require('./utils/bot.utils');
const Game = require('./models/game.model');
const { mongoConnect } = require('./configs/mongo.config');

mongoConnect(); // connect mongodb database

const bot = new Telegraf(process.env.BOT_API_KEY);
// creating a scene to store the current conversation and exit the scene when the user presses the cancel button
const gameScene = new Scenes.BaseScene('gameScene');
// const createRangeScene = new Scenes.WizardScene(
  //   'createRangeScene'
  //   // ask user his range
  // );
  // adding it to a stage(stage => multiple scenes)
  // const createGuessScene = new Scenes.WizardScene('createGuessScene');
  // const guessOddOrEvenScene = new Scenes.WizardScene('guessOddOrEvenScene');
  
const stage = new Scenes.Stage([gameScene]);
// storing scene in session
bot.use(session());
bot.use(stage.middleware());

bot.command('create', (ctx) => {
  ctx.scene.enter('gameScene'); // Enter the "nameScene" when the /start command is used
  return ctx.reply('What is your range? eg 2,5')
});

const regexPattern = /^\d{1,2},\d{1,2}$/;
gameScene.hears(regexPattern, async (ctx) => {
  if (!checkInScene(ctx)) {
    ctx.reply('You cannot join a canceled game. Create a new game');
  }
  const userId = getUserId(ctx);
  const text = ctx.message.text;
  console.log(text);

  if (!text) return ctx.reply('You need to add a number to specify a range');
  const range = text.split(',');
  const newRange = range.filter((num) => {
    const newNum = parseInt(num);
    return num !== '' && isNaN(newNum) !== false;
  }); // removing all spaces from the text and checking if the text is not a number
  console.log(range, newRange)
  if (!newRange[1]) {
    // checking if the command does not have any number after it
    return ctx.reply('Message format should be lowestNumber,highestNumber');
  }
  ctx.reply(newRange)
});


bot.launch();
