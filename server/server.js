const express = require("express");
const app = express();
const PORT = 1919;

require("dotenv").config();


const { connectToDatabase, client } = require("./server-modules/conndb.js");

const cookieParser = require("cookie-parser");
app.use(cookieParser());

const cors = require("cors");
const allowedOrigins = [
  "http://localhost:1919",
  "http://localhost:1919/",
  "http://localhost:1919/papapi",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "https://api-pap.vercel.app",
  "https://api-pap.vercel.app",
  "https://api-pap.vercel.app/papapi",
];
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log("❌ CORS bloqueado para:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  }),
);

app.use(express.json());

const {
  cadastrarUser,
  loginUser,
  logoutUser,
  refreshToken,
  autenticar,
  recuperarsenha,
  verificarCodigo,
  redefinirSenhaComCodigo,
} = require("./server-modules/auth.js");

app.post("/papapi/cadastraruser", cadastrarUser);
app.post("/papapi/loginuser", loginUser);
app.post("/papapi/logout", logoutUser);
app.post("/papapi/refresh-token", refreshToken);
app.post("/papapi/recuperar-senha", recuperarsenha);
app.post("/papapi/verificarCodigo", verificarCodigo);
app.post("/papapi/redefinir-senha-codigo", redefinirSenhaComCodigo);

app.post("/papapi/enviarfeedback", autenticar, async (req, res) => {
  try {
    const { avaliacao, comentario } = req.body;
    const email = req.user.email;

    const db = client.db("PoupIn");
    const usercollection = db.collection("users");
    const feedbackcollection = db.collection("users_feedback");

    const existingUser = await usercollection.findOne({ email: email });
    if (!existingUser) {
      return res.status(409).json({
        success: false,
        message: "Usuário não encontrado",
      });
    }

    await usercollection.updateOne(
      { email: email },
      {
        $set: {
          feedback: true,
        },
      },
    );

    const userData = {
      userid: existingUser._id,
      fullname: existingUser.fullname,
      email: existingUser.email,
      avaliacao: avaliacao,
      comentario: comentario || "",
      createdAt: new Date(),
    };

    const result = await feedbackcollection.insertOne(userData);
    return res.status(201).json({
      success: true,
      message: "Feedback enviado com sucesso!",
      data: {
        user: {
          userid: existingUser.userid,
          fullname: existingUser.fullname,
          email: existingUser.email,
        },
        feedback: {
          avaliacao: avaliacao,
          comentario: comentario,
          createdAt: new Date(),
        },
      },
    });
  } catch (error) {
    console.error("Erro ao enviar feedback:", error);
    return res.status(500).json({
      success: false,
      message: "Erro interno ao processar o feedback",
      error: error.message,
    });
  }
});

app.get("/papapi/getambiente", (req, res) => {
  res.json({
    success: true,
    node_env: process.env.NODE_ENV,
  });
});

app.get("/papapi/verificar-token", autenticar, (req, res) => {
  res.json({
    success: true,
    message: "Token válido",
    user: req.user,
  });
});

app.get("/papapi/perfil", autenticar, (req, res) => {
  const email = req.user.email;
  const fullname = req.user.fullname;

  res.json({
    success: true,
    message: "Perfil do usuário",
    user: {
      email: email,
      fullname: fullname,
    },
  });
});

app.get("/papapi/teste", (req, res) => {
  res.json({
    mensagem: "Requisição GET funcionando!",
    timestamp: new Date().toISOString(),
  });
});

app.post("/papapi/teste", autenticar, (req, res) => {
  res.json({
    mensagem: "Requisição POST recebida!",
    timestamp: new Date().toISOString(),
  });
});

const {
  scraper_PingoDoce,
  scraper_Continente,
  scraper_Auchan,
  scraper_Intermarche,
  scraper_lidl,
} = require("./scraper.js");

app.get("/papapi/run-scraper-pingodoce", async (req, res) => {
  try {
    const termoBusca = req.query.produto;

    if (!termoBusca) {
      return res.status(400).json({
        message: "Parâmetro 'produto' é obrigatório!",
      });
    }

    console.log(`Iniciando scraper do Pingo Doce para: ${termoBusca}`);
    const scraperOutput = await scraper_PingoDoce(
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
      });
    }

    console.log(`Iniciando scraper do Continente para: ${termoBusca}`);
    const scraperOutput = await scraper_Continente(

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
      });
    }

    console.log(`Iniciando scraper do Auchan para: ${termoBusca}`);
    const scraperOutput = await scraper_Auchan(
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
      });
    }

    console.log(`Iniciando scraper do Intermarche para: ${termoBusca}`);
    const scraperOutput = await scraper_Intermarche(
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
      });
    }

    console.log(`Iniciando scraper do Lidl para: ${termoBusca}`);
    const scraperOutput = await scraper_lidl(
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
  res.send("Servidor Node.js funcionando!");
});

if (process.env.NODE_ENV !== "prod") {
  app.listen(PORT, async () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    await connectDB();
  });
}

const connectDB = async () => {
  try {
    await connectToDatabase();
    console.log("✅ Banco conectado com sucesso");
  } catch (error) {
    console.error("❌ Erro ao conectar ao banco:", error);
  }
};

module.exports = app;
