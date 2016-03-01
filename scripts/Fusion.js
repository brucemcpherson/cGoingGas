/**
 * a class to help with fusion tables
 * its just a basic example 
 * and needs additional work
 * to support other data types
 *
 * to avoid needing authorization when loading this
 * pass the fusion advanced service class when constructing
 *
 * @constructor
 * @return {Fusion} an instance
 */ 
var Fusion = function () {
  
  var self = this;
 
  
  /**
  * find all tables match name
  * @param {string} name the table name
  * @return {[object]} the tableId and name of tables that match
  */
  self.findByName = function (name) {
    
    // get the fusion service
    var fusion = Services.check('FusionService');

    var tables = Utils.expBackoff(function() {  
      return fusion.Table.list({fields:"items(name,tableId)"});
      
    });
    
    // find the right one(s)
    return tables.items.filter(function(d) {
      return d.name === name;
    });
    
  };
  
  /**
  * do a query
  * @param {string} id the table id
  * @param {string} optSql the string after WHERE
  * @return {object} the result
  */
  self.query = function (id, where) {
    
    // get the fusion service
    var fusion = Services.check('FusionService');

    return Utils.expBackoff(function() {
      return fusion.Query.sqlGet(
        "SELECT * FROM " + id + (where ? " WHERE " + where : ''));
    });
  };
  
  /**
  * remove all the rows in a table
  * @param {string} id the table id
  * @return {object} the result
  */
  self.clearData = function (id) {
    
    // get the fusion service
    var fusion = Services.check('FusionService');

    return Utils.expBackoff(function() {
      return fusion.Query.sql("DELETE FROM " + id);
    });
    
  };
  
  /**
  * insert data into a table
  * @param {string} id the table id
  * @param {[object]}  objects the sheetObject
  * @return {Fusion} self
  */
  self.insertRows = function (id,objects) {
    
    // get the fusion service
    var fusion = Services.check('FusionService');

    // something to do?
    if (!objects.length) {
      return self;
    }
    
    // generate a bunch of insert statements
    var inserts = objects.map(function(d) {
      
      return 'INSERT INTO ' + id +
        ' (' + Object.keys(d).map(function(e) { 
          return quote_(e); 
        })
        .join(',') + ') ' +
          ' VALUES (' + Object.keys(d).map(function(e) {
            return quote_(d[e]); }).join(',') + ')';
    });
    
    // max quotas on the size of insert tables (500 lines, 1mb , 10000 cells)
    var MAX_CHUNKSIZE = 1024*1000,
      MAX_INSERTS =  Math.min(
        500, 
        Math.floor(10000 /objects[0].length)) ;
    
    // create arrays of chunks of insert sizes that don't break any rules.
    
    var toWrite = inserts.reduce (function (p,c) {
      if ( p.chunkSize + c.length > MAX_CHUNKSIZE ||
          p.chunks.length >= MAX_INSERTS-1) {
        p.inserts.push (p.chunks);
        p.chunks = [];
        p.chunkSize = 0;
      }
      p.chunks.push(c);
      p.chunkSize += c.length;
      return p;
      
    }, {chunks:[],chunkSize:0, inserts:[] });
    
    // now do the inserts
    if (toWrite.chunks.length) { 
      toWrite.inserts.push (toWrite.chunks);
    }
    
    toWrite.inserts.forEach (function(d) {
      return Utils.expBackoff(function() {
        return fusion.Query.sql(d.join(';') + ';');
      });
    });
  };
  /**
  * @param {*} value some value
  * @return the value quoted if not a number
  */
  function quote_ (value) {
    return typeof value !== 'number' ? "'" + value.toString() + "'" : value;
  }
  
  /**
  * create table of a given name
  * @param {string} name the table name
  * @param {[object]}  objects the sheetObject
  * @return {object} the resource representation of the table
  */
  self.createTable = function (name,objects) {
    
    // this needs some more work to generalize type detection.
    // get the fusion service
    var fusion = Services.check('FusionService');

    // for this example, it's fine as it should support string or number
    var columns = Object.keys(objects[0]).map (function(d) {
      return {
        name:d,
        type:objects.reduce(function(p,c) {
          return p && p !== c[d] ? "STRING" : typeof c[d];
        }).toUpperCase() || "STRING"
      }
    });
    
    // set the column types
    var payload = {
      name:name,
      isExportable: true,
      columns:columns
    }
    
    // create the table
    return Utils.expBackoff(function() {
      return fusion.Table.insert(payload);
    });
    
  };

};
