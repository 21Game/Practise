const express = require('express');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const axios = require('axios');
const fs = require('fs');
const { promisify } = require('util');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware для парсинга JSON
app.use(bodyParser.json());

// Создание HTTP-сервера
const server = app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

// Создание WebSocket-сервера на том же порту
const wss = new WebSocket.Server({ server });

// Массив для хранения соответствий ключевых слов и URL
const keywordMappings = [];

// Обработчик для добавления нового соответствия ключевого слова и URL
app.post('/mapping', (req, res) => {
  const { keyword, url } = req.body;
  keywordMappings.push({ keyword, url });
  res.send('Mapping added successfully');
});

// Обработчик для получения списка URL по ключевому слову
app.get('/urls/:keyword', (req, res) => {
  const { keyword } = req.params;
  const mapping = keywordMappings.find((m) => m.keyword === keyword);
  if (mapping) {
    res.send(mapping.urls);
  } else {
    res.status(404).send('Mapping not found');
  }
});

// Обработчик для скачивания контента по URL
app.get('/download/:url', async (req, res) => {
  const { url } = req.params;
  const writer = fs.createWriteStream('content.txt');
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream'
  });
  response.data.pipe(writer);
  const contentLength = response.headers['content-length'];
  let downloadedBytes = 0;
  writer.on('data', (chunk) => {
    downloadedBytes += chunk.length;
    const progress = Math.round(downloadedBytes / contentLength * 100);
    wss.clients.forEach((client) => {
      client.send(JSON.stringify({ status: 'downloading', progress }));
    });
  });
  writer.on('finish', () => {
    wss.clients.forEach((client) => {
      client.send(JSON.stringify({ status: 'success' }));
    });
    res.send('Content downloaded successfully');
  });
});

const readFileAsync = promisify(fs.readFile);

// Обработчик для получения списка сохраненного контента
app.get('/saved-content', async (req, res) => {
  try {
    const content = await readFileAsync('content.txt', 'utf8');
    res.send(content);
  } catch (error) {
    res.status(404).send('No saved content found');
  }
});

// Обработчик для WebSocket-подключений
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');

  // Обработчик для сообщений от WebSocket-клиента
  ws.on('message', async (message) => {
    const mapping = keywordMappings.find((m) => m.keyword === message);
    if (mapping) {
      const urls = mapping.urls;
      ws.send(JSON.stringify({ status: 'success', urls }));
    } else {
      ws.send(JSON.stringify({ status: 'error', message: 'Mapping not found' }));
    }
  });
});