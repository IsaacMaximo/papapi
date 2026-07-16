// server-modules/perfil.js
const { client } = require("./conndb.js");

async function perfilUsuario(req, res) {
  try {
    const email = req.user.email;
    const fullname = req.user.fullname;
    const userId = req.user.userId;

    const db = client.db("PoupIn");
    const collection = db.collection("users");

    const usuario = await collection.findOne(
      { _id: userId },
      {
        projection: {
          password: 0,
          refreshToken: 0,
          resetCode: 0,
          resetCodeExpires: 0,
        },
      },
    );

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: "Usuário não encontrado",
      });
    }

    res.json({
      success: true,
      message: "Perfil do usuário",
      user: {
        id: usuario._id,
        email: usuario.email,
        fullname: usuario.fullname,
        createdAt: usuario.createdAt,
        updatedAt: usuario.updatedAt,
        feedback: usuario.feedback || false,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao buscar perfil:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao buscar perfil",
      error: error.message,
    });
  }
}

async function enviarFeedback(req, res) {
  try {
    const { avaliacaoRAW, comentarioRAW } = req.body;
    const userId = req.user.userId;

    const comentario = String(comentarioRAW || "").trim();
    const avaliacao = Math.floor(Math.abs(Number(avaliacaoRAW))) || 0;

    if (avaliacao < 1 || avaliacao > 5) {
      return res.status(400).json({
        success: false,
        message: "Avaliação deve ser entre 1 e 5",
      });
    }

    console.log(`📝 Feedback recebido: (${avaliacao}) --> ${comentario}`);

    const db = client.db("PoupIn");
    const usercollection = db.collection("users");
    const feedbackcollection = db.collection("users_feedback");

    const existingUser = await usercollection.findOne({ _id: userId });
    if (!existingUser) {
      console.log("❌ Usuário não encontrado");
      return res.status(404).json({
        success: false,
        message: "Usuário não encontrado",
      });
    }

    await usercollection.updateOne(
      { _id: userId },
      {
        $set: {
          feedback: true,
          feedbackDate: new Date(),
        },
      },
    );
    console.log("✅ Usuário atualizado com feedback=true");

    const userData = {
      userId: existingUser._id,
      fullname: existingUser.fullname,
      email: existingUser.email,
      avaliacao: avaliacao,
      comentario: comentario || "",
      createdAt: new Date(),
    };

    console.log("[!] userdata --->", userData);

    const result = await feedbackcollection.insertOne(userData);

    return res.status(201).json({
      success: true,
      message: "Feedback enviado com sucesso!",
      data: {
        feedbackId: result.insertedId,
        user: {
          userId: existingUser._id,
          fullname: existingUser.fullname,
          email: existingUser.email,
        },
        feedback: {
          avaliacao: avaliacao,
          comentario: comentario,
          createdAt: new Date().toLocaleString("pt-PT", {
            timeZone: "Europe/Lisbon",
          }),
        },
      },
    });
  } catch (error) {
    console.error("❌ Erro ao enviar feedback:", error);
    return res.status(500).json({
      success: false,
      message: "Erro interno ao processar o feedback",
      error: error.message,
    });
  }
}

async function pegarhistorico(req, res) {
  const userId = req.user.userId;
  const db = client.db("PoupIn");
  const usercollection = db.collection("users");
  const historicocollection = db.collection("users_historico");

  const existingUser = await usercollection.findOne({ _id: userId });
  try {
    const historico = await historicocollection.findOne({
      userId: userId,
    });
    if (!historico) {
      return res.json({
        success: false,
        message: "Nenhum dado para apresentar",
      });
    }

    console.log("todo historico: ", historico);
    return res.json({
      success: true,
      dados: historico.dados,
    });
  } catch (error) {
    console.error("❌ Erro ao buscar historico:", error);
    return res.status(500).json({
      success: false,
      message: "Erro interno ao buscar historico",
      error: error.message,
    });
  }
}
// server-modules/perfil.js

async function removerItemHistorico(req, res) {
  try {
    const userId = req.user.userId;
    const { indice } = req.params; // ou req.body

    if (indice === undefined || indice === null) {
      return res.status(400).json({
        success: false,
        message: "Índice do item é obrigatório"
      });
    }

    const indiceNum = parseInt(indice);
    if (isNaN(indiceNum) || indiceNum < 0) {
      return res.status(400).json({
        success: false,
        message: "Índice deve ser um número positivo"
      });
    }

    const db = client.db("PoupIn");
    const historicocollection = db.collection("users_historico");

    // Busca o documento atual
    const historico = await historicocollection.findOne({ userId: userId });
    if (!historico || !historico.dados || historico.dados.length <= indiceNum) {
      return res.status(404).json({
        success: false,
        message: `Índice ${indiceNum} não encontrado no histórico`
      });
    }

    // Remove o item do array pelo índice
    const dadosAtualizados = [...historico.dados];
    dadosAtualizados.splice(indiceNum, 1);

    // Atualiza o documento com o novo array
    const result = await historicocollection.updateOne(
      { userId: userId },
      { $set: { dados: dadosAtualizados } }
    );

    if (result.modifiedCount === 0) {
      return res.status(500).json({
        success: false,
        message: "Erro ao remover item do histórico"
      });
    }

    return res.json({
      success: true,
      message: `Item no índice ${indiceNum} removido com sucesso`,
      dados: dadosAtualizados
    });

  } catch (error) {
    console.error("❌ Erro ao remover item do histórico:", error);
    return res.status(500).json({
      success: false,
      message: "Erro interno ao remover item do histórico",
      error: error.message
    });
  }
}


module.exports = {
  perfilUsuario,
  enviarFeedback,
  pegarhistorico,
  removerItemHistorico,
};
