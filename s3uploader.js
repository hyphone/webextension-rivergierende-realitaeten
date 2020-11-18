let getInputValues = false;
let serverResponse = false;

const validCharacters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
let s3 = null;
let dateDate = new Date();
let dateCurrent = dateDate.getFullYear()+'-'+(dateDate.getMonth()+1)+'-'+dateDate.getDate();
const regNormalSuffix = /(\.jpg|\.jpeg|\.png|\.svg|\.gif|\.ico|\.webp)/;
const validMimeTypes = /(image\/svg\+xml|image\/jpeg|image\/webp|image\/png|image\/gif|image\/x-icon|image\/webp)/;
const filenameTag = /(\?[aA-zZ]*\=)/;
const regExQuote = RegExp('(\")(.*?)(\")','g');
let imageCache = new Set();
let oAllDom = new Set();
let nCanvas = 0;
let enabled = false;

let observerCallback = function(mutationsList, observer) {
  asyncForEach([...mutationsList], function(mutation){
    // getImages(mutation.target);
    
    let mutationChildren = [...mutation.target.getElementsByTagName('*')];

    asyncForEach([...mutationChildren], function(el){
      getImages(el);
    });
    // getEveryTagFromMarkup(mutation.target.outerHTML);
  });
};
let mutationObserver = new MutationObserver(observerCallback);

function logThis(message) {
  if (inputValues.bDebugging){
    if (message !== null){
      if (typeof message.stack !== 'undefined'){
        console.error(message, message.stack);
      } else {
        console.log(message);
      }
    } else {
      console.log(message);
    }
  }
}

function getEveryTagFromMarkup(outerHTML){
  let mutationTags = [...new Set(Array.from(outerHTML.matchAll(regExQuote), m => m[0]))];
  // logThis(outerHTML);
  asyncForEach(mutationTags, function(sTag){
    if (sTag.indexOf('&quot;') > 0){
      sTag = sTag.match(/(&quot;)(.*?)(&quot;)/g);
      if (sTag.length > 0){
        sTag.forEach(function(sTagQuote){
          sTagQuote = sTagQuote.replace(/(&quot;)|(\")/g, '');
          let aURLquote = sanitizeURL(sTagQuote);
          if (aURLquote.bSuccess){
            putImageFromSrc(aURLquote);
          }
        });
      }
    } 
    sTag = sTag.replace(/(&quot;)|(\")/g, '');
    let aURL = sanitizeURL(sTag);
    if (aURL.bSuccess){
      putImageFromSrc(aURL);
    }
  });
}

function asyncForEach(arr, cb, done) {
  (function next(i) {
    if(i >= arr.length) {
       if(done) done();
       return;
    }
    cb(arr[i], i, arr);
    setTimeout(next, 0, i + 1);
  })(0);
}

function isURL(str) {
  regexp =  /^(?:(?:https?|ftp|http):\/\/)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/\S*)?$/;
  return regexp.test(str) ? true : false;
}

function sanitizeURL(sURL){
  // sSource, bData, bSuccess
  let aReturn = {
    sSource: sURL,
    bData: false,
    bSuccess: false
  };

  sURL = sURL.trim();

  if (sURL.length > 0){
    if (isData(sURL)){
      aReturn = {
        sSource: sURL,
        bData: true,
        bSuccess: true
      };
    } else if ( sURL.substr(sURL.length-1, 1) !== '/'){
      if (sURL.indexOf('//') == 0){
        sURL = window.location.protocol+sURL;
      } else if (sURL.indexOf('/') == 0) {
        sURL = window.location.hostname+sURL;
      }

      if (isURL(sURL)){
        aReturn = {
          sSource: sURL,
          bData: false,
          bSuccess: true
        };
      } else {
        sURL = window.location + sURL;
        if (isURL(sURL)){
          aReturn = {
            sSource: sURL,
            bData: false,
            bSuccess: true
          };
        }
      }
    }
  }
  
  return aReturn;
}

function getFilename(sUrl){
  let filename = sUrl.trim().toLowerCase();
  if (filename.indexOf('//') == 0){
    filename = 'https:'+filename;
  }
  
  // let bBase64 = filename.indexOf('data:') >= 0 ? true : false;
  
  versionTag = filename.match( filenameTag );
  if (versionTag !== null){
    let nVersionTag = filename.indexOf(versionTag[0]);
    filename = filename.substr(0, nVersionTag);
  }

  let nLastSlash = filename.lastIndexOf('/')+1;
  if (nLastSlash > 0){
    filename = filename.substr(nLastSlash, filename.length - nLastSlash);
  }

  const isNormalFilename = filename.match( regNormalSuffix );
  if (!isNormalFilename){
    filename = filename.substr(filename.length - 22, 21).replace(/[^a-zA-Z0-9 ]/g, '');
    let mimeType = getMimetype(sUrl);

    let suffix = 'png';
    switch (mimeType) {
      case 'image/svg+xml':
        suffix = 'svg';
        break;
      case 'image/jpeg':
        suffix = 'jpg';
        break;
      case 'image/webp':
        suffix = 'webp';
        break;
      default:
        suffix = mimeType.substr(mimeType.indexOf('/')+1, mimeType.length - mimeType.indexOf('/')+1);
        break;
    }

    if (mimeType.length > 0){
      filename = filename+'.'+suffix;
    }
  }

  return filename;
}

function getMimetype(sUrl){
  let mimeType = '';

  let suffix = (sUrl.toLowerCase().match( regNormalSuffix )||'');
  let b64Type = (sUrl.match(/^data:([^;]+);/)||'');
  
  if (suffix.length){
    switch (suffix[0]) {
      case '.svg':
        mimeType = 'image/svg+xml';
        break;
      case '.jpg':
        mimeType = 'image/jpeg';
        break;
      case '.webp':
        mimeType = 'image/webp';
        break;
      case '.ico':
        mimeType = 'image/x-icon';
        break;
      default:
        mimeType = 'image/'+suffix[0].substr(1, suffix[0].length-1);
        break;
    }
  } else if (b64Type.length > 0){
    mimeType = b64Type[1];
  }

  return mimeType;
}

function filterBackgroundImage(sBack){
  let aReturn = {
    sSource: sBack,
    bData: false,
    bSuccess: false
  }
  
  nUrlPos = sBack.indexOf('url(');
  if (nUrlPos >= 0){
    let sBackUrl = sBack.substr(nUrlPos+5, sBack.length-nUrlPos-7);
    aReturn = sanitizeURL(sBackUrl);
  }

  return aReturn;
}

function checkFilenameForSuffix(filename, mime, fileBytes, addition){
  let suffix = '';
  if (addition == false){
    addition = '';
  } else {
    addition = '_'+addition;
  }

  if (mime.length > 0){
    switch (mime) {
      case 'image/svg+xml':
        suffix = '.svg';
        break;
      case 'image/jpeg':
        suffix = '.jpg';
        break;
      case 'image/x-icon':
        suffix = '.ico';
        break;
      default:
        let slashPos = mime.indexOf('/')+1;
        suffix = '.'+mime.substr(slashPos, mime.length-slashPos);
        break;
    }

    if (!(filename.indexOf(suffix) > 0)){
      filename = filename+'_'+fileBytes+addition+suffix;
    } else {
      let nDot = filename.lastIndexOf('.');
      filename = filename.substr(0, nDot)+'_'+fileBytes+addition+suffix;
    }
  }

  return filename;
}

function putImageFromSrc(aBack, addition){
  if (typeof addition == 'undefined'){
    addition = false;
  } else {
    addition = addition.replace(',', '');
  }
  
  let filename = getFilename(aBack.sSource);
      
  if (inputValues.imgCache && imageCache.has(aBack.sSource)){
    logThis('putImageFromSrc: imageCache found, skipping');
    return false;
  }

  let fileBytes = '';
  let mimeType = '';

  if (aBack.bData){
    fileBytes = byteCount(aBack.sSource);
    mimeType = getMimetype(aBack.sSource);
    filename = checkFilenameForSuffix(filename, mimeType, fileBytes, addition);
    // logThis(filename);

    urltoFile(aBack.sSource, filename, mimeType).then(file => uploadFile(file));

    imageCache.add(aBack.sSource);
  } else {
    getRequest = new XMLHttpRequest();
    getRequest.open('GET', aBack.sSource, true );
    getRequest.responseType = 'blob';
    getRequest.onload = function (oEvent) {
      logThis('Downloading Image File:');
      logThis(oEvent.target.response);
      switch (oEvent.target.status) {
        case 200:
          if (oEvent.target.response.type.match( validMimeTypes ) ){
            // logThis('Download successful, creating file');
            filename = checkFilenameForSuffix(filename, oEvent.target.response.type, oEvent.target.response.size, addition);
            let fileImage = new File([oEvent.target.response], filename);
            uploadFile(fileImage);
          } else {
            logThis(oEvent);
            logThis('not a valid MimeType: '+oEvent.target.response.type);
          }
          break;
        default:
          logThis(oEvent);
          break;
      }
      imageCache.add(aBack.sSource);
    };
    getRequest.send();
  }
}

function putInlineSVG(oSVG){
  let b64SVG = 'data:image/svg+xml;base64,'+btoa(oSVG.outerHTML);

  let svgImage = new Image();
  svgImage.src = b64SVG;

  let svgFilename = getFilename(svgImage.src);
  svgFilename = checkFilenameForSuffix(svgFilename, 'image/svg+xml', b64SVG.length, false);

  if (inputValues.imgCache && imageCache.has(svgFilename)){
    logThis(oSVG);
    logThis('putInlineSVG: imageCache found, skipping');
    return false;
  }

  urltoFile(b64SVG, svgFilename, 'image/svg+xml').then(file => uploadFile(file));

  imageCache.add(svgFilename);
}

function putCanvas(oCanvasSingle){
  let dataURL = oCanvasSingle.toDataURL();
  let filename = nCanvas;
  let mimeType = 'image/png';
  let path = window.location.pathname;

  fileBytes = byteCount(dataURL);

  if (path == '/'){
    filename = 'root_';
  } else {
    filename = path.replace(/\//g, '_');
  }
  filename == filename+'_'+fileBytes;

  filename = checkFilenameForSuffix(filename, mimeType, fileBytes, false);

  if (inputValues.imgCache && imageCache.has(filename)){
    logThis(oCanvasSingle);
    logThis('putCanvas: imageCache found, skipping');
    return false;
  }

  nCanvas++;
  
  urltoFile(dataURL, filename, mimeType).then(file => uploadFile(file));

  imageCache.add(filename);
}

function isData(sSource){
  sSource = sSource.trim().toLowerCase();
  nData = sSource.indexOf('data:');
  if (nData == 0){
    return true;
  } else {
    return false;
  }
}

function putImage(oImage){
  let filename = getFilename(oImage.currentSrc);

  if (inputValues.imgCache && imageCache.has(filename)){
    logThis(oImage);
    logThis('putImage: imageCache found, skipping');
    return false;
  }

  let mimeType = getMimetype(oImage.currentSrc);
  logThis(mimeType);

  switch (mimeType) {
    case 'image/x-icon':
      putImageFromSrc({
        sSource: oImage.currentSrc,
        bData: false,
        bSuccess: true
      });
      break;
    case 'image/svg+xml':
      putImageFromSrc({
        sSource: oImage.currentSrc,
        bData: false,
        bSuccess: true
      });
      break;
    default:
      if (oImage.naturalWidth > 1 && oImage.naturalHeight > 1){
        let dataURL = '';

        if (isData(oImage.currentSrc)){
          dataURL = oImage.currentSrc;
        } else {
          let canvas = null;
          let canvasContext = null;
          if (!mimeType.length > 0) mimeType = 'image/png';
        
          canvas = document.createElement("canvas");
          canvas.width = oImage.naturalWidth;
          canvas.height = oImage.naturalHeight;
        
          canvasContext = canvas.getContext("2d");
          canvasContext.drawImage(oImage, 0, 0, oImage.naturalWidth, oImage.naturalHeight);
        
          dataURL = canvas.toDataURL(mimeType);
        }
      
        fileBytes = byteCount(dataURL);
        filename = checkFilenameForSuffix(filename, mimeType, fileBytes, false);
        
        urltoFile(dataURL, filename, mimeType).then(file => uploadFile(file));
      }

      break;
  }

  imageCache.add(filename);
}

function checkForSrcSet(srcSet){
  srcArray = srcSet.split(',');
  srcArray.forEach(function(el){
    nSpace = el.indexOf(' ');
    if (nSpace > 0){
      el = el.substr(0, nSpace);
    }
  });
}

function getImagesFromAttributes(elAttributes){
  let tempAttr = [...elAttributes.attributes];
  asyncForEach(tempAttr, function(attribute){
    if (attribute.nodeName == 'srcset'){
      // logThis('srcset found');
      let srcSet = attribute.nodeValue.split(' ');
      srcSet.forEach(function(el, index){
        let tempSrc = sanitizeURL(el);
        if (tempSrc.bSuccess){
          putImageFromSrc(tempSrc, srcSet[index+1]);
        }
      });
    } else {
      // logThis(attribute.nodeValue);
      tempSrc = sanitizeURL(attribute.nodeValue);
      if (tempSrc.bSuccess){
        putImageFromSrc(tempSrc);
      }
    }
  });
}

function getImages(object){
  let computedBGString = getComputedStyle(object)['background-image'];
  let computedBG = filterBackgroundImage(computedBGString);
  if (computedBG.bSuccess){
    logThis('BG found');
    logThis(computedBG);
    putImageFromSrc(computedBG);
  }

  if (object.nodeName == 'IMG'){
    logThis('IMG found');
    logThis(object);

    if (object.complete){
      logThis('IMG complete');
      putImage(object);
    } else {
      logThis('IMG not complete');
      object.addEventListener('load', function(event){
        logThis('IMG loaded');
        putImage(event.target);
      })
    }
  } else if (object.nodeName == 'SVG') {
    logThis('SVG found');
    logThis(object);
    putInlineSVG(object);
  } else if (object.nodeName == 'CANVAS') {
    putCanvas(object);
  }
}

function eqSet(as, bs) {
  if (as.size !== bs.size) return false;
  for (var a of as) if (!bs.has(a)) return false;
  return true;
}

function getImagesInit(){
  let oAllDomTemp = new Set([...document.body.querySelectorAll('*')]);

  if (oAllDom.size > 0 && oAllDom.size !== oAllDomTemp.size){
    for (let curremtElement of oAllDomTemp){
      if (oAllDom.has(curremtElement)){
        oAllDomTemp.delete(curremtElement);
      }
    }
  }

  asyncForEach([...oAllDomTemp], function(el) {
    getImages(el);
  });

  oAllDom.add(oAllDomTemp);
}

function byteCount(string) {
  return encodeURI(string).split(/%..|./).length - 1;
}

function urltoFile(url, filename, mimeType){
  return (fetch(url)
      .then(function(res){return res.arrayBuffer();})
      .then(function(buf){return new File([buf], filename, {type:mimeType});})
  );
}

async function uploadFile(file){
  const sKey = inputValues.sFolder+'/'+dateCurrent+'/'+window.location.hostname+'/'+file.name;

  const params = {
    Bucket: inputValues.sBucket,
    Key: sKey
  }

  s3.headObject(params, (err, data) => {
    if (err){
      let s3putParams = {
        Body: file,
        Bucket: inputValues.sBucket,
        Key: sKey,
        ServerSideEncryption: "AES256"
      };
  
      s3.putObject(s3putParams, function(err, data) {
        if (err) logThis(err);
        // else     logThis(data);
      });
    }
  });
}

function init(storedSettings) {
  if (!storedSettings.inputValues) {
    browser.storage.local.set({inputValues});
  }
  inputValues = storedSettings.inputValues;

  if (inputValues.bInActive) {
    logThis('Divergierende Realitäten – Uploader ist deaktiviert');
    return false;
  }

  inputValues.sUserKey = serverResponse.sUserKey;
  inputValues.sUserSecret = serverResponse.sUserSecret;
  inputValues.sRegion = serverResponse.sRegion;
  inputValues.sBucket = serverResponse.sBucket;
  inputValues.imgCache = serverResponse.imgCache;
  inputValues.bDebugging = serverResponse.bDebugging;

  console.log(inputValues);
  
  let ubid = require( 'ubid' );
  ubid.get( function( error, signatureData ) {
    inputValues.sFolder = signatureData.browser.signature;
  } );

  AWS.config.update({
    accessKeyId: inputValues.sUserKey,
    secretAccessKey: inputValues.sUserSecret,
    region: inputValues.sRegion
  });

  s3 = new AWS.S3({
    params: {
      Bucket: inputValues.sBucket
    }
  });

  mutationObserver.observe(document, { attributes: true, childList: true, subtree: true });

  getImagesInit();
}

function checkEnablement(){
  let getRequest = new XMLHttpRequest();
  getRequest.open('GET', 'https://s3uploader.marcaux.de/', false );
  getRequest.responseType = 'json';
  getRequest.send(null);
  return getRequest.response;
}

function start(){
  serverResponse = checkEnablement();
  if (serverResponse.enabled){
    // console.log('Divergierende Realitäten – Uploader: Extension is enabled.');
    getInputValues = browser.storage.local.get();
    getInputValues.then(init, logThis);
  } else {
    console.log('Divergierende Realitäten – Uploader ist deaktiviert worden. https://www.zellerhoff.org');
  }
}

function restartLoading(){
  if (s3 == null){
    start();
  } else {
    if (enabled) {
      getImagesInit();
    }
  }
}

window.addEventListener('load', (event) => {
  restartLoading();
})

start();