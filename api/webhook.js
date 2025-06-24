import { Client } from '@line/bot-sdk';

const client = new Client({
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
});

export const config = {
  api: { bodyParser: true },
};

const playerQueue = [];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const events = req.body?.events;
  if (!events || !Array.isArray(events)) {
    return res.status(400).json({ error: 'Invalid event format' });
  }

  try {
    const results = await Promise.all(events.map(handleEvent));
    return res.status(200).json(results);
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return;

  const msg = event.message.text.trim().toLowerCase();
  const userId = event.source.userId;

  // 🔸 Sambutan: hanya jika meja kosong
  if (msg === 'mulai') {
    if (playerQueue.length > 0) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'Permainan sedang berlangsung atau pemain sudah bergabung. Tunggu ronde berikutnya ya! 🎲',
      });
    }

    return client.replyMessage(event.replyToken, {
      type: 'text',
      text:
        '🎉 Welcome to CHL Blackjack Table\n' +
        "Let's Party and Game On\n\n" +
        '🃏 Ketik gabung untuk ikut bermain\n' +
        '🔄 Ketik batal untuk keluar dari meja\n\n' +
        'May luck be on your side tonight. ♠',
    });
  }

  // 🔸 Bergabung
  if (msg === 'gabung') {
    if (playerQueue.includes(userId)) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'Kamu sudah bergabung. Tunggu pemain lainnya...',
      });
    }

    if (playerQueue.length >= 2) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'Maaf, meja penuh. Tunggu ronde berikutnya 🙏',
      });
    }

    playerQueue.push(userId);

    if (playerQueue.length < 2) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '🃏 Kamu pemain pertama. Tunggu satu pemain lagi untuk memulai.',
      });
    }

    const startMessage = {
      type: 'text',
      text: '🎮 Permainan dimulai! Siapkan strategi dan keberuntunganmu.',
    };

    await Promise.all(
      playerQueue.map(uid => client.pushMessage(uid, startMessage))
    );

    // 🔜 Tambahkan logika permainan di sini
    return;
  }

  // 🔸 Batal
  if (msg === 'batal') {
    const index = playerQueue.indexOf(userId);

    if (index === -1) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'Kamu belum bergabung, tidak ada yang perlu dibatalkan 😅',
      });
    }

    playerQueue.splice(index, 1);

    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '✅ Kamu telah keluar dari meja Blackjack. Sampai jumpa lagi!',
    });
  }

  // 🔸 Default fallback
  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: 'Perintah tidak dikenal. Ketik "mulai" untuk mulai permainan 🎉',
  });
}
