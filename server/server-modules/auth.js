// auth.js
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { client } = require("./conndb.js");

const saltRounds = 12;
const hashSecret = process.env.HASH_SECRET;
const jwtSecret = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "15m";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_REFRESH_EXPIRES_IN = "7d";

// ========== FUNÇÕES DE HASH ==========
async function hashPassword(passparahash) {
  try {
    if (!passparahash) {
      throw new Error("Senha não fornecida");
    }
    const hmac = crypto.createHmac("sha256", hashSecret);
    hmac.update(passparahash);
    const passparahashHmac = hmac.digest("hex");
    const hash = await bcrypt.hash(passparahashHmac, saltRounds);
    return hash;
  } catch (error) {
    console.error("Erro ao hashear a senha:", error);
    throw error;
  }
}

async function verificarPassword(senha, hashArmazenado) {
  try {
    if (!senha || !hashArmazenado) {
      throw new Error("Senha ou hash não fornecidos");
    }
    const hmac = crypto.createHmac("sha256", hashSecret);
    hmac.update(senha);
    const senhaHmac = hmac.digest("hex");
    const match = await bcrypt.compare(senhaHmac, hashArmazenado);
    return match;
  } catch (error) {
    console.error("Erro ao verificar:", error);
    throw error;
  }
}

// ========== MIDDLEWARE DE AUTENTICAÇÃO ==========
const autenticar = async (req, res, next) => {
  try {
    // 🔍 LOG PARA DEBUG
    console.log("🍪 Cookies recebidos:", req.cookies);
    console.log("📋 Headers:", req.headers.cookie);

    const token = req.cookies.token;

    if (!token) {
      console.log("❌ Token não encontrado nos cookies");
      return res.status(401).json({
        success: false,
        message: "Acesso negado. Faça login primeiro.",
        debug: {
          cookies: req.cookies,
          headers: req.headers,
        },
      });
    }

    try {
      const decoded = jwt.verify(token, jwtSecret);
      console.log("✅ Token válido para:", decoded.email);
      req.user = decoded;
      next();
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        console.log("⏰ Token expirado");
        return res.status(401).json({
          success: false,
          message: "Token expirado",
          code: "TOKEN_EXPIRED",
        });
      }
      console.log("❌ Token inválido:", error.message);
      return res.status(401).json({
        success: false,
        message: "Token inválido",
      });
    }
  } catch (error) {
    console.error("❌ Erro na autenticação:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao autenticar",
      error: error.message,
    });
  }
};

// ========== CONTROLADORES ==========
async function cadastrarUser(req, res) {
  try {
    const { fullname, email, password } = req.body;

    if (!fullname || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Todos os campos são obrigatórios: fullname, email, password",
      });
    }

    console.log(`📝 Cadastro recebido: ${fullname} - ${email}`);

    const hashedPassword = await hashPassword(password);
    console.log(`🔒 Senha hasheada: ${hashedPassword}`);

    const userData = {
      fullname: fullname,
      email: email,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const db = client.db("PoupIn");
    const collection = db.collection("users");

    const existingUser = await collection.findOne({ email: email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email já cadastrado!",
      });
    }

    const result = await collection.insertOne(userData);

    console.log("✅ Usuário salvo com ID:", result.insertedId);

    return res.json({
      success: true,
      message: "Cadastro realizado com sucesso!",
      userId: result.insertedId,
      user: {
        fullname: fullname,
        email: email,
        createdAt: userData.createdAt,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao cadastrar:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao fazer cadastro",
      error: error.message,
    });
  }
}

async function loginUser(req, res) {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email e senha são obrigatórios",
      });
    }

    console.log(`Tentativa de login: ${email}`);

    const db = client.db("PoupIn");
    const collection = db.collection("users");

    const usuario = await collection.findOne({ email: email });

    if (!usuario) {
      console.log(`Usuário não encontrado: ${email}`);
      return res.status(401).json({
        success: false,
        message: "Email ou senha inválidos",
      });
    }

    console.log(`Usuário encontrado: ${usuario.fullname}`);

    const hashArmazenado = usuario.password;
    const senhaValida = await verificarPassword(password, hashArmazenado);

    if (senhaValida) {
      console.log(`Login bem-sucedido: ${email}`);

      const payload = {
        userId: usuario._id,
        email: usuario.email,
        fullname: usuario.fullname,
      };
      const accessToken = jwt.sign(payload, jwtSecret, {
        expiresIn: JWT_EXPIRES_IN,
      });

      res.cookie("token", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "prod",
        sameSite: process.env.NODE_ENV === "prod" ? "none" : "lax",
        maxAge: 15 * 60 * 1000,
        path: "/",
        domain: process.env.NODE_ENV === "prod" ? ".vercel.app" : undefined // Descomente se for Vercel
      });

      if (rememberMe) {
        console.log(`Usuário optou por "Lembrar de mim": ${email}`);
        const payloadRefresh = {
          userId: usuario._id,
          email: usuario.email,
        };
        const refreshToken = jwt.sign(payloadRefresh, JWT_REFRESH_SECRET, {
          expiresIn: JWT_REFRESH_EXPIRES_IN,
        });

        res.cookie("refreshToken", refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "prod",
          sameSite: process.env.NODE_ENV === "prod" ? "none" : "lax",
          maxAge: 7 * 24 * 60 * 60 * 1000,
          path: "/api/refresh",
        });

        await collection.updateOne(
          { _id: usuario._id },
          {
            $set: {
              refreshToken: refreshToken,
              lastLogin: new Date(),
            },
          },
        );
      } else {
        console.log(`Usuário NÃO optou por "Lembrar de mim": ${email}`);
        await collection.updateOne(
          { _id: usuario._id },
          {
            $unset: { refreshToken: "" },
            $set: { lastLogin: new Date() },
          },
        );
      }

      return res.json({
        success: true,
        message: "Login realizado com sucesso!",
        token: accessToken,
        user: {
          id: usuario._id,
          fullname: usuario.fullname,
          email: usuario.email,
          createdAt: usuario.createdAt,
        },
        expiresIn: 15 * 60,
      });
    } else {
      console.log(`❌ Senha incorreta para: ${email}`);
      return res.status(401).json({
        success: false,
        message: "Email ou senha inválidos",
      });
    }
  } catch (error) {
    console.error("❌ Erro no login:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao fazer login",
      error: error.message,
    });
  }
}

async function logoutUser(req, res) {
  try {
    const token = req.cookies.token;

    if (token) {
      try {
        const decoded = jwt.verify(token, jwtSecret);
        const db = client.db("PoupIn");
        const collection = db.collection("users");
        await collection.updateOne(
          { _id: decoded.userId },
          { $unset: { refreshToken: "" } },
        );
      } catch (error) {
        console.log("Token já expirado, apenas limpando cookies");
      }
    }

    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "prod",
      sameSite: "strict",
      path: "/",
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "prod",
      sameSite: "strict",
      path: "/api/refresh",
    });

    return res.json({
      success: true,
      message: "Logout realizado com sucesso!",
    });
  } catch (error) {
    console.error("❌ Erro no logout:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao fazer logout",
      error: error.message,
    });
  }
}

async function refreshToken(req, res) {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token não encontrado",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Sessão expirada. Faça login novamente.",
          code: "REFRESH_EXPIRED",
        });
      }
      return res.status(401).json({
        success: false,
        message: "Refresh token inválido",
      });
    }

    const db = client.db("PoupIn");
    const collection = db.collection("users");
    const usuario = await collection.findOne({
      _id: decoded.userId,
      refreshToken: refreshToken,
    });

    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: "Refresh token inválido",
      });
    }

    const payload = {
      userId: usuario._id,
      email: usuario.email,
      fullname: usuario.fullname,
    };

    const newAccessToken = jwt.sign(payload, jwtSecret, {
      expiresIn: JWT_EXPIRES_IN,
    });

    res.cookie("token", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "prod",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
      path: "/",
    });

    return res.json({
      success: true,
      message: "Token renovado com sucesso",
      expiresIn: 15 * 60,
    });
  } catch (error) {
    console.error("❌ Erro no refresh:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao renovar token",
      error: error.message,
    });
  }
}

// Exportar tudo
module.exports = {
  cadastrarUser,
  loginUser,
  logoutUser,
  refreshToken,
  autenticar,
};
