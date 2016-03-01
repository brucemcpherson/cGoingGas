/**
* libary for use with Going Gas Videos
* SheetUtils contains useful functions for handling Sheets
* @namespace
*/
var SheetUtils = (function (ns) { 
  
  // whether protected functions can be used
  ns.authorized = false;
  
  /**
  * authorize (or not) access to sheetUtils
  * @param {string} key the key
  * @return {boolean} whether authorized.
  */
  ns.authorize = function (key) {
    return (ns.authorized = PropUtils.isAllowed(key));
  };
  /**
  * write objectfed data to a sheet starting at given range
  * @param {[object]} dataObjects an array of objectified sheet data
  * @param {Range} range a starting range
  * @return {[[]]} a data array in sheet format
  */
  ns.objectsToRange = function (dataObjects , range) {
    var newData = ns.datifyObjects (dataObjects);
    var sheet = range.getSheet();
    
    var newRange = sheet.getRange (
      range.getRow(),range.getColumn(),newData.length, newData[0].length
    )
    .setValues(newData);
    
    return newData;
  }
  
  /**
  * turn objectifed data into sheet writable data
  * @param {[object]} dataObjects an array of objectified sheet data
  * @return {[[]]} a data array in sheet format
  */
  ns.datifyObjects = function (dataObjects) {
    
    // get the headers from a row of objects
    var headers = Object.keys(dataObjects[0]);
    
    // turn the data back to an array and concat to header
    return [headers].concat(dataObjects.map(function(row) {
      return headers.map(function(cell) {
        return row[cell];
      });
    }));
    
  };
  
  /**
  * get range key
  * @param {Range} range generates a consistent cache key for ranges
  * @return {string} the key
  */
  ns.getRangeKey = function (range) {
    return CacheUtils.getKey (
      range.getSheet().getParent().getId(),
      range.getSheet().getName(),
      range.getA1Notation()
    );
  };
  
  /**
  * given a range and property (eg values, backgrounds)
  * get the data and make it into an object
  * @param {Range} range the range
  * @param {Cache} [cache] a cache to use
  * @return {[object]} the array of objects
  */
  ns.objectifyRange = function (range,cache) {
    
    var data,cacheData,key;
    
    // use cache ?
    if (cache) {
      key = ns.getRangeKey(range);
      cacheData = cache.get (key);
      data = cacheData ? JSON.parse(cacheData) : null;
    }
    
    // get the data from the range
    if (!data) {
      var values = range.getValues();
      data = ns.objectifyData ( 
        ns.indexifyHeaders ( values.slice(0,1)[0] ) , values.slice(1)
      );
    }
    
    // write values to cache
    if (cache && !cacheData) {
      cache.put (key, JSON.stringify(data));
    }
    return data;
  };
  
  
  /**
  * create an array of objects from data
  * @param {object} headerIndexes the map of header names to column indexes
  * @param {[[]]} data the data from the sheet
  * @return {[object]} the objectified data
  */
  ns.objectifyData = function (headerIndexes , data) {
    return data.map(function(row) {
      return Object.keys(headerIndexes).reduce (function (p,c) {
        p[c] = row[headerIndexes[c]];
        return p;
      },{});
    });
  };
  
  /**
  * create a map of indexes to properties
  * @param {[*]} headers an array of header names
  * @return {object} an object where the props are names & values are indexes
  */
  ns.indexifyHeaders = function (headers) {
    
    var index = 0;
    return headers.reduce (function (p,c) {
      
      // skip columns with blank headers   
      if (c) {
        // for this to work, cant have duplicate column names
        if (p.hasOwnProperty (c)) {
          throw new Error ('duplicate column name ' + c);
        }
        p[c] = index;
      }
      index++;
      return p; 
    } , {});
  }
  
  
  /**
  * given a range and a property name, fill it with a value
  * @param {Range} range the range
  * @param {string} propertyName the property name
  * @param {*|function} fillValue the value to fill with, or function to create a value
  * @param {Range} [headerRange=] an optional range for the headers, default is first data row
  * @return {range} for chaining
  */
  ns.rangeFill = function (range , propertyName, fillValue, headerRange) {
    
    // camel case up property name
    var name = propertyName.slice(0,1).toUpperCase() + propertyName.slice(1);
    if (typeof range['get'+name] !== typeof range['set'+name] || 
        typeof range['set'+name] !== 'function') {
      throw new Error (name + ' should be a property of a range with a getter and setter');
    }
    
    // we'll always need the values to pass to a function, and also get the current properties
    var values = range.getValues();
    
    // set up default headers
    columnNames = headerRange ? headerRange.getValues()[0] : values[0]; 
    if (columnNames.length != values[0].length) {
      throw new Error ('headers are length ' + columnNames.length + 
                       ' but should be ' + values[0].length);
    }
    // these are the properties that will be set                 
    var properties =  name === 'Values' ? values : range['get'+name]();
    
    // iterate
    return range['set'+name](
      values.map(function(row,rowIndex) {
        return row.map(function(cell,colIndex) {
          return typeof fillValue === 'function' ? 
            fillValue ({
              value:cell,
              propertyValue:properties[rowIndex][colIndex],
              columnIndex:colIndex, 
              rowValues:row,
              rowIndex:rowIndex,
              propertyValues:properties,
              values:values,
              range:range,
              propertyName:propertyName,
              columnNames:columnNames,
              columnName:columnNames[colIndex],
              is:function(n) { return columnNames[colIndex] === n; }
            }) : fillValue;
        });
      })
    );
  }
  
  
  return ns;
  
}) (SheetUtils || {});






