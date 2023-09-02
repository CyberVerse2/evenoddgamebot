function checkChatType(ctx) {
  const chatType = ctx.chat.type;
  if (chatType === 'private') {
    return true;
  } else if (chatType === 'group') {
    return false;
  }
}

function validateRange(range, ctx, hasReplied) {
  const isNumber = range.every((element) => {
    const newElement = parseInt(element);
    return isNaN(newElement) === false;
  });
  console.log(isNumber);
  if (!isNumber && range.length <=3) {
    return ctx.reply('The range has to be a number');
  }
  if (!checkChatType(ctx)) {
    return ctx.reply(`Lowrange: ${lowRange} highRange: ${highRange}`);
  } else {
    return ctx.reply('You cannot create a new game in a private chat');
  }
}

module.exports = {
  checkChatType,
  validateRange
};
