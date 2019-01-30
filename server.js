'use strict';

const port = 8090;

const webSocket = require('websocket').server;
const http = require('http');
const fs = require('fs');

const httpServer = http.createServer((req, res) => {
  console.log(new Date(), 'Received request for', req.url);
  res.writeHead(404);
  res.end();
});

httpServer.listen(port, () => {
  console.log(new Date(), 'Server is listening on port', port);
});

const server = new webSocket({
  httpServer: httpServer,
  autoAcceptConnections: false
});

const verify = (addr) => {
  if (process.env.NODE_ENV === 'production') {
    const config = JSON.parse(fs.readFileSync('./server-config.json', 'utf8'));
    if (!config.whitelist.includes(addr)) {
      return false;
    }
  }
  return true;
}

let clients = {};

server.on('request', (request) => {
  // ///////////////////////////////////////////
  // I N I T
  // /////////////
  console.log(new Date(), 'new request from', request.remoteAddress);

  if (!verify(request.remoteAddress)) {
    console.log(request.remoteAddress, 'not in whitelist');
    request.reject();
    return;
  }

  const connection = request.accept(null, 0);
  const id = Math.random().toString(36).substring(2, 15);
  clients[id] = {
    connection: connection,
    name: ''
  };
  printClients();

  // ///////////////////////////////////////////
  // B R O A D C A S T
  // /////////////
  const broadcast = (type, message) => {
    for (let client in clients) {
      clients[client].connection.send(JSON.stringify({
        type: type,
        body: message,
        author: clients[id].name
      }));
    }
  };

  // ///////////////////////////////////////////
  // G E T  M E S S A G E
  // /////////////
  connection.on('message', json => {
    let message = JSON.parse(json.utf8Data);

    if (message.type === 'set name') { 
      setName(message.body); 
    }
    else if (message.type === 'message') { 
      broadcast('message', message.body); 
    }
  });

  // ///////////////////////////////////////////
  // C L O S E
  // /////////////
  connection.on('close', () => {
    broadcast('system', `${clients[id].name} disconnected`);
    console.log(new Date(), request.remoteAddress, 'disconnected');
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
      clients[id].name = name;
      connection.send(JSON.stringify({
        type: 'set name',
        body: name
      }));

      broadcast('system', `${name} connected`);
    }
    else {
      connection.send(JSON.stringify({
        type: 'system',
        body: 'name taken :('
      }));
    }
  };
});

// ///////////////////////////////////////////
// H E L P E R S
// /////////////
const printClients = () => {
  console.log('num clients', Object.keys(clients).length);
};