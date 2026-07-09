const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function connectToDatabase() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Conectado na Base de Dados");
  } catch (error) {
    console.error("Erro ao conectar a Base de Dados:", error);
    throw error;
  }
}

module.exports = { connectToDatabase, client };
