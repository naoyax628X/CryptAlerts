
module.exports = {
  errorObject: {
      error: true,
      message: "Oops, something went wrong.Please try again later.",
  },
  MongoDBUrl : "mongodb+srv://dbUser:" +  process.env.DB_USER_PASS +"@cluster0.uqhzg.mongodb.net/Crypt?retryWrites=true&w=majority",
};