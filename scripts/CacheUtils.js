/**
* libary for use with Going Gas Videos
* CacheUtils contains useful functions for handling cache
* @namespace
*/

var CacheUtils = Object.create(null, {
  
  MAX_SIZE: {
    value:102400
  },  
  /**
  * generate a key given as a mashup of an indeterminate amount of keys
  * @param {arguments} uses the arguments array
  * @return {string} a key
  */
  getKey: {
    value:function () {
      // convert the arguments into an array and join them
      return Array.prototype.slice.call(arguments)
      .map(function(d) {
        return typeof d === 'object' ? JSON.stringify(d) : d;
      })
      .join('-');
    }
  },
  
  // the script cache of this library
  getScriptCache: {
    value: function () {
      return CacheService.getScriptCache();
    }
  },
  
  // the user cache of this library
  getUserCache: {
    value: function () {
      return CacheService.getUserCache();
    }
  },
  
  // if something is too big, splits into multiple
  putBig: {
    value: function (cache , key , item , time) {
      if (!item) return null;
      
      if (item.length <= this.MAX_SIZE) {
        // just write it normally
        return cache.put(key, item, time);
      }
      else {
        // write it in bits
        var keyList = [],p=0;
        while (p < item.length-1) {
          var piece = item.slice(p,Math.min(this.MAX_SIZE)+p, item.length);
          var pieceKey = Utilities.getUuid();
          cache.put (pieceKey, piece , time * 1.05 );
          p+= piece.length;
          keyList.push (pieceKey);
        }
        return cache.put (key , JSON.stringify({
          GoingGasLib: {
            pieces:keyList,
            size:item.length
          }}, time));
      }
    }
  },
  
  getBig: {
    value:function (cache, key) {
      var result = cache.get(key);
      if (result) {
        try {
          var ob = JSON.parse (result);
          if (ob && ob.GoingGasLib && ob.GoingGasLib.pieces) {
            var knit = ob.GoingGasLib.pieces.reduce (function (p,c) {
              return p + cache.get(c);
            },'');
            
            // check if it was valid
            if (knit.length === ob.GoingGasLib.size) {
              return knit;
            }
            else {
              throw 'failed to put cache together again:' + 
                'expected ' + ob.GoingGasLib.size + 
                ' but got ' + knit.length
            }

          }

        }
        catch (err) {
          return result;
        }
      }
    }
  }
  
});
