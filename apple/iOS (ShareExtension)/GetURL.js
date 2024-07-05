var GetURL = function () {};
GetURL.prototype = {
  run({ completionFunction }) {
    completionFunction({ URL: document.URL });
  }
};
var ExtensionPreprocessingJS = new GetURL();
