require('dotenv').config();

const { Telegraf, Markup, Scenes, session } = require('telegraf');

const {
  checkChatType,
  getUserId,
  getGroupId,
  getLatestGame,
  updateGame,
  checkInScene,
  gameEnded,
  checkBotStartedBefore,
  getGroupIdDB,
  stats
} = require('./utils/bot.utils');
const Game = require('./models/game.model');
const { mongoConnect } = require('./configs/mongo.config');

mongoConnect(); // connect mongodb database

const bot = new Telegraf(process.env.BOT_API_KEY);
// creating a scene to store the current conversation and exit the scene when the user presses the cancel button
const gameScene = new Scenes.BaseScene('gameScene');
// creating a scene for when the user creates a guess based on range
const createGuessScene = new Scenes.BaseScene('createGuessScene');
// creating a scene for when the user tries to guess whether the number is odd or even
const guessOddOrEvenScene = new Scenes.BaseScene('guessOddOrEvenScene');

// adding it to a stage(stage => multiple scenes)
const stage = new Scenes.Stage([
  gameScene,
  createGuessScene,
  guessOddOrEvenScene
]);
// storing scene in session
bot.use(session());
bot.use(stage.middleware());

bot.help((ctx) => {
  ctx.reply(`
  This bot can perform the following commands:
  /start - Start the bot(accessible only in private chat)
  /create - Create a new game
  /createguess- Create a new guess
  /guess - guess if a number is even or odd


  `);
});

bot.command('create', async (ctx) => {
  await checkBotStartedBefore(ctx); // check if bot has been started before
  ctx.scene.enter('gameScene'); // Enter the "nameScene" when the /start command is used
  if (checkChatType(ctx)) {
    return ctx.reply(
      'You cannot create a new game in a private chat. Please chat in a group...'
    );
  }
  const userId = getUserId(ctx);
  const ongoingGame = await getLatestGame(ctx);
  if (
    (userId === ongoingGame?.creatorId && ongoingGame?.inScene) ||
    (userId !== ongoingGame?.creatorId && ongoingGame?.inScene)
  ) {
    //checking if a user or game creator wants to create a new game while a game is ongoing
    return ctx.reply(
      'You cannot create a new game while a game is still ongoing'
    );
  }

  return ctx.reply('What is your range? eg 2, 5');
});

const regexPattern = /^\d{1,2},\d{1,2}$/; // for matching a range eg 2,4
gameScene.hears(regexPattern, async (ctx) => {
  if (checkChatType(ctx)) {
    return ctx.reply(
      'You cannot create a new game in a private chat. Please chat in a group...'
    );
  }

  const userId = getUserId(ctx);
  const groupId = getGroupId(ctx);

  const text = ctx.message.text;
  // console.log(text);

  if (!text)
    return ctx.reply('You need to add a number to specify a range. Try again');

  const range = text.split(',');
  const newRange = range // removing any empty string and checking if there is the number is not NaN and then changing the string numbers to numbers
    .filter((num) => {
      const newNum = parseInt(num);
      return num !== '' && isNaN(newNum) === false;
    })
    .map((num) => {
      const newNum = parseInt(num);
      return newNum;
    }); // removing all spaces from the text and checking if the text is not a number
  // console.log(range, newRange);
  if (!newRange[1]) {
    // checking if the command does not have any number after it
    return ctx.reply(
      'Message format should be lowestNumber,highestNumber. Try again'
    );
  }
  try {
    const newGame = await new Game({
      creatorId: userId,
      groupId: groupId,
      range: newRange,
      inScene: true
    });
    newGame.save();
    // console.log(newGame);
  } catch (error) {
    throw new Error(error);
  }
  const gameOptions = Markup.inlineKeyboard([
    Markup.button.callback('join', 'join'),
    Markup.button.callback('cancel', 'cancel')
  ]);
  return ctx.reply(
    `The lowest number is ${newRange[0]} and the highest number is ${newRange[1]}`,
    gameOptions
  );
});
bot.action('join', async (ctx) => {
  await checkBotStartedBefore(ctx);
  const userId = getUserId(ctx);
  const ongoingGame = await getLatestGame(ctx);
  // console.log(ongoingGame);
  const creatorId = ongoingGame?.creatorId;
  // console.log(
  //   `userId:${userId}, creatorId:${creatorId}, inScene:${ongoingGame.inScene}`
  // );
  if (userId !== creatorId && ongoingGame?.inScene) {
    //checking if a user that is not the creator wants to create a guess
    // console.log('shege')
    return ctx.reply(
      "You cannot join a game you didn't create to make a secret guess."
    );
  }
  const inScene = await checkInScene(ctx);

  if (!inScene) {
    // checking if the latest game is still ongoing
    return ctx.reply('You cannot join an ended game. Create a new game');
  }
  await ctx.reply('Wait for the game creator to make a guess...');
  ctx.telegram.sendMessage(
    userId,
    'send the /createguess command to make your secret guess'
  ); // sending the game creator a dm
  ctx.scene.leave('gameScene'); // game scene has ended
  // console.log(ctx.scene.state, 'shege');
});

bot.action('cancel', async (ctx) => {
  const userId = getUserId(ctx);
  const ongoingGame = await getLatestGame(ctx);
  // console.log(ongoingGame);
  const creatorId = ongoingGame?.creatorId;
  // console.log(
  //   `userId:${userId}, creatorId:${creatorId}, inScene:${ongoingGame.inScene}`
  // );
  if (userId !== creatorId && ongoingGame?.inScene) {
    // checking if the user that is not the game creator wants to cancel a game
    // console.log('shege')
    return ctx.reply("You cannot cancel a game you didn't create.");
  }
  const inScene = await checkInScene(ctx);

  if (!inScene) {
    // checking if the game is completed
    return ctx.reply(
      'You cannot cancel a canceled/completed game. Create a new game'
    );
  } else {
    // if (!latestGame) return ctx.reply('You are not currently in a game');
    const endedGame = await updateGame(ctx, 'inScene', false);
    // console.log(endedGame);
    // console.log(latestGame);
    ctx.scene.leave('gameScene');
    return ctx.reply('You have canceled the game');
  }
});
bot.start((ctx) => {
  ctx.reply('Welcome to the bot!');
});

bot.command('createguess', async (ctx) => {
  const inScene = await checkInScene(ctx);
  if (!checkChatType(ctx))
    // checking if user is in a group
    return ctx.reply('You cannot create a new guess in a group');
  if (!inScene) {
    //checking if the game is ended
    return ctx.reply('You cannot join an ended game. Create a new game');
  }
  ctx.scene.enter('createGuessScene');
  return ctx.reply('What is your secret guess? eg. 2');
});

const guessPattern = /^\d{1,2}$/; //pattern for matching a single or double digit number

createGuessScene.hears(guessPattern, async (ctx) => {
  const text = ctx.message.text;
  const username = ctx.from.username;
  const message = text.trim(); // removing all spaces from the text
  // console.log(message);

  const number = parseInt(message);
  if (!number) {
    // checking if the reply exists
    return ctx.reply(`Number isn't specified`);
  }
  // console.log(number);

  if (isNaN(number)) {
    // checking if the number is a text
    return ctx.reply(
      'Message format should be number(Number must be within range specified)'
    );
  }

  const inScene = await checkInScene(ctx);

  if (!(checkChatType(ctx) && inScene)) {
    //checking if a chat is private or group and there is an ongoing game in the group
    return ctx.reply(
      "Access Denied. This user hasn't started a conversation in group chat"
    );
  }

  const groupId = await getGroupIdDB(ctx); // getting group id from db
  bot.telegram.sendChatAction(groupId, 'typing'); // sending a typing message showing that the user is typing the command
  const latestGame = await getLatestGame(ctx);
  // console.log(latestGame);
  const range = latestGame?.range;
  if (!range) throw new Error('Range no dey fr dis db sha'); // checking if range is in the db
  const isWithinRange = range[0] <= number && range[1] >= number ? true : false; // checking if the number is within range

  if (isWithinRange) {
    const updatedGame = await updateGame(ctx, 'chosenNumber', number);
    // console.log(updatedGame);
    ctx.scene.leave('createGuessScene'); //creating guess scene ended
    if (username) {
      // checking if there is a username because sometimes a user wouldn't have a username
      bot.telegram.sendMessage(groupId, `${username} has made a secret guess.`);
    }

    ctx.reply(`Your secret guess is ${number}`);
  } else {
    return ctx.reply(
      `The number ${number} is not within the range you specified`
    );
  }
});

bot.command('guess', async (ctx) => {
  if (checkChatType(ctx)) {
    // checking if user is in a private chat
    return ctx.reply('Access denied. You cannot guess in a private chat');
  }
  const userId = await getUserId(ctx);
  const latestGame = await getLatestGame(ctx);
  const creatorId = latestGame?.creatorId;
  const chosenNumber = latestGame?.chosenNumber; // getting chosenNumber to check if game creator has made guess
  if (userId === creatorId) {
    return ctx.reply(
      "Access denied. As the game initiator, you aren't allowed to guess the answer(since you already know it)"
    );
  }
  if (!chosenNumber) {
    // checking if there is a chosen number
    return ctx.reply("The game initiator hasn't made a guess.");
  }
  const inScene = await checkInScene(ctx);

  if (!inScene) {
    // checking if the game is ended
    return ctx.reply('You cannot join an ended game. Create a new game');
  }
  ctx.scene.enter('guessOddOrEvenScene'); // entering guess odd or even scene
  return ctx.reply('What is your answer? eg. odd or even');
});

const oddOrEvenPattern = /^(even|odd)$/i; // pattern to match even or odd string

guessOddOrEvenScene.hears(oddOrEvenPattern, async (ctx) => {
  if (checkChatType(ctx)) {
    return ctx.reply('Access denied. You cannot guess in a private chat');
  }

  const userId = await getUserId(ctx);
  const { creatorId } = await getLatestGame(ctx);
  if (userId === creatorId) {
    // checking if its the creator that is trying to guess their own guess
    return ctx.reply(
      "Access denied. As the game initiator, you aren't allowed to guess the answer(since you already know it)"
    );
  }

  if (!checkInScene(ctx)) {
    // checking if game is ended
    ctx.reply('You cannot join an ended game. Create a new game');
  }

  const text = ctx.message.text;
  const message = text.trim();
  // console.log(message)
  const { chosenNumber } = await getLatestGame(ctx);

  if (!chosenNumber) throw new Error('Chosen Number no dey'); // checking if there is a chosen number

  const isEven = chosenNumber % 2 === 0;
  const isOdd = chosenNumber % 2 === 1;
  // console.log(`isOdd: ${isOdd}, isEven: ${isEven}`);
  if (isEven && message === 'even') {
    await gameEnded(ctx, 'player won');
    return ctx.reply('The number is even. You won');
  } else if (isEven && message === 'odd') {
    await gameEnded(ctx, 'creator won');
    return ctx.reply('The number is even. You lost');
  }
  if (isOdd && message === 'odd') {
    await gameEnded(ctx, 'player won');
    return ctx.reply('The number is odd. You won');
  } else if (isOdd && message === 'even') {
    await gameEnded(ctx, 'creator won');
    return ctx.reply('The number is odd. You lost');
  }
});

bot.command('leaderboard', async (ctx) => {
  return ctx.reply('coming soon');
});

bot.launch();
