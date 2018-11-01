/**
* libary for use with Going Gas Videos
* Utils contains useful functions for working with Drive
* @namespace
*/
var DriveUtils = (function (ns) {

  /**
  * get the files from a path like /abc/def/hgh/filename
  * @param {string} path the path
  * @return {FileIterator} a fileiterator
  */
  ns.getFilesFromPath = function (path) {
    
    // get the filename and the path seperately
    var s = path.split("/");
    if (!s.length) { 
      return null;
    }
    var filename = s[s.length-1];
    
    // the folder
    var folder = ns.getFolderFromPath (
      "/" + (s.length > 1 ? s.slice(0,s.length-1).join("/") : "")
    );
    
    return Utils.expBackoff ( function () {
      return folder.getFilesByName (filename);
    });
    
  };
  
  /**
  * get a folder from a path like /abc/def/hgh
  * @param {string} path the path
  * @return {Folder} a folder
  */
  ns.getFolderFromPath = function (path) {
      
    var dApp = Services.check('DriveAppService');
  
    return (path || "/").split("/").reduce ( 
      function(prev,current) {
        if (prev && current) {
          var fldrs = Utils.expBackoff ( function () {
            return prev.getFoldersByName(current);
          });
          return fldrs.hasNext() ? fldrs.next() : null;
        }
        else { 
          return current ? null : prev; 
        }
      },dApp.getRootFolder()); 
  };
  
  /**
  * get a path like /abc/def/hgh from a folder
  * @param {Folder} folder the folder
  * @return {string} a path
  */
  ns.getPathFromFolder = function (folder,optPath) {
      
    var dApp = Services.check('DriveAppService');
  
    var path = optPath || '/';
    if (!folder) return '';
    
    if (folder.getId() === Utils.expBackoff ( function () {
      return  dApp.getRootFolder().getId(); 
    })) {
      return path;
    }
    else {
      return ns.getPathFromFolder(
        folder.getParents().next() , '/' + folder.getName() + path
      );
    }
    
  };
  
  
  return ns;
}) (DriveUtils || {});
