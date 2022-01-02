
module.exports = function(app) {
    var controller = require('../controllers/appController');
    
    app.route("/prices")
    .get(controller.CurrentPrice);

    app.route("/alerts")
    .get(controller.GetAlerts);

    app.route("/alert")
    .post(controller.CreateAlert)
    .delete(controller.DeleteAlert);
    
    app.route("/emailtest")
    .post(controller.EmailTest); 
  };
  