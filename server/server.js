const express = require("express");
const app = express();
const PORT = 1919;

require("dotenv").config();

const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const { connectToDatabase, client } = require("./server-modules/conndb.js");

const helmet = require("helmet");
app.use(helmet());

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
  "https://api-pap.vercel.app/",
  "https://api-pap.vercel.app/papapi",
];

async function enviar_dadosscrapper_bd(userId, dadosscrapper) {
  try {
    const db = client.db("PoupIn");
    const usercollection = db.collection("users");
    const historicocollection = db.collection("users_historico");

    const existingUser = await usercollection.findOne({ _id: userId });
    if (!existingUser) {
      console.log("❌ Usuário não encontrado");
      return;
    }

    let historico = await historicocollection.findOne({
      userId: userId,
    });

    if (!historico) {
      const novoHistorico = {
        userId: existingUser._id,
        fullname: existingUser.fullname,
        email: existingUser.email,
        dados: [],
        createdAt: new Date(),
      };
      const result = await historicocollection.insertOne(novoHistorico);
      historico = result;
      console.log("✅ Histórico criado!");
    }

    const normalizedDados = {
      ...dadosscrapper,
      search: dadosscrapper.search || { url: "", term: "" },
      summary: dadosscrapper.summary || { total_products: 0 },
      products: Array.isArray(dadosscrapper.products)
        ? dadosscrapper.products
        : [],
      timestamp: dadosscrapper.timestamp || new Date().toISOString(),
    };

    await historicocollection.updateOne(
      { userId: existingUser._id },
      {
        $push: {
          dados: normalizedDados,
        },
      },
    );

    console.log("✅ Dados atualizados com sucesso!");
  } catch (error) {
    console.error("❌ Erro em enviar_dadosscrapper_bd:", error);
  }
}

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
app.set("trust proxy", 1);

const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => {
    if (req.headers["x-api-key"]) {
      return req.headers["x-api-key"];
    }

    return ipKeyGenerator(req.ip);
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Muitas requisições. Tente novamente em 15 minutos.",
    });
  },
});

const {
  cadastrarUser,
  loginUser,
  recebercodeLogin,
  logoutUser,
  refreshToken,
  autenticar,
  recuperarsenha,
  verificarCodigo,
  redefinirSenhaComCodigo,
} = require("./server-modules/auth.js");

app.post("/papapi/cadastraruser", rateLimiter, cadastrarUser);
app.post("/papapi/loginuser", rateLimiter, loginUser);
app.post("/papapi/recebercodeLogin", rateLimiter, recebercodeLogin);
app.post("/papapi/logout", rateLimiter, logoutUser);
app.post("/papapi/refresh-token", rateLimiter, refreshToken);
app.post("/papapi/recuperar-senha", rateLimiter, recuperarsenha);
app.post("/papapi/verificarCodigo", rateLimiter, verificarCodigo);
app.post(
  "/papapi/redefinir-senha-codigo",
  rateLimiter,
  redefinirSenhaComCodigo,
);

const {
  perfilUsuario,
  enviarFeedback,
  pegarhistorico,
  removerItemHistorico,
} = require("./server-modules/perfil.js");

app.post("/papapi/perfil", rateLimiter, autenticar, perfilUsuario);
app.post("/papapi/enviarfeedback", rateLimiter, autenticar, enviarFeedback);
app.post("/papapi/pegarhistorico", rateLimiter, autenticar, pegarhistorico);
app.delete(
  "/papapi/removeritemhistorico",
  rateLimiter,
  autenticar,
  removerItemHistorico,
);

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

app.get("/papapi/perfil", rateLimiter, autenticar, (req, res) => {
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

app.get(
  "/papapi/run-scraper-pingodoce",
  rateLimiter,
  autenticar,
  async (req, res) => {
    try {
      const termoBusca = req.query.produto;

      if (!termoBusca) {
        return res.status(400).json({
          message: "Parâmetro 'produto' é obrigatório!",
        });
      }

      console.log(`Iniciando scraper do Pingo Doce para: ${termoBusca}`);
      const scraperOutput = await scraper_PingoDoce(termoBusca);
      console.log("[ ID ] -->" + req.user.userId);
      await enviar_dadosscrapper_bd(req.user.userId, scraperOutput);

      res.json({
        message: "Scraper do Pingo Doce executado com sucesso!",
        output: scraperOutput,
      });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Erro ao executar scraper", error: error.message });
    }
  },
);

// Rota para o Continente
app.get(
  "/papapi/run-scraper-continente",
  rateLimiter,
  autenticar,
  async (req, res) => {
    try {
      const termoBusca = req.query.produto;

      if (!termoBusca) {
        return res.status(400).json({
          message: "Parâmetro 'produto' é obrigatório!",
        });
      }

      console.log(`Iniciando scraper do Continente para: ${termoBusca}`);
      const scraperOutput = await scraper_Continente(termoBusca);
      console.log("[ ID ] -->" + req.user.userId);
      await enviar_dadosscrapper_bd(req.user.userId, scraperOutput);

      res.json({
        message: "Scraper do Continente executado com sucesso!",
        output: scraperOutput,
      });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Erro ao executar scraper", error: error.message });
    }
  },
);

app.get(
  "/papapi/run-scraper-Auchan",
  rateLimiter,
  autenticar,
  async (req, res) => {
    try {
      const termoBusca = req.query.produto;

      if (!termoBusca) {
        return res.status(400).json({
          message: "Parâmetro 'produto' é obrigatório!",
        });
      }

      console.log(`Iniciando scraper do Auchan para: ${termoBusca}`);
      const scraperOutput = await scraper_Auchan(termoBusca);
      console.log("[ ID ] -->" + req.user.userId);
      await enviar_dadosscrapper_bd(req.user.userId, scraperOutput);

      res.json({
        message: "Scraper do Auchan executado com sucesso!",
        output: scraperOutput,
      });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Erro ao executar scraper", error: error.message });
    }
  },
);

app.get(
  "/papapi/run-scraper-Intermarche",
  rateLimiter,
  autenticar,
  async (req, res) => {
    try {
      const termoBusca = req.query.produto;

      if (!termoBusca) {
        return res.status(400).json({
          message: "Parâmetro 'produto' é obrigatório!",
        });
      }

      console.log(`Iniciando scraper do Intermarche para: ${termoBusca}`);
      const scraperOutput = await scraper_Intermarche(termoBusca);
      console.log("[ ID ] -->" + req.user.userId);
      await enviar_dadosscrapper_bd(req.user.userId, scraperOutput);

      res.json({
        message: "Scraper do Intermarche executado com sucesso!",
        output: scraperOutput,
      });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Erro ao executar scraper", error: error.message });
    }
  },
);

app.get(
  "/papapi/run-scraper-lidl",
  rateLimiter,
  autenticar,
  async (req, res) => {
    try {
      const termoBusca = req.query.produto;

      if (!termoBusca) {
        return res.status(400).json({
          message: "Parâmetro 'produto' é obrigatório!",
        });
      }

      console.log(`Iniciando scraper do Lidl para: ${termoBusca}`);
      const scraperOutput = await scraper_lidl(termoBusca);
      console.log("[ ID ] -->" + req.user.userId);
      await enviar_dadosscrapper_bd(req.user.userId, scraperOutput);

      res.json({
        message: "Scraper do Lidl executado com sucesso!",
        output: scraperOutput,
      });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Erro ao executar scraper", error: error.message });
    }
  },
);

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
