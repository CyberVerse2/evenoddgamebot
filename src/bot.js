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
const createRangeScene = new Scenes.WizardScene('createRangeScene');
// const createGuessScene = new Scenes.WizardScene('createGuessScene',
  
// );
// const guessOddOrEvenScene = new Scenes.WizardScene('guessOddOrEvenScene');
// adding it to a stage(stage => multiple scenes)
const stage = new Scenes.Stage([gameScene]);
// storing scene in session
bot.use(session());
bot.use(stage.middleware());

bot.start(async (ctx) => {
  if (!checkInScene(ctx)) {
    ctx.reply('You cannot join a canceled game. Create a new game');
  }
  const text = ctx.message.text;
  const messageArr = text.split(' ');
  console.log(messageArr);
  let number = messageArr.filter((num) => num !== ''); // removing all spaces from the text
  if (!number[1]) {
    // checking if there is something after the command
    return ctx.reply(`Number isn't specified`);
  }
  number.shift(); // removing the command
  [number] = number;
  number = parseInt(number);
  console.log(number);

  if (isNaN(number)) {
    // checking if the command has any text after it
    return ctx.reply(
      'Message format should be /start number(Number must be within range specified)'
    );
  }

  const inScene = checkInScene(ctx);

  if (!(checkChatType(ctx) && inScene)) {
    //checking if a chat is private or group and there is an ongoing conversation in the group
    return ctx.reply(
      "Access Denied. This user hasn't started a conversation in group chat"
    );
  }

  const { range } = await getLatestGame(ctx);
  if (!range) throw new Error('Range no dey fr dis db sha');
  const isWithinRange = range[0] <= number && range[1] >= number ? true : false; // checking if the number is within range

  if (isWithinRange) {
    const updatedGame = await updateGame(ctx, 'chosenNumber', number);
    console.log(updatedGame);
    return ctx.reply(`Your number is ${number}`);
  } else {
    return ctx.reply(
      `The number ${number} is not within the range you specified`
    );
  }
});

bot.help((ctx) => {
  ctx.reply(`
  This bot can perform the following commands:
  /start - Start the bot(accessible only in private chat)
  /create - Create a new game
  /guess - guess if a number is even or odd
  `);
});

bot.command('create', async (ctx) => {
  if (!checkInScene(ctx)) {
    ctx.reply('You cannot join a canceled game. Create a new game');
  }
  const userId = getUserId(ctx);
  ctx.scene.enter('gameScene');
  ctx.scene.session.isInScene = true;
  console.log(ctx.scene.session);

  const text = ctx.message.text;
  console.log(text);

  const range = text.split(' ');
  console.log(range);

  const newRange = range.filter((num) => num !== ''); // removing all spaces from the text

  if (!newRange[1]) {
    // checking if the command does not have any number after it
    return ctx.reply(
      'Message format should be /create lowestNumber highestNumber'
    );
  }
  newRange.shift(); // removing the command

  const isNumber = validateRange(newRange, ctx); // checkcing if the range is a number or NaN

  if (!isNumber) {
    return ctx.reply('The range has to be a number');
  }

  const lowRange = newRange[0];
  const highRange = newRange[1];

  if (!checkChatType(ctx)) {
    try {
      const newGame = await new Game({
        creatorId: userId,
        range: newRange,
        inScene: ctx.scene.session.isInScene
      });
      newGame.save();
      console.log(newGame);

      const gameOptions = Markup.inlineKeyboard([
        Markup.button.callback('join', 'join'),
        Markup.button.callback('cancel', 'cancel')
      ]);
      ctx.reply(
        `The lowest number is ${lowRange} and the highest number is ${highRange}`,
        gameOptions
      );
    } catch (error) {
      throw new Error(error);
    }
  } else {
    return ctx.reply('You cannot create a new game in a private chat');
  }
});
gameScene.hears()
bot.command('guess', async (ctx) => {
  if (!checkInScene(ctx)) {
    ctx.reply('You cannot join a canceled game. Create a new game');
  }
  const text = ctx.message.text;
  const messageArr = text.split(' ');
  console.log(messageArr);

  let words = messageArr.filter((word) => word !== ''); // removing all spaces from the text
  if (!words[1]) {
    // checking if the command has any text after it
    return ctx.reply("Even or odd isn't specified");
  }
  words.shift(); // removing the command
  [statement] = words;
  console.log(statement);

  if (!statement) {
    // checking if the statement is undefined or null
    return ctx.reply('Message format should be /guess even or odd');
  }
  if (checkChatType(ctx)) {
    return ctx.reply(
      "Access denied. As the game initiator, you aren't allowed to guess the answer(since you already know it)"
    );
  }
  const { chosenNumber } = await getLatestGame(ctx);

  if (!chosenNumber) throw new Error('Chosen Number no dey');

  const isEven = chosenNumber % 2 === 0;
  const isOdd = chosenNumber % 2 === 1;
  console.log(`isOdd: ${isOdd}, isEven: ${isEven}`);
  if (isEven && statement === 'even') {
    return ctx.reply('The number is even. You won');
  } else if (isEven && statement === 'odd') {
    return ctx.reply('The number is even. You lost');
  }
  if (isOdd && statement === 'odd') {
    return ctx.reply('The number is odd. You won');
  } else if (isOdd && statement === 'even') {
    return ctx.reply('The number is odd. You lost');
  }
});

bot.action('join', async (ctx) => {
  if (!checkInScene(ctx)) {
    ctx.reply('You cannot join a canceled game. Create a new game');
  }
  const userId = getUserId(ctx);
  const latestGame = await getLatestGame(ctx, Game);
  const latestScene = latestGame.inScene;
  console.log(latestScene);
  if (!latestScene) {
    ctx.reply('You cannot join a canceled game. Create a new game');
  } else {
    ctx.telegram.sendMessage(
      userId,
      'send the /start command to make your secret guess'
    );
  }
});

bot.action('cancel', async (ctx) => {
  if (!checkInScene(ctx)) {
    ctx.reply('You cannot join a canceled game. Create a new game');
  }
  const latestGame = await getLatestGame(ctx, Game);
  // console.log(latestGame);

  if (!latestGame) return ctx.reply('You are not currently in a game');
  const isInScene = latestGame.inScene;
  if (isInScene) {
    const endedGame = await updateGame(ctx, 'inScene', false);
    console.log(endedGame);
    // console.log(latestGame);
    ctx.scene.leave();
    ctx.reply('You have canceled the game');
  }
});

bot.launch();
