const currentPrice = require("../../helpers/currentPrice");
const { errorObject } = require("../../config/config");
const { MongoDBUrl } = require("../../config/config");
const { MongoClient } = require('mongodb');
const Queue = require("bull");
const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

//
// 現在の価格を取得
//  
exports.CurrentPrice = async function (req, res)  {
  try {
    const prices = await currentPrice();
    if (prices.error) return res.status(500).json(errorObject);
    
    res.status(200).json({
      success: true,
      price_data: prices.data,
    });
  } catch (error) {
    console.error("Current price error", error);
    res.status(500).json(errorObject);
  }
};

//
// アラートを削除する
//
exports.DeleteAlert = async function (req, res) {

  const { asset, price, type, apiKey } = req.body;
  
  if (apiKey != process.env.INVERSTOR_BOT_API_KEY) {
    return res.status(400).json({
      error: true,
      message: "Please provide the API key",
    });
  }

  if (!asset || !price || !type)
      return res.status(400).json({
        error: true,
        message: "Please provide the asset, price and type",
      });

  const mongodbClient = new MongoClient(MongoDBUrl, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
      
      await mongodbClient.connect();

      const database = mongodbClient.db('Crypt');

      const query =  { asset : asset, price :  price, type : type };

      const alertsCollection = database.collection("Alert");

      await alertsCollection.deleteMany(query);
  
      res.send({ success: true, message: "Alert deleted" });
  
  } catch (error) {

    console.error("Delete alert error", error);
    
    res.status(500).json(errorObject);

  } finally {

    await mongodbClient.close();
  }

};


//
// アラートを作成する
//
exports.CreateAlert = async function (req, res) {

  const client = new MongoClient(MongoDBUrl, { useNewUrlParser: true, useUnifiedTopology: true });

  try {

    const { asset, price, email, type, apiKey } = req.body;

    if (apiKey != process.env.INVERSTOR_BOT_API_KEY) {
      return res.status(400).json({
        error: true,
        message: "Bad request",
      });
    }

    if (!asset || !price || !email || !type)
      return res.status(400).json({
        error: true,
        message: "Please provide the asset and price",
      });

      // MongoDBに接続
      await client.connect();
      const database = client.db('Crypt');

      // トークンがなければ保存
      const tokenCollection = database.collection("Token");
      const query =  { symbol : asset.toUpperCase() };
      const cursor = tokenCollection.find(query);
      if ((await cursor.count()) === 0) {
        console.log("No token found");
        var token = {
          "symbol": asset.toUpperCase()
        }
        const documents = [token];
        await tokenCollection.insertMany(documents);
      }

      const alertsCollection = database.collection("Alert");

      var jsonObj = {
        "asset": asset,
        "price": price,
        "email": email,
        "type": type.toLowerCase(),
        "createdAt": new Date(),
      }
      const documents = [jsonObj];

      await alertsCollection.insertMany(documents);
  
      res.send({ success: true, message: "Alert created" });
  
  } catch (error) {
 
    console.error("Create alert error", error);

    res.status(500).json(errorObject);
  
  } finally {

    await client.close();
  }
};

//
// アラート一覧を取得する
//
exports.GetAlerts = async function (req, res) {

  const client = new MongoClient(MongoDBUrl, { useNewUrlParser: true, useUnifiedTopology: true });

  try {

    await client.connect();

    const database = client.db('Crypt');

    const alertsCollection = database.collection("Alert");

    const alerts = await alertsCollection.find().toArray();

    var results = [];

    for (let index = 0; index < alerts.length; index++) {
      const alert = alerts[index];
      
      var jsonObj = {
        "asset": alert.asset,
        "price": alert.price,
        "email": alert.email,
        "type": alert.type.toLowerCase(),
        "createdAt": alert.createdAt
      }

      results.push(jsonObj);
    }

    res.send({ success: true, alerts: results });

  } catch (error) {
  
    console.error("Get alert error", error);

    res.status(500).json(errorObject);
  
  } finally {

    await client.close();
  }
};


exports.EmailTest = async function (req, res) {

  const { apiKey } = req.body;

  if (apiKey != process.env.INVERSTOR_BOT_API_KEY) {
    return res.status(400).json({
      error: true,
      message: "Bad request",
    });
  }

  var alertQueue = new Queue("alerts", REDIS_URL);
  const title = `title`;
  const recipient = "";
  const message = "test message"

  alertQueue.add({ message, recipient, title });

  res.send({ success: true });
}