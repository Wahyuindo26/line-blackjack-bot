const express = require('express');
const { Client, middleware } = require('@line/bot-sdk');

// Konfigurasi berdasarkan LINE Developer Console
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const app = express();
app.use(middleware(config));

const client = new Client(config);

// Struktur sederhana penyimpanan pemain
let gameSession = {
  player1: null,
  player2: null,
  status: 'waiting', // atau 'playing'
};

app.post('/webhook', (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result));
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return null;

  const msg = event.message.text.toLowerCase();
  const userId = event.source.userId;

  if (msg === 'gabung') {
    if (!gameSession.player1) {
      gameSession.player1 = userId;
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'Kamu pemain pertama! Tunggu pemain kedua bergabung.',
      });
    } else if (!gameSession.player2 && userId !== gameSession.player1) {
      gameSession.player2 = userId;
      gameSession.status = 'playing';
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'Pemain kedua bergabung! Permainan dimulai.',
      });
    } else {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'Game sedang berlangsung atau kamu sudah bergabung.',
      });
    }
  }

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: 'Ketik "gabung" untuk ikut bermain.',
  });
}

app.listen(3000, () => {
  console.log('LINE bot aktif di port 3000');
});