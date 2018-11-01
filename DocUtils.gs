/**
 * libary for use with Going Gas Videos
 * DocUtils contains useful functions for handling Documents
 * @namespace
 */

var DocUtils = (function (ns) {
  
  /**
  * get a map of all the elements in a range
  * @param {Range} range the range
  * @return {[string]} some info on each element within each range
  */
  ns.showRange = function (range) {
    return range.getRangeElements().map(function(d,i) {
      return  'Element ' + i + ' \n ' + 
        d.getElement().getText().slice(0,20).replace(/\n/g,' ');
    });
  };
  /**
  * display the items in an element and recurse
  * @param {Element} elem the element
  * @param {number} [indent=0] indentation level (depth)
  * @param {[string]} [textSoFar=[]] the map so far
  * @return {[string]} description of this element and children
  */
  ns.getMap = function (elem, indent, textSoFar) {
    
    // default is no indentation
    indent = indent || 0;
    textSoFar = textSoFar || [];
    
    // get the element type
    var type = elem.getType();
    
    try {
      // not all elements can be cast as text
      var snip = elem.asText().getText().slice(0,20).replace(/\n/g,' ');
    }
    catch(err) {
      var snip = "..no extractable text.."
      }
    
    // accumulate text
    textSoFar.push(new Array(indent+1).join("-") + type + ":" + snip);
    
    // do any children and recurse
    if (elem.getNumChildren) {
      for (var i= 0; i < elem.getNumChildren() ; i++) {
        ns.getMap ( elem.getChild(i) , indent +2, textSoFar);
      }
    }
    
    return textSoFar;
  }
  
  /**
  * get rid of all the paragraphs after and including the one that matches the given text
  * @param {Body} body the body
  * @param {string} text the paragraph contents
  * @return {Body} the body for chaining
  */
  ns.getRidOfEveryThingFrom = function(body, text) {
    
    // so first delete anything after the map in case its a repeat
    var paras = body.getParagraphs();
    
    // add this to avoid deleting the last paragraph in a document
    body.appendParagraph('');
    
    paras.reduce(function (p,c) {
      p = p || c.getText() === text;
      if (p) {
        c.removeFromParent();
      }
      return p;
    },false);
    
    // duplicate blank para clean up
    return ns.removeFilteredParas(body);
  };
  
  /**
  * get rid of any duplicate paragrphs
  * @param {Body} body the body
  * @param {function} [filterFunc=multipleBlanks] returns true if para should be removed
  * @return {Body} the body for chaining
  */
  ns.removeFilteredParas = function(body , filterFunc) {
    
    // set default filter function if required
    filterFunc = filterFunc || multipleBlanks;
    
    // delete any dupped paras
    body.getParagraphs()
    .filter( function (d) {
      var nextPara = d.getNextSibling();
      return nextPara && filterFunc(d, nextPara);
    })
    .reverse()
    .forEach(function(d) {
      d.removeFromParent();
    });
    
    /**
    * default function to check if this para needs to be removed
    * @param {Paragraph} thisPara the current paragraph
    * @param {Paragraph} nextPara the next paragraph
    * @return {boolean} true if this paragraph should be removed
    */
    function multipleBlanks ( thisPara, nextPara ) {
      return ! (thisPara.getText().length + nextPara.getText().length);
    }
    
    
    return body;
  };
  
  
  /**
  * get an image from a url
  * @param {string} imageUrl the image url
  * @return {Blob|null} te image
  */
  ns.getImageFromUrl = function (imageUrl) {
    
    if (!imageUrl) return null;
    var urlFetchApp = Services.check ('UrlFetchAppService');
    
    // needs some error handling
    return Utils.expBackoff (function () {
      return urlFetchApp.fetch(imageUrl).getBlob() 
    });
    
  };  
  /**
  * find all occurence of text in the document and make a rangebuilder of it
  * @param {Document} doc handle for the document
  * @param {ContainerElement} container the place to look
  * @param {string} textPattern a regex string
  * @return {RangeBuilder} the range builder element
  */
  ns.findBuilder = function (doc, container, textPattern) {
    
    // initialize
    var rangeElement = null, 
        build = doc.newRange(); 
    
    // keep searching for matches
    while (rangeElement = container.findText(textPattern, rangeElement)) {
      
      // an match can be just part of an element
      if (rangeElement.isPartial()) {
        build.addElement(rangeElement.getElement(), 
                         rangeElement.getStartOffset(), rangeElement.getEndOffsetInclusive());
      }
      
      // it matches the whole element
      else {
        build.addElement(rangeElement.getElement());
      }
    }
    
    return build;
  };
  
  /**
  * scale to given width
  * @param {InlineImage} inlineImage the image
  * @param {number} width the target width
  * @return {InlineImage} for chaining
  */
  ns.imageScale = function (inlineImage, width) {
    
    inlineImage.setHeight(
      inlineImage.getHeight() * width / inlineImage.getWidth()
    );
    inlineImage.setWidth(width);
    
    return inlineImage;
    
  };
  
  
  /**
  * execute a duckduckgo query and return cached abstract
  * @param {string} query the string to search duckduckgo.com on
  * @param {boolean} [useCache=true] whether to attempt to use cache
  * @return {object} the query abstract and image
  */
  ns.getDuck = function (query, useCache) {
    
    // get the fusion service
    var urlFetchApp = Services.check ('UrlFetchAppService');

    // use cache?
    var useCache = typeof useCache === typeof undefined ? true : useCache;
    var cache = CacheService.getScriptCache();
    var key = 'getAbstract:'+query;
    
    if (query) {
      
      // see if its in cache
      var result = useCache ? cache.get(key) : null;
      
      if (!result) {
        // do the query
        var response = urlFetchApp.fetch(
          'https://api.duckduckgo.com/?q=' 
          + encodeURIComponent(query) 
        + '&format=json'
        );
        
        // convert the result
        var result = response.getContentText() ;
      }
      
      // update cache
      cache.put (key , result);
      
      // convert to an object
      var data = JSON.parse(result);
      
      // create a result- need to remove double quotes from image url
      var imageUrl = data.Image ? 
          data.Image.replace(/['"]+/g, '') : '';

      // package up results
      return {
        abstract: data.Abstract ? data.Abstract : 'no abstract found',
        image:imageUrl,
        url:data.Results && data.Results.length && Array.isArray(data.Results) ? 
        data.Results[0].FirstURL : '',
        imageBlob: imageUrl ? 
        ns.getImageFromUrl(imageUrl) : null
      }
      
    }
    else {
      return {};
    }
    
  };
  
  /**
  * make palatable link name for internal use
  * @param {string} name the name
  * @return {string} an encoded name
  */
  ns.makeNrName = function (name) {
    return 'nr'+name;
  };
  
  /**
  * find the entire link given a start element
  * @param {Document} doc the document
  * @param {Text} text the element
  * @param {number} start position to start looking at
  * @return {Range} the range to find the link at
  */
  ns.completeLink = function (doc, text , offset) {
    
    var range = null, 
        start = offset, 
        finish = offset,
        max = text.getText().length-1;
    
    // if it has a link
    if (text.getLinkUrl(offset)) {
      // work backwards to find where link ends
      while(start > 0 && text.getLinkUrl(start-1)){
        start--;
      }; 
      
      // work forwards to find where link ends
      while(finish < max && text.getLinkUrl(finish+1)){
        finish++;
      };
      
      range = doc.newRange().addElement( text , start , finish).build();
      
    }
    return range;
  };
  
  /**
  * set a link
  * @param {RangeElement} rangeElement the rangeElement
  * @param {string||null} link the link
  * @return {RangeElement} for chaining
  */
  ns.setLink = function (rangeElement , link) {
    
    if (rangeElement.isPartial ()) { 
      rangeElement.getElement().setLinkUrl(
        rangeElement.getStartOffset(), rangeElement.getEndOffsetInclusive(),link
      );
    }
    else {
      rangeElement.getElement().setLinkUrl(link);
    }
    
    return rangeElement;
  };
  
  /**
  * make a link to a bookmark 
  * @param {Bookmark} bookmark the bookmark
  * @return {string} the link
  */
  ns.getLinkToBookmark = function (bookmark) {
    return bookmark ? 
      '#bookmark='+bookmark.getId() : '';
  };
  
  /**
  * add a bookmark at the beginning of a rangeelement
  * @param {Document} doc the document
  * @param {RangeElement} rangeElement the range element to start at at
  * @return {Bookmark} the bookmark
  */
  ns.addBookmark = function (doc, rangeElement) {
    
    return doc.addBookmark(
      doc.newPosition (
        rangeElement.getElement(),rangeElement.isPartial() ? 
        rangeElement.getStartOffset() : 
        0
      )
    );
  }
  
  return ns;
  
}) (DocUtils || {});
