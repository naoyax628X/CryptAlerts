const { MongoClient } = require('mongodb');
const { MongoDBUrl } = require("./config/config");
const currentPrice = require("./helpers/currentPrice");
const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const Queue = require("bull");
const CronJob = require('cron').CronJob;

const alertQueue = new Queue("alerts", REDIS_URL);
alertQueue.process(async function (job, done) {

  const { recipient, title, message } = job.data;
  
  const sgmail = require('@sendgrid/mail');
    
  sgmail.setApiKey(process.env.SENDGRID_API_KEY);
  
  // 送信するメールの内容を設定する
  const msg = {
    to: recipient,
    from: process.env.SENDER_EMAIL,
    replyTo: process.env.SENDER_EMAIL,
    subject: title,
    text: message
  };
  
  // メールを送信する
  sgmail
  .send(msg)
  .then(() => {
    console.log('Email sent')
  })
  .catch((error) => {
    console.error(error)
  })
  .finally(
    done()
  );
});

// 
// 20分おきに価格を確認
//
const sendAlert = new CronJob("0,20,40 * * * *", async function () {

  const currentPrices = await currentPrice();

  if (currentPrices.error) return;

  const priceData = currentPrices.data;

  const client = new MongoClient(MongoDBUrl, { useNewUrlParser: true, useUnifiedTopology: true });

  try {

    await client.connect();
    const database = client.db('Crypt');
    const alertsCollection = database.collection("Alert");
    const alerts = await alertsCollection.find().toArray();

    alerts.forEach((alert) => {
      
      let message, title, recipient;
      
      const asset = alert.asset.toUpperCase();

      if (alert.type == "above" && parseFloat(alert.price) < parseFloat(priceData[asset])) 
      {
        message = `${alert.asset} の価格が ${alert.price} btcより上昇しました。
        現在の価格は ${priceData[asset]} btcです。`;
  
        title = `${alert.asset} の価格が上昇しました`;
        recipient = alert.email;

        alertQueue.add({ message, recipient, title });
      } 
      else if (alert.type == "below" && parseFloat(alert.price) > parseFloat(priceData[asset]))
      {
        message = `${alert.asset} の価格が ${alert.price} btcより下落しました。
        現在の価格は ${priceData[asset]} btcです。`;
  
        recipient = alert.email;
        title = `${alert.asset} の価格が下落しました`;
          
        alertQueue.add({ message, recipient, title });
      }  
    });

    await client.close();

  } catch (error) {

    await client.close();
    
    console.error("Get alert error", error);
  }

});

sendAlert.start();