const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const clients = {};
const viewers = {};

app.use(express.static(path.join(__dirname, '../client/build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

wss.on('connection', (ws) => {
  const id = Math.random().toString(36).substring(2, 15);
  clients[id] = ws;
  console.log(`Client connected with id: ${id}`);

  ws.send(JSON.stringify({ type: 'id', id }));

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    console.log(`Received message from ${id}:`, data);

    if (data.type === 'offer' || data.type === 'answer' || data.type === 'ice-candidate') {
      const targetClient = clients[data.to];
      if (targetClient && targetClient.readyState === WebSocket.OPEN) {
        targetClient.send(JSON.stringify({ ...data, from: id }));
      }
    } else if (data.type === 'connect') {
      viewers[data.hostId] = viewers[data.hostId] || [];
      viewers[data.hostId].push(id);
      const host = clients[data.hostId];
      if (host && host.readyState === WebSocket.OPEN) {
        host.send(JSON.stringify({ type: 'viewer-connected', viewerId: id }));
      }
    }
  });

  ws.on('close', () => {
    delete clients[id];
    console.log(`Client disconnected: ${id}`);
    for (const hostId in viewers) {
      viewers[hostId] = viewers[hostId].filter(viewerId => viewerId !== id);
    }
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
