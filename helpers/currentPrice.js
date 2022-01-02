const { MongoDBUrl } = require("../config/config");
const { MongoClient } = require('mongodb');
const axios = require("axios");

module.exports = async () => {

  const client = new MongoClient(MongoDBUrl, { useNewUrlParser: true, useUnifiedTopology: true });

  try {

    await client.connect();
    const database = client.db('Crypt');
    const tokenCollection = database.collection("Token");
    const cursor = tokenCollection.find();
    const tokens = await cursor.toArray();

    var url = "https://api.nomics.com/v1/currencies/ticker?key=" + process.env.NOMICS_API_KEY + "&ids="
    
    //  urlにシンボルを追加
    for (let index = 0; index < tokens.length; index++) {
      const token = tokens[index];
      url += token.symbol.toUpperCase();
      if (index != tokens.length - 1) {
        url += ",";
      }
    }

    url += "&interval=1m&convert=BTC&page=1";

    await client.close();
    
    const resp = await axios.get(url);

    var datas = {};
    resp.data.forEach( data => {
      datas[data.symbol] = data.price;
    });

    return {
      error: false,
      data: datas,
    };
  
  } catch (error) {
    
    console.error("Fetch price error", error);

    await client.close();

    return { error: true };
  }
};
