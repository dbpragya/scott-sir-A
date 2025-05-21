const nodemailer = require("nodemailer");

const sendEmail = async (email, subject, message) => {
  const transporterOptions = process.env.SMTP_HOST
    ? {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    }
    : {
      service: process.env.SMTP_SERVICE, 
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    };
  const transporter = nodemailer.createTransport(transporterOptions);

  const mailOptions = {
    from: process.env.SMTP_EMAIL,
    to: email,
    subject: subject,
    text: message,
  };
  const mailCheck = await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
