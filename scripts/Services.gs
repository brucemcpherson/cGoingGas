/**
 * dependency free libraries
 * services are passed to it
 * to avoid unnecessary authorization requests
 * if any services are needed 
 * the call them with Services.setClass()
 * can be called as many times as needed
 */

var Services = (function(ns) {

  ns.classes = {};
  /**
   * sets a service class
   * such as spreadsheetapp
   * @param {object} serviceClass the service class to set
   * @param {string} [serviceClassName] the service classname to use
   * @return {Services} for chaining
   */
  ns.setClass = function (serviceClass,serviceClassName) {
    
    // find out what kind of thing it is
    var class = serviceClassName || serviceClass.toString();
        
    // check its a proper name
    if (!/^\w+$/.test(class)) {
      throw 'service name' + class + ' is an invalid name';
    }
    Logger.log(class);
    
    // this will be used in the other namespaces
    ns.classes[class+'Service'] = serviceClass;
    return ns;
  };
  
  /**
  * check that required services are defined
  * add the 'Service' to end of given service name
  * avoids the IDE literal steing clashing
  * eg Services.check('DriveAppService')
  * @param {string} serviceName service to check that they are defined
  * @return {object} the classes
  */
  ns.check = function (serviceName) {
    
    if (!ns.classes[serviceName]) {
      throw 'service name ' + serviceName + ' is not defined - use Services.setClass(' + serviceName + ')';
    }
    return ns.classes[serviceName];
    
  };
  
  // the initial properties of this namespace
  ns.native = Object.keys(ns);
  return ns;
}) (Services || {});
