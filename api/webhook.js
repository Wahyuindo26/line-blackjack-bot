import { Client } from '@line/bot-sdk';

const client = new Client({
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
});

export const config = {
  api: { bodyParser: true },
};

const playerQueue = [];
const gameHistory = [];
let resetTimer = null;

// 🚨 Ganti ini dengan LINE userId kamu
const adminId = 'pavinendra'; 

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

  // 🛑 Reset otomatis jika game sudah jalan 2 menit
  const resetGame = () => {
    console.log('⌛ Auto-reset: Meja dikosongkan');
    playerQueue.length = 0;
    resetTimer = null;
  };

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

    // ⏱️ Atur reset otomatis 2 menit
    if (!resetTimer) {
      resetTimer = setTimeout(resetGame, 2 * 60 * 1000);
    }

    // 🎮 Game dimulai
    const startMessage = {
      type: 'text',
      text: '🎮 Permainan dimulai! Siapkan strategi dan keberuntunganmu.',
    };

    await Promise.all(
      playerQueue.map(uid => client.pushMessage(uid, startMessage))
    );

    // 📜 Simpan riwayat
    gameHistory.push({
      players: [...playerQueue],
      timestamp: new Date().toISOString(),
    });

    return;
  }

  if (msg === 'batal') {
    const index = playerQueue.indexOf(userId);

    if (index === -1) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'Kamu belum bergabung, tidak ada yang perlu dibatalkan 😅',
      });
    }

    playerQueue.splice(index, 1);

    // Jika semua keluar, reset timer juga
    if (playerQueue.length === 0 && resetTimer) {
      clearTimeout(resetTimer);
      resetTimer = null;
    }

    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '✅ Kamu telah keluar dari meja Blackjack. Sampai jumpa lagi!',
    });
  }

  if (msg === 'reset-riwayat') {
    if (userId !== adminId) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '❌ Kamu tidak diizinkan mereset riwayat.',
      });
    }

    gameHistory.length = 0;

    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '✅ Riwayat permainan berhasil di-reset oleh admin.',
    });
  }

  if (msg === 'riwayat') {
    if (gameHistory.length === 0) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '📭 Belum ada riwayat permainan saat ini.',
      });
    }

    const latest = gameHistory[gameHistory.length - 1];
    const players = latest.players.map((p, i) => `Pemain ${i + 1}: ${p}`).join('\n');

    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `📜 Riwayat Terakhir:\n${players}\nTanggal: ${latest.timestamp}`,
    });
  }

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: 'Perintah tidak dikenal. Ketik "mulai" untuk mulai permainan 🎉',
  });
}
