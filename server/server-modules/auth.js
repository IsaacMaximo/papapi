const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");
const { client } = require("./conndb.js");

const saltRounds = 12;
const hashSecret = process.env.HASH_SECRET;
const jwtSecret = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "15m";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_REFRESH_EXPIRES_IN = "7d";

const isProduction = process.env.NODE_ENV === "prod";

const { enviaremail } = require("./email.js");

function normalizeUserId(userId) {
  if (userId instanceof ObjectId) {
    return userId;
  }

  if (typeof userId === "string") {
    try {
      return new ObjectId(userId);
    } catch (error) {
      return userId;
    }
  }

  return userId;
}

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

// ========== MIDDLEWARE DE AUTENTICAÇÃO MELHORADO ==========
const autenticar = async (req, res, next) => {
  try {
    // 🔥 TENTA PEGAR O TOKEN DE VÁRIAS FORMAS
    let token = null;

    // 1. Do cookie (navegador)
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
      console.log("🍪 Token obtido do cookie");
    }

    // 2. Do header Authorization (Yaak/Postman/API)
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
        console.log("🔑 Token obtido do Authorization header");
      }
    }

    // 3. Do body (fallback para testes)
    if (!token && req.body && req.body.token) {
      token = req.body.token;
      console.log("📦 Token obtido do body");
    }

    if (!token) {
      console.log("❌ Token não encontrado em nenhum lugar");
      return res.status(401).json({
        success: false,
        message: "Acesso negado. Faça login primeiro.",
        debug: {
          hasCookie: !!req.cookies,
          hasAuthHeader: !!req.headers.authorization,
          cookieKeys: req.cookies ? Object.keys(req.cookies) : [],
        },
      });
    }

    try {
      const decoded = jwt.verify(token, jwtSecret);

      const db = client.db("PoupIn");
      const collection = db.collection("users");

      const userIdNormalizado = normalizeUserId(decoded.userId);
      const usuario = await collection.findOne({ _id: userIdNormalizado });

      if (!usuario) {
        console.log("❌ Usuário não encontrado para o token");
        return res.status(401).json({
          success: false,
          message: "Sessão inválida. Faça login novamente.",
          code: "USER_NOT_FOUND",
        });
      }

      const currentVersion =
        typeof usuario.tokenVersion === "number" ? usuario.tokenVersion : 0;
      const tokenVersion =
        typeof decoded.version === "number" ? decoded.version : 0;

      if (currentVersion !== tokenVersion) {
        console.log(`🚫 Token revogado para: ${decoded.email}`);
        return res.status(401).json({
          success: false,
          message: "Sessão encerrada. Faça login novamente.",
          code: "TOKEN_REVOKED",
        });
      }

      console.log(`✅ Token válido para: ${decoded.email}`);
      req.user = {
        ...decoded,
        userId: userIdNormalizado,
        userIdString: decoded.userId,
      };

      req.token = token;
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
        error: error.message,
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
      feedback: false,
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
      console.log(`✅ Login bem-sucedido: ${email}`);

      const payload = {
        userId: usuario._id,
        email: usuario.email,
        fullname: usuario.fullname,
        version:
          typeof usuario.tokenVersion === "number" ? usuario.tokenVersion : 0,
      };
      const accessToken = jwt.sign(payload, jwtSecret, {
        expiresIn: JWT_EXPIRES_IN,
      });

      const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        maxAge: 15 * 60 * 1000,
        path: "/",
      };

      res.cookie("token", accessToken, cookieOptions);

      if (rememberMe) {
        console.log(`✅ Usuário optou por "Lembrar de mim": ${email}`);
        const payloadRefresh = {
          userId: usuario._id,
          email: usuario.email,
          version:
            typeof usuario.tokenVersion === "number" ? usuario.tokenVersion : 0,
        };
        const refreshToken = jwt.sign(payloadRefresh, JWT_REFRESH_SECRET, {
          expiresIn: JWT_REFRESH_EXPIRES_IN,
        });

        const refreshOptions = {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
          maxAge: 7 * 24 * 60 * 60 * 1000,
          path: "/api/refresh",
        };

        if (isProduction) {
          refreshOptions.domain = ".vercel.app";
        }

        res.cookie("refreshToken", refreshToken, refreshOptions);

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
        console.log(`ℹ️ Usuário NÃO optou por "Lembrar de mim": ${email}`);
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
          { _id: normalizeUserId(decoded.userId) },
          {
            $inc: { tokenVersion: 1 },
            $unset: { refreshToken: "" },
          },
        );
        console.log(`✅ Sessão revogada para: ${decoded.email}`);
      } catch (error) {
        console.log("ℹ️ Token já expirado, apenas limpando cookies");
      }
    }

    const clearOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/",
    };

    if (isProduction) {
      clearOptions.domain = ".vercel.app";
    }

    res.clearCookie("token", clearOptions);

    res.clearCookie("refreshToken", {
      ...clearOptions,
      path: "/api/refresh",
    });

    console.log("✅ Cookies limpos com sucesso");

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
      _id: normalizeUserId(decoded.userId),
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
      version:
        typeof usuario.tokenVersion === "number" ? usuario.tokenVersion : 0,
    };

    const newAccessToken = jwt.sign(payload, jwtSecret, {
      expiresIn: JWT_EXPIRES_IN,
    });

    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 15 * 60 * 1000,
      path: "/",
    };

    if (isProduction) {
      cookieOptions.domain = ".vercel.app";
    }

    res.cookie("token", newAccessToken, cookieOptions);

    return res.json({
      success: true,
      message: "Token renovado com sucesso",
      token: newAccessToken, // 🔥 Retorna o token também
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

async function recuperarsenha(req, res) {
  const { email } = req.body;

  const db = client.db("PoupIn");
  const collection = db.collection("users");

  const existingUser = await collection.findOne({ email: email });
  if (!existingUser) {
    return res.status(409).json({
      success: false,
      message: "Usuário não encontrado",
    });
  } //adicionar verificacao de caps ou sla P =! p

  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 600000);

  await collection.updateOne(
    { email: email },
    {
      $set: {
        resetCode: resetCode,
        resetCodeExpires: expiresAt,
        resetEmail: email,
      },
    },
  );
  var paraquem = email;
  var subject_msg = "Codigo de verificação Email";
  var texto_msg = `Codigo de verificação: ${resetCode}     Esse codigo é vaido por: ${expiresAt}`;
  var html_msg = `
  <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;padding:40px;border-radius:20px;border:1px solid #e9edf4;">
      <h1 style="font-size:28px;color:#1a2634;text-align:center;">
          Poup<span style="color:#3b82f6;">In</span>
      </h1>
      <h2 style="font-size:22px;color:#0f172a;text-align:center;">Recuperação de Senha</h2>
      <p style="color:#475569;text-align:center;font-size:15px;">Use o código abaixo para redefinir sua senha:</p>
      <div style="background:#f8fafc;border:2px dashed #cbd5e1;border-radius:16px;padding:28px;text-align:center;margin:20px 0;">
          <div style="font-size:42px;font-weight:700;letter-spacing:10px;color:#0f172a;font-family:'Courier New',monospace;background:#fff;padding:12px 20px;border-radius:12px;display:inline-block;">
              ${resetCode}
          </div>
          <p style="color:#64748b;margin-top:16px;font-size:13px;">
              ⏱️ Válido por 10 minutos<br>
              <span style="font-size:12px;color:#94a3b8;">Expira em: ${expiresAt.toLocaleString("pt-pt")}</span>
          </p>
      </div>
      <p style="text-align:center;color:#94a3b8;font-size:13px;">Se você não solicitou, ignore este email.</p>
      <hr style="border:none;border-top:1px solid #e9edf4;margin:20px 0;">
      <p style="text-align:center;color:#cbd5e1;font-size:12px;">© 2026 PoupIn</p>
  </div>
  `;

  var conteudodamensgem = {
    subject: subject_msg,
    text: texto_msg,
    html: html_msg,
  };

  await enviaremail(paraquem, conteudodamensgem);

  console.log(`Código de recuperação para ${email}: ${resetCode}`);

  res.json({
    success: true,
    message: "Código enviado com sucesso!",
  });
}

async function verificarCodigo(req, res) {
  const { email, code } = req.body;

  const db = client.db("PoupIn");
  const collection = db.collection("users");

  const user = await collection.findOne({
    email: email,
    resetCode: code,
    resetCodeExpires: { $gt: new Date() },
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: "Código inválido ou expirado",
    });
  }

  res.json({
    success: true,
    message: "Código verificado com sucesso",
  });
}

async function redefinirSenhaComCodigo(req, res) {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({
      success: false,
      message: "Email, código e nova senha são obrigatórios",
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: "A senha deve ter pelo menos 6 caracteres",
    });
  }

  const db = client.db("PoupIn");
  const collection = db.collection("users");

  const user = await collection.findOne({
    email: email,
    resetCode: code,
    resetCodeExpires: { $gt: new Date() },
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: "Código inválido ou expirado",
    });
  }

  const hashedPassword = await hashPassword(newPassword);

  await collection.updateOne(
    { _id: user._id },
    {
      $set: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
      $unset: {
        resetCode: "",
        resetCodeExpires: "",
        resetEmail: "",
      },
    },
  );

  res.json({
    success: true,
    message: "Senha redefinida com sucesso!",
  });
}

module.exports = {
  cadastrarUser,
  loginUser,
  logoutUser,
  refreshToken,
  autenticar,
  recuperarsenha,
  verificarCodigo,
  redefinirSenhaComCodigo,
};
