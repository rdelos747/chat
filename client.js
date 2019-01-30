'use strict';

const webSocket = require('websocket').client;
const readline = require('readline');
const fs = require('fs');
const colors = require('colors/safe');

// ///////////////////////////////////////////
// S E T U P
// /////////////

colors.setTheme({
  system: 'gray',
  author: ['bgCyan', 'black'],
  body: 'blue'
});

const commandPrefix = '//';

let serverAddress = 'http://localhost:8090/';
if (process.env.NODE_ENV === 'production') {
  let config = JSON.parse(fs.readFileSync('./client-config.json', 'utf8'));
  serverAddress = config.serverAddress;
}

const read = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const client = new webSocket();
client.connect(serverAddress);

// ///////////////////////////////////////////
// F A I L
// /////////////

client.on('connectFailed', error => {
  console.log(error.toString());
  console.log('You are probably not whitelisted ;)');
  read.close();
  process.exit();
});

// ///////////////////////////////////////////
// C O N N E C T (main)
// /////////////

client.on('connect', connection => {
  console.log('connected to', connection.remoteAddress);
  let nameInterval;
  let askName = true;
  let username = '';

  // ///////////////////////////////////////////
  // G E T  M E S S A G E
  // /////////////

  connection.on('message', json => {
    const message = JSON.parse(json.utf8Data);

    if (message.type === 'set name') {
      username = message.body;
      clearInterval(nameInterval);
    }
    else if (message.type === 'system' || message.author !== username) {
      writeMessage(message.type, message.body, message.author);
    }

    if (username === '') {
      askName = true;
    }
  });

  // ///////////////////////////////////////////
  // C L O S E
  // /////////////

  connection.on('close', () => {
    writeMessage('system', 'disconnected from server');
    read.close();
    process.exit();
  });

  // ///////////////////////////////////////////
  // M E S S A G E  S E R V E R
  // /////////////

  const sendMessageToServer = message => {
    if (connection.connected) {
      connection.send(JSON.stringify({message: message}));
    }
  };

  // ///////////////////////////////////////////
  // C O M M A N D  S E R V E R
  // /////////////

  const sendCommandToServer = (command, options) => {
    if (connection.connected) {
      connection.send(JSON.stringify({command: command, options: options}));
    }
  };

  // ///////////////////////////////////////////
  // W R I T E  T O  S C R E E N
  // /////////////

  const writeMessage = (type, message, author = null) => {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    console.log(formatText(type, message, author));
    read.prompt(true);
  };

  // ///////////////////////////////////////////
  // G E T  U S E R N A M E
  // /////////////

  const getUsername = () => {
    if (askName) {
      askName = false;
      read.question('enter username: ', name => {
        if (name !== '') {
          sendCommandToServer('set name', {name: name});
        }
        else {
         askName = true;
        }
      });
    }
  };
  nameInterval = setInterval(getUsername, 500);

  // ///////////////////////////////////////////
  // G E T  I N P U T
  // /////////////

  read.on('line', (line) => {
    if (!askName) {
      if (!handleCommand(line)) {
        sendMessageToServer(line);
      }
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      read.prompt(true);
    }
  });

  // ///////////////////////////////////////////
  // C O M M A N D S
  // /////////////

  const commands = {
    'help': () => {
      writeMessage('system', 'you typed help');
      writeMessage('system', 'help | show list of commands');
      writeMessage('system', 'setname <new name> | changes name if it is available');
      writeMessage('system', 'allusers | get list of all users');
    },
    'setname': (name) => {
      if (!name) {
        writeMessage('system', 'setname <new name>');
        return;
      }
      sendCommandToServer('set name', {name: name});
    },
    'allusers': () => {
      sendCommandToServer('all users');
    }
  };

  const handleCommand = (line) => {
    if (line.substr(0,2) === commandPrefix) {
      const coms = line.substring(2, line.length).split(' ');
      if (coms[0] === '') {
        commands['help']();
      }
      else if (Object.keys(commands).includes(coms[0])) {
        commands[coms[0]](...coms.slice(1));
      }
      else {
        writeMessage('system', line.substring(2, line.length) + 'is not a command :(');
      }
      return true;
    }
    return false;
  }
});

// ///////////////////////////////////////////
// H E L P E R S
// /////////////

const formatText = (type, body, author = null) => {
  if (type === 'system') {
    return colors.system(body);
  }
  else if (type === 'message') {
    return colors.author(author) + ' ' + colors.body(body);
  }
}