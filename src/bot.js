require('dotenv').config();

const {
  getFirestore,
  doc,
  get,
  getDoc,
  getDocs
} = require('firebase/firestore');
const { Telegraf } = require('telegraf');

const app = require('./configs/firebase.config');
const { checkChatType, validateRange } = require('./utils/bot.utils');

const db = getFirestore(app);
const bot = new Telegraf(process.env.BOT_API_KEY);

const game = doc(db, 'game/wscAOGkHyhjPmMzqqgwk');

//start the bot
bot.start((ctx) => {
  if (checkChatType(ctx)) {
    ctx.reply('make your guess');
  } else {
    ctx.reply('Access Denied');
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

bot.command('create', (ctx) => {
  const hasReplied = false
  const text = ctx.message.text;
  const range = text.split(' ');
  range.shift();
  console.log(`${typeof range} shege`);
  if (!range[1]) {
    return ctx.reply(
      'Message format should be /create lowestNumber highestNumber'
    );
  }
  validateRange(range, ctx);
  const lowRange = range[0];
  const highRange = range[1];
});

bot.launch();

// async function readDoc() {
//   const snapshot = await getDoc(game);
//   if (snapshot.exists()) {
//     const docData = snapshot.data();
//     console.log(`${JSON.stringify(docData)}`);
//     return docData;
//   }
// }
// readDoc();
