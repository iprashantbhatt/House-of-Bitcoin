require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const Parser = require("rss-parser");
const cron = require("node-cron");

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL = process.env.TELEGRAM_CHANNEL_ID;

if (!TOKEN || !CHANNEL) {
  console.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID in .env");
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: false });
const parser = new Parser();

function fmt(n) {
  return Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 });
}

async function sendPriceUpdate() {
  try {
    const { data } = await axios.get("https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&community_data=false&developer_data=false");
    const m = data.market_data;
    const fg = await axios.get("https://api.alternative.me/fng/").then(r => r.data.data[0]);

    const change = m.price_change_percentage_24h;
    const arrow = change >= 0 ? "GREEN" : "RED";
    const sign = change >= 0 ? "+" : "";

    const msg = [
      "*House of Bitcoin Hourly Update*",
      "",
      "*Price:* $" + fmt(m.current_price.usd),
      "*24h Change:* " + arrow + " " + sign + change.toFixed(2) + "%",
      "",
      "*Market Cap:* $" + fmt(m.market_cap.usd / 1e9) + "B",
      "*24h Volume:* $" + fmt(m.total_volume.usd / 1e9) + "B",
      "*BTC Dominance:* " + (m.market_cap_percentage?.btc?.toFixed(2) || "N/A") + "%",
      "",
      "*24h High:* $" + fmt(m.high_24h.usd),
      "*24h Low:* $" + fmt(m.low_24h.usd),
      "",
      "*Fear & Greed:* " + fg.value + " (" + fg.value_classification + ")",
      "",
      "[houseofbitcoin.app](https://houseofbitcoin.app)"
    ].join("\n");

    await bot.sendMessage(CHANNEL, msg, { parse_mode: "Markdown", disable_web_page_preview: true });
    console.log("Price update sent at", new Date().toISOString());
  } catch (e) {
    console.error("Price update failed:", e.message);
  }
}

async function sendNewsUpdate() {
  try {
    const feed = await parser.parseURL("https://www.coindesk.com/arc/outboundfeeds/rss/");
    const top3 = feed.items.slice(0, 3);

    let msg = "*Bitcoin News - Top Stories*\n\n";
    top3.forEach((item, i) => {
      msg += (i + 1) + ". [" + item.title + "](" + item.link + ")\n\n";
    });
    msg += "[More on houseofbitcoin.app](https://houseofbitcoin.app)";

    await bot.sendMessage(CHANNEL, msg, { parse_mode: "Markdown", disable_web_page_preview: true });
    console.log("News sent at", new Date().toISOString());
  } catch (e) {
    console.error("News update failed:", e.message);
  }
}

console.log("Telegram bot started");
sendPriceUpdate();

cron.schedule("0 */5 * * *", sendPriceUpdate);
cron.schedule("0 */3 * * *", sendNewsUpdate);

console.log("Cron jobs scheduled");
