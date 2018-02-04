var queued = 0;
var checked = 0;
var invalid = 0;
var warning = 0;
var redirected = 0;
var passed = 0;
chrome.extension.onMessage.addListener(

    function doStuff(request, sender) {

        if (request.action == "initial") {
            var rpBox;
            var blacklist = request.options.blacklist;
            blacklist = blacklist.split("\n");
            var cacheType = request.options.cache;
            var checkType = request.options.checkType;
            var optURL = request.options.optionsURL;

            // Inject Styles and Elements for feedback report
            createDisplay(optURL, cacheType, checkType);

            // Gather links
            var selectionSelector = getSelectorForSelection();

            if(selectionSelector){
                selectionSelector += ' a';
            }else{
                selectionSelector = 'a';
            }

            log('Using Selector: ' + selectionSelector);
            var pageLinks = document.querySelectorAll(selectionSelector);

            log(pageLinks);

            var totalvalid = pageLinks.length;

            for (var i = 0; i < pageLinks.length; i++) {
                var link = pageLinks[i];
                var isValidLink = false;
                isValidLink = isLinkValid(link, request, blacklist);
                if (isValidLink === true) {
                    queued += 1;
                    link.classList.add("CMY_Link");
                    checkURL(link, request.options);
                } else {
                    totalvalid -= 1;
                }
            }
            rbAmt.innerHTML = "Links: " + totalvalid;
            // When close element is clicked, hide UI
            document.getElementById("CMY_RB_Close").onclick = function() {
                removeDOMElement("CMY_ReportBox");
            };
            document.getElementById("CMY_RB_Export_Invalid").onclick = function() {
                var output = "";
                var badLinks = document.getElementsByClassName("CMY_Invalid");
                // Export csv string so it is accessible via excel
                if (badLinks.length > 0) {
                    output += "URL,OuterHTML\n";
                    for (i = 0; i < badLinks.length; i++) {
                        var outerHTML;
                        output += "\"";
                        output += badLinks[i].href;
                        output += "\",\"";
                        outerHTML = badLinks[i].outerHTML.replace(/"/g, '""');
                        output += outerHTML;
                        output += "\"\n";
                    }
                    output = output.rtrim(',');
                } else {
                    output = "No links to export";
                }
                console.log(output);
            };
            document.getElementById("CMY_RB_Export_Redirects").onclick = function() {
                var output = "";
                var redirectingLinks = document.getElementsByClassName("CMY_Redirect");
                // Export csv string so it is accessible via excel
                if (redirectingLinks.length > 0) {
                    output += "URL,Final URL,Status Code\n";
                    for (i = 0; i < redirectingLinks.length; i++) {
                        var outerHTML;
                        output += "\"";
                        output += redirectingLinks[i].href;
                        output += "\",\"";
                        output += redirectingLinks[i].getAttribute('cmy-final-url');
                        output += "\",\"";
                        output += redirectingLinks[i].getAttribute('cmy-final-url-status');
                        output += "\"\n";
                    }
                    output = output.rtrim(',');
                } else {
                    output = "No links to export";
                }
                console.log(output);
            };
            // Remove the event listener in the event this is run again without reloading
            chrome.extension.onMessage.removeListener(doStuff);
        }
        return true;

    });
// Send links to get checked via XHR
function checkURL(link, options) {
    // For empty href or no attribute href elements
    var checkElement = create("a", {
        href: link.href
    });
    chrome.extension.sendMessage({
            "action": "check",
            "url": checkElement.href
        },
        function(response) {
            // Assess Warnings
            var warnings = [];
            warnings = getTrailingHashWarning(options, link, warnings);
            warnings = getParseDOMWarning(options, link.href, response, warnings);
            // Pass in the outerHTML, the href attributes defaults to the current page if left empty
            warnings = getEmptyLinkWarning(options, link.outerHTML, warnings);
            warnings = getNoHrefLinkWarning(options, link, warnings);
            updateDisplay(link, warnings, response.status, response.lastStatus, response.lastUrl);
        });
}
function getSelectorForSelection() {
    var selection = window.getSelection();

    if(selection.rangeCount > 0) {
        var domNode = selection.getRangeAt(0).commonAncestorContainer;
        var selectorForNode = domNode.tagName;
        var idList = '';
        var classList = ''

        if(domNode.id != ''){
            idList = '#' + domNode.id;
        }

        if(domNode.classList.length > 0){
            classList = '.' + Array.from(domNode.classList).join('.');
        }

        return selectorForNode + idList + classList;
    }

    return '';
}