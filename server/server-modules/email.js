require("dotenv").config();
const nodemailer = require("nodemailer");

const emailfrom = process.env.NODEMAIL_EMAIL_FROM;
const emailpass = process.env.NODEMAIL_EMAIL_PASS;

async function enviaremail(to, conteudo) {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: emailfrom,
      pass: emailpass,
    },
  });

  const mailOptions = {
    from: `"PoupIn - PAP IsaacPereira" <${emailfrom}>`,
    to: to,
    subject: conteudo.subject,
    text: conteudo.text,
    html: conteudo.html,
  };

  try {
    console.log("📧 Enviando email...");
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email enviado com sucesso!");
    console.log("📨 ID da mensagem:", info.messageId);
    console.log("🔗 URL de visualização:", nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error("❌ Erro ao enviar email:", error.message);
  }
}

module.exports = {
  enviaremail,
};