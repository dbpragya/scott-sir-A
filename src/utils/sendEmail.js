const nodemailer = require("nodemailer");

const EMAIL = process.env.SMTP_EMAIL || "";
const APP_PASSWORD = process.env.SMTP_PASSWORD || "";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL,
    pass: APP_PASSWORD,
  },
});

async function sendEmail({ to, subject, text }) {

  if (!to) {
    console.error("Error: No recipient email provided");
    throw new Error("No recipient email provided");
  }

  const mailOptions = {
    from: `${EMAIL}`,
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
