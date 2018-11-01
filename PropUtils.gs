/**
* libary for use with Going Gas Videos
* PropUtils contains useful functions for handling Properties
* @namespace
*/

var PropUtils = (function(ns) {
  
  /**
  * will check that the key passed matches the one in property store
  * @param {string} checkKey the key to be checked
  * @return {boolean} whether key is valid
  */
  ns.isAllowed = function (checkKey) {
    var scriptProperties = PropertiesService.getScriptProperties();
    var apiKey = scriptProperties.getProperty('apiKey');
    if (!apiKey) {
      throw new Error('Library not available');
    }
    
    // check the the key is authorized
    return checkKey === apiKey;
  };
  
  /**
  * get information on this overall script usage
  * @param {PropertiesStore} store the one to use
  * @return {object} usage
  */
  ns.getUsage = function  (store) {
    var result = store.getProperty ('usage');
    return result ? JSON.parse(result) : null;
  };
  
  /**
  * set information on this overall script usage
  * @param {PropertiesStore} store the one to use
  * @param {object} value the data to set
  * @return {object} the data
  */
  ns.setUsage = function  (store,data) {
    store.setProperty ('usage', JSON.stringify(data));
    return data;
  };
  /**
  * update library usage
  * @param {PropertiesStore} scriptStore the script store
  * @param {PropertiesStore} userStore the user store
  * return {object} the two updated usages {script:{},user:{}}
  */
  ns.updateUsage = function (scriptStore, userStore) {
    
    var now = new Date().getTime();
     
    //  get  this scripts usage, create empty if new
    var scriptUsage = ns.getUsage(scriptStore) || {
      visits:0,
      averageTimeBetweenVisits:0,
      uniqueVisitors:0,
      dateOfLastVisit:0
    };
    
    // get  this users usage, create empty if new
    var userUsage = ns.getUsage(userStore) || { 
      visits:0,
      id:Utilities.getUuid(),
      averageTimeBetweenVisits:0,
      dateOfLastVisit:0
    };

    // now update
    if (scriptUsage.visits) {
      scriptUsage.averageTimeBetweenVisits = 
        (scriptUsage.averageTimeBetweenVisits * scriptUsage.visits + 
         now - scriptUsage.dateOfLastVisit)/ (scriptUsage.visits+1);
    }
    
    scriptUsage.visits++;
    scriptUsage.dateOfLastVisit = now;

    // if its a new user..
    if (!userUsage.visits) {
      scriptUsage.uniqueVisitors ++;
    }

    // and the user stuff
    if (userUsage.visits) {
      userUsage.averageTimeBetweenVisits = 
        (userUsage.averageTimeBetweenVisits * userUsage.visits + 
         now - userUsage.dateOfLastVisit)/ (userUsage.visits+1);
    }
    userUsage.visits++;
    userUsage.dateOfLastVisit = now;
    
    // set the the updated numbers
    return {
      script:ns.setUsage(scriptStore,scriptUsage),
      user:ns.setUsage(userStore, userUsage)
    };
    
 
  }
  /**
  * allow the user properties to be manipulated
  * WARNING.. only expose if its for trusted use
  * @return {PropertiesStore} the user properties store
  */
  ns.getUserStore = function () {
    return PropertiesService.getUserProperties();
  };
  
  // initialize library usage
  ns.initializeUsage = function () {
    ns.updateUsage(
      PropertiesService.getScriptProperties(), 
      PropertiesService.getUserProperties()
    );
  };

  
  return ns;
}) ( PropUtils || {});
