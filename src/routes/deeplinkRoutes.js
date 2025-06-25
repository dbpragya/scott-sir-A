const Router = require("express").Router();
const {androidDeeplinkingController} = require("../controllers/deeplinkingController");
Router.get("/", androidDeeplinkingController);


module.exports = Router;