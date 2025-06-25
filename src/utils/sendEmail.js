const nodemailer = require("nodemailer");

const EMAIL = "dbanmol.j@gmail.com";
const APP_PASSWORD = "sgxt ivbf hcsv mlxv".replace(/\s/g, "");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL,
    pass: APP_PASSWORD,
  },
});

async function sendEmail(to, subject, text) {
  const mailOptions = {
    from: `${EMAIL}`, // Removed "MakeItHappen"
    to,
    subject,
    text,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}

module.exports = sendEmail;
