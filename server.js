'use strict';

const port = 3001;

const webSocket = require('websocket').server;
const http = require('http');

const httpServer = http.createServer((req, res) => {});
httpServer.listen(port, () => {
  console.log(`listening on port ${port}`);
});

const server = new webSocket({
  httpServer: httpServer
});

let clients = {};

server.on('request', (request) => {
  // ///////////////////////////////////////////
  // I N I T
  // /////////////
  const connection = request.accept(null, 0);
  const id = Math.random().toString(36).substring(2, 15);
  clients[id] = {
    connection: connection,
    name: ''
  };
  printClients();

  // ///////////////////////////////////////////
  // G E T  M E S S A G E
  // /////////////
  connection.on('message', json => {
    let message = JSON.parse(json.utf8Data);

    if (message.type === 'set name') { 
      setName(message.body); 
    }
    else if (message.type === 'message') { 
      braodcast('message', message.body); 
    }
  });

  // ///////////////////////////////////////////
  // C L O S E
  // /////////////
  connection.on('close', () => {
    broadcast('system', `${clients[id].name} disconnected`);
    delete clients[id];
    printClients();
  });

  // ///////////////////////////////////////////
  // S E T  N A M E
  // /////////////
  const setName = (name) => {
    let foundName = false;
    for (let client in clients) {
      if (clients[client].name === name) {
        foundName = true;
      }
    }

    if(!foundName) {
      //console.log('set name', id, name);
      clients[id].name = name;
      connection.send(JSON.stringify({
        type: 'set name',
        body: name
      }));

      broadcast('system', `${name} connected`);
    }
    else {
      //console.log('cannot set name', id, name);
      connection.send(JSON.stringify({
        type: 'system',
        body: 'name taken :('
      }));
    }
  }

  // ///////////////////////////////////////////
  // B R O A D C A S T
  // /////////////
  const broadcast = (type, message) => {
    //console.log(type, clients[id].name, message);
    for (let client in clients) {
      clients[client].connection.send(JSON.stringify({
        type: type,
        body: message,
        author: clients[id].name
      }));
    }
  };

  // ///////////////////////////////////////////
  // H E L P E R S
  // /////////////
  const numClients = () => {
    console.log('num clients', Object.keys(clients).length);
  }
});