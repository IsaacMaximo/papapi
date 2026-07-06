const express = require("express");
const app = express();
const PORT = 1919;

const axios = require("axios");
const cheerio = require("cheerio");

const cors = require("cors");
app.use(cors());

app.use(express.json());

app.get("/papapi/teste", (req, res) => {
  res.json({
    mensagem: "Requisição GET funcionando!",
    timestamp: new Date().toISOString(),
  });
});

app.post("/papapi/teste", (req, res) => {
  const dados = req.body;
  res.json({
    mensagem: "Requisição POST recebida!",
    dados_recebidos: dados,
    timestamp: new Date().toISOString(),
  });
});

const {
  scraper_PingoDoce,
  scraper_Continente,
  scraper_Auchan,
  scraper_Intermarche,
  scraper_lidl,
  testebrowserless,
} = require("./scraper.js");

const { connectToDatabase } = require("./conndb.js");

app.get("/papapi/run-scraper-testebrowserless", async (req, res) => {
  try {
    const output = await testebrowserless("https://www.pingodoce.pt/");
    res.json({
      message: "Teste do Browserless executado com sucesso!",
      output: output,
    });
  } catch (error) {
    res.status(500).json({
      message: "Erro ao executar teste do Browserless",
      error: error.message,
    });
  }
});

// Rota para o Pingo Doce
app.get("/papapi/run-scraper-pingodoce", async (req, res) => {
  try {
    const termoBusca = req.query.produto;

    if (!termoBusca) {
      return res.status(400).json({
        message: "Parâmetro 'produto' é obrigatório!",
        exemplo: "http://localhost:1919/run-scraper-pingodoce?produto=leite",
      });
    }

    console.log(`Iniciando scraper do Pingo Doce para: ${termoBusca}`);
    const scraperOutput = await scraper_PingoDoce(
      "https://www.pingodoce.pt/",
      termoBusca,
    );
    res.json({
      message: "Scraper do Pingo Doce executado com sucesso!",
      output: scraperOutput,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erro ao executar scraper", error: error.message });
  }
});

// Rota para o Continente
app.get("/papapi/run-scraper-continente", async (req, res) => {
  try {
    const termoBusca = req.query.produto;

    if (!termoBusca) {
      return res.status(400).json({
        message: "Parâmetro 'produto' é obrigatório!",
        exemplo: "http://localhost:1919/run-scraper-continente?produto=leite",
      });
    }

    console.log(`Iniciando scraper do Continente para: ${termoBusca}`);
    const scraperOutput = await scraper_Continente(
      "https://www.continente.pt/",
      termoBusca,
    );
    res.json({
      message: "Scraper do Continente executado com sucesso!",
      output: scraperOutput,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erro ao executar scraper", error: error.message });
  }
});

app.get("/papapi/run-scraper-Auchan", async (req, res) => {
  try {
    const termoBusca = req.query.produto;

    if (!termoBusca) {
      return res.status(400).json({
        message: "Parâmetro 'produto' é obrigatório!",
        exemplo: "http://localhost:1919/run-scraper-Auchan?produto=leite",
      });
    }

    console.log(`Iniciando scraper do Auchan para: ${termoBusca}`);
    const scraperOutput = await scraper_Auchan(
      "https://www.auchan.pt/",
      termoBusca,
    );
    res.json({
      message: "Scraper do Auchan executado com sucesso!",
      output: scraperOutput,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erro ao executar scraper", error: error.message });
  }
});

app.get("/papapi/run-scraper-Intermarche", async (req, res) => {
  try {
    const termoBusca = req.query.produto;

    if (!termoBusca) {
      return res.status(400).json({
        message: "Parâmetro 'produto' é obrigatório!",
        exemplo: "http://localhost:1919/run-scraper-Intermarche?produto=leite",
      });
    }

    console.log(`Iniciando scraper do Intermarche para: ${termoBusca}`);
    const scraperOutput = await scraper_Intermarche(
      "https://www.intermarche.pt/home",
      termoBusca,
    );
    res.json({
      message: "Scraper do Intermarche executado com sucesso!",
      output: scraperOutput,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erro ao executar scraper", error: error.message });
  }
});

app.get("/papapi/run-scraper-lidl", async (req, res) => {
  try {
    const termoBusca = req.query.produto;

    if (!termoBusca) {
      return res.status(400).json({
        message: "Parâmetro 'produto' é obrigatório!",
        exemplo: "http://localhost:1919/run-scraper-lidl?produto=leite",
      });
    }

    console.log(`Iniciando scraper do Lidl para: ${termoBusca}`);
    const scraperOutput = await scraper_lidl(
      "https://www.lidl.pt/",
      termoBusca,
    );
    res.json({
      message: "Scraper do Lidl executado com sucesso!",
      output: scraperOutput,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erro ao executar scraper", error: error.message });
  }
});

app.get("/papapi/", (req, res) => {
  res.send("Servidor Node.js funcionando! 🚀");
});

const connectDB = async () => {
  try {
    await connectToDatabase();
    console.log("✅ Banco conectado com sucesso");
  } catch (error) {
    console.error("❌ Erro ao conectar ao banco:", error);
  }
};

// Exporta para o Vercel (NÃO use app.listen!)
module.exports = app;
