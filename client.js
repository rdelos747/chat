'use strict';

const webSocket = require('websocket').client;
const readline = require('readline');

const serverAddress = (process.env.NODE_ENV === 'production') ? 'http://rafaeldelossantos.com/chat' : 'http://localhost:8090/';

const read = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const client = new webSocket();
client.connect(serverAddress);

client.on('connect', connection => {
  console.log('connected to', connection.remoteAddress);
  let nameInterval;
  let askName = true;
  let username = '';

  connection.on('message', json => {
    const message = JSON.parse(json.utf8Data);
    if (message.type === 'message' && message.author !== username) {
      const m = `${message.author}: ${message.body}`;
      writeMessage(m);
    }
    else if (message.type === 'set name') {
      username = message.body;
      clearInterval(nameInterval);
    }
    else if (message.type === 'system') {
      writeMessage(message.body);
    }

    if (username === '') {
      askName = true;
    }
  });

  connection.on('close', () => {
    writeMessage('disconnected from server');
    read.close();
    process.exit();
  });

  const sendMessage = json => {
    if (connection.connected) {
      connection.send(JSON.stringify(json));
    }
  };

  const writeMessage = message => {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    console.log(message);
    read.prompt(true);
  };

  const getUsername = () => {
    if (askName) {
      askName = false;
      read.question('enter username: ', name => {
        if (name !== '') {
          sendMessage({
            type: 'set name',
            body: name
          });
        }
        else {
          askName = true;
        }
      });
    }
  }

  read.on('line', (line) => {
    if (!askName) {
      sendMessage({
        type: 'message',
        body: line
      });
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      read.prompt(true);
    }
  });

  nameInterval = setInterval(getUsername, 500);
});