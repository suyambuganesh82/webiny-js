// TODO remove
// @ts-nocheck
/* eslint-disable */

const util = newUtil();
const inliner = newInliner();
const fontFaces = newFontFaces();
const images = newImages();

// Default impl options
const defaultOptions = {
    // Default is to fail on error, no placeholder
    imagePlaceholder: undefined,
    // No caching by default
    cacheBust: true
};

const domtoimage = {
    toPng,
    impl: {
        fontFaces: fontFaces,
        images: images,
        util: util,
        inliner: inliner,
        options: {}
    }
};

export default domtoimage;

function toSvg(node, options) {
    options = options || {};
    copyOptions(options);
    return Promise.resolve(node)
        .then(function (node) {
            return cloneNode(node, options.filter, true);
        })
        .then(embedFonts)
        .then(inlineImages)
        .then(applyOptions)
        .then(function (clone) {
            if (typeof options.onDocument === "function") {
                clone = options.onDocument(clone);
            }
            return makeSvgDataUri(clone, util.width(node), util.height(node));
        });

    function applyOptions(clone) {
        if (options.width) clone.style.width = options.width + "px";
        if (options.height) clone.style.height = options.height + "px";

        return clone;
    }
}

/**
 * @param {Node} node - The DOM Node object to render
 * @param {Object} options - Rendering options, @see {@link toSvg}
 * @return {Promise} - A promise that is fulfilled with a PNG image data URL
 * */
function toPng(node, options) {
    return draw(node, options || {}).then(function (canvas) {
        return canvas.toDataURL();
    });
}

function copyOptions(options) {
    // Copy options to impl options for use in impl
    if (typeof options.imagePlaceholder === "undefined") {
        domtoimage.impl.options.imagePlaceholder = defaultOptions.imagePlaceholder;
    } else {
        domtoimage.impl.options.imagePlaceholder = options.imagePlaceholder;
    }

    if (typeof options.cacheBust === "undefined") {
        domtoimage.impl.options.cacheBust = defaultOptions.cacheBust;
    } else {
        domtoimage.impl.options.cacheBust = options.cacheBust;
    }
}

function draw(domNode, options) {
    return toSvg(domNode, options)
        .then(util.makeImage)
        .then(util.delay(100))
        .then(function (image) {
            const canvas = document.createElement("canvas");
            const { width } = options;
            const aspect = image.width / image.height;
            const height = width / aspect;

            canvas.width = width;
            canvas.height = height;

            canvas
                .getContext("2d")
                .drawImage(image, 0, 0, image.width, image.height, 0, 0, width, height);

            return canvas;
        });
}

function cloneNode(node, filter, root) {
    if (!root && filter && !filter(node)) return Promise.resolve();

    return Promise.resolve(node)
        .then(makeNodeCopy)
        .then(function (clone) {
            return cloneChildren(node, clone, filter);
        })
        .then(function (clone) {
            return processClone(node, clone);
        });

    function makeNodeCopy(node) {
        if (node instanceof HTMLCanvasElement) return util.makeImage(node.toDataURL());
        return node.cloneNode(false);
    }

    function cloneChildren(original, clone, filter) {
        var children = original.childNodes;
        if (children.length === 0) return Promise.resolve(clone);

        return cloneChildrenInOrder(clone, util.asArray(children), filter).then(function () {
            return clone;
        });

        function cloneChildrenInOrder(parent, children, filter) {
            var done = Promise.resolve();
            children.forEach(function (child) {
                done = done
                    .then(() => cloneNode(child, filter))
                    .then(function (childClone) {
                        if (childClone) parent.appendChild(childClone);
                    });
            });
            return done;
        }
    }

    function processClone(original, clone) {
        if (!(clone instanceof Element)) return clone;

        return Promise.resolve()
            .then(cloneStyle)
            .then(clonePseudoElements)
            .then(copyUserInput)
            .then(fixSvg)
            .then(function () {
                return clone;
            });

        function cloneStyle() {
            copyStyle(window.getComputedStyle(original), clone.style);

            function copyStyle(source, target) {
                if (source.cssText) target.cssText = source.cssText;
                else copyProperties(source, target);

                function copyProperties(source, target) {
                    util.asArray(source).forEach(function (name) {
                        target.setProperty(
                            name,
                            source.getPropertyValue(name),
                            source.getPropertyPriority(name)
                        );
                    });
                }
            }
        }

        function clonePseudoElements() {
            [":before", ":after"].forEach(function (element) {
                clonePseudoElement(element);
            });

            function clonePseudoElement(element) {
                var style = window.getComputedStyle(original, element);
                var content = style.getPropertyValue("content");

                if (content === "" || content === "none") return;

                var className = util.uid();
                clone.className = clone.className + " " + className;
                var styleElement = document.createElement("style");
                styleElement.appendChild(formatPseudoElementStyle(className, element, style));
                clone.appendChild(styleElement);

                function formatPseudoElementStyle(className, element, style) {
                    var selector = "." + className + ":" + element;
                    var cssText = style.cssText ? formatCssText(style) : formatCssProperties(style);
                    return document.createTextNode(selector + "{" + cssText + "}");

                    function formatCssText(style) {
                        var content = style.getPropertyValue("content");
                        return style.cssText + " content: " + content + ";";
                    }

                    function formatCssProperties(style) {
                        return util.asArray(style).map(formatProperty).join("; ") + ";";

                        function formatProperty(name) {
                            return (
                                name +
                                ": " +
                                style.getPropertyValue(name) +
                                (style.getPropertyPriority(name) ? " !important" : "")
                            );
                        }
                    }
                }
            }
        }

        function copyUserInput() {
            if (original instanceof HTMLTextAreaElement) clone.innerHTML = original.value;
            if (original instanceof HTMLInputElement) clone.setAttribute("value", original.value);
        }

        function fixSvg() {
            if (!(clone instanceof SVGElement)) return;
            clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

            if (!(clone instanceof SVGRectElement)) return;
            ["width", "height"].forEach(function (attribute) {
                var value = clone.getAttribute(attribute);
                if (!value) return;

                clone.style.setProperty(attribute, value);
            });
        }
    }
}

function embedFonts(node) {
    return fontFaces.resolveAll().then(function (cssText) {
        const styleNode = document.createElement("style");
        node.appendChild(styleNode);
        styleNode.appendChild(document.createTextNode(cssText));
        return node;
    });
}

function inlineImages(node) {
    return images.inlineAll(node).then(function () {
        return node;
    });
}

function makeSvgDataUri(node, width, height) {
    return Promise.resolve(node)
        .then(function () {
            node.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
            return (
                '<foreignObject x="0" y="0" width="100%" height="100%">' +
                node.outerHTML +
                "</foreignObject>"
            );
        })
        .then(function (foreignObject) {
            return (
                '<svg xmlns="http://www.w3.org/2000/svg" width="' +
                width +
                '" height="' +
                height +
                '">' +
                foreignObject +
                "</svg>"
            );
        })
        .then(function (svg) {
            return "data:image/svg+xml;base64," + btoa(svg);
        });
}

function newUtil() {
    return {
        escape,
        mimeType,
        dataAsUrl,
        isDataUrl,
        resolveUrl,
        getAndEncode,
        uid: uid(),
        delay,
        asArray,
        escapeXhtml,
        makeImage,
        width,
        height
    };

    function mimes() {
        /*
         * Only WOFF and EOT mime types for fonts are 'real'
         * see http://www.iana.org/assignments/media-types/media-types.xhtml
         */
        const WOFF = "application/font-woff";
        const JPEG = "image/jpeg";

        return {
            woff: WOFF,
            woff2: WOFF,
            ttf: "application/font-truetype",
            eot: "application/vnd.ms-fontobject",
            png: "image/png",
            jpg: JPEG,
            jpeg: JPEG,
            gif: "image/gif",
            tiff: "image/tiff",
            svg: "image/svg+xml"
        };
    }

    function parseExtension(url) {
        const match = /\.([^\.\/]*?)$/g.exec(url);
        return match ? match[1] : "";
    }

    function mimeType(url) {
        const extension = parseExtension(url).toLowerCase().split("?")[0];
        return mimes()[extension] || "";
    }

    function isDataUrl(url) {
        return url.search(/^(data:)/) !== -1;
    }

    function toBlob(canvas) {
        return new Promise(function (resolve) {
            var binaryString = window.atob(canvas.toDataURL().split(",")[1]);
            var length = binaryString.length;
            var binaryArray = new Uint8Array(length);

            for (var i = 0; i < length; i++) binaryArray[i] = binaryString.charCodeAt(i);

            resolve(
                new Blob([binaryArray], {
                    type: "image/png"
                })
            );
        });
    }

    function canvasToBlob(canvas) {
        if (canvas.toBlob)
            return new Promise(function (resolve) {
                canvas.toBlob(resolve);
            });

        return toBlob(canvas);
    }

    function resolveUrl(url, baseUrl) {
        const doc = document.implementation.createHTMLDocument();
        const base = doc.createElement("base");
        doc.head.appendChild(base);
        const a = doc.createElement("a");
        doc.body.appendChild(a);
        base.href = baseUrl;
        a.href = url;
        return a.href;
    }

    function uid() {
        let index = 0;

        return function () {
            return "u" + fourRandomChars() + index++;

            function fourRandomChars() {
                /* see http://stackoverflow.com/a/6248722/2519373 */
                return ("0000" + ((Math.random() * Math.pow(36, 4)) << 0).toString(36)).slice(-4);
            }
        };
    }

    function makeImage(uri) {
        return new Promise(function (resolve, reject) {
            var image = new Image();
            image.onload = function () {
                resolve(image);
            };
            image.onerror = reject;
            image.src = uri;
        });
    }

    function getAndEncode(url) {
        var TIMEOUT = 30000;
        if (domtoimage.impl.options.cacheBust) {
            // Cache bypass so we dont have CORS issues with cached images
            // Source: https://developer.mozilla.org/en/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest#Bypassing_the_cache
            url += (/\?/.test(url) ? "&" : "?") + new Date().getTime();
        }

        return new Promise(function (resolve) {
            var request = new XMLHttpRequest();

            request.onreadystatechange = done;
            request.ontimeout = timeout;
            request.responseType = "blob";
            request.timeout = TIMEOUT;
            request.open("GET", url, true);
            request.send();

            var placeholder;
            if (domtoimage.impl.options.imagePlaceholder) {
                var split = domtoimage.impl.options.imagePlaceholder.split(/,/);
                if (split && split[1]) {
                    placeholder = split[1];
                }
            }

            function done() {
                if (request.readyState !== 4) return;

                if (request.status !== 200) {
                    if (placeholder) {
                        resolve(placeholder);
                    } else {
                        fail("cannot fetch resource: " + url + ", status: " + request.status);
                    }

                    return;
                }

                var encoder = new FileReader();
                encoder.onloadend = function () {
                    var content = encoder.result.split(/,/)[1];
                    resolve(content);
                };
                encoder.readAsDataURL(request.response);
            }

            function timeout() {
                if (placeholder) {
                    resolve(placeholder);
                } else {
                    fail("timeout of " + TIMEOUT + "ms occured while fetching resource: " + url);
                }
            }

            function fail(message) {
                console.error(message);
                resolve("");
            }
        });
    }

    function dataAsUrl(content, type) {
        return "data:" + type + ";base64," + content;
    }

    function escape(string) {
        return string.replace(/([.*+?^${}()|\[\]\/\\])/g, "\\$1");
    }

    function delay(ms) {
        return function (arg) {
            return new Promise(function (resolve) {
                setTimeout(function () {
                    resolve(arg);
                }, ms);
            });
        };
    }

    function asArray(arrayLike) {
        const array = [];
        const length = arrayLike.length;
        for (var i = 0; i < length; i++) array.push(arrayLike[i]);
        return array;
    }

    function escapeXhtml(string) {
        return string.replace(/#/g, "%23").replace(/\n/g, "%0A");
    }

    function width(node) {
        const leftBorder = px(node, "border-left-width");
        const rightBorder = px(node, "border-right-width");
        return node.scrollWidth + leftBorder + rightBorder;
    }

    function height(node) {
        var topBorder = px(node, "border-top-width");
        var bottomBorder = px(node, "border-bottom-width");
        return node.scrollHeight + topBorder + bottomBorder;
    }

    function px(node, styleProperty) {
        var value = window.getComputedStyle(node).getPropertyValue(styleProperty);
        return parseFloat(value.replace("px", ""));
    }
}

function newInliner() {
    const URL_REGEX = /url\(['"]?([^'"]+?)['"]?\)/g;

    return {
        inlineAll,
        shouldProcess,
        impl: { readUrls, inline }
    };

    function shouldProcess(string) {
        return string.search(URL_REGEX) !== -1;
    }

    function readUrls(string) {
        var result = [];
        var match;
        while ((match = URL_REGEX.exec(string)) !== null) {
            result.push(match[1]);
        }
        return result.filter(function (url) {
            return !util.isDataUrl(url);
        });
    }

    function inline(string, url, baseUrl, get) {
        return Promise.resolve(url)
            .then(function (url) {
                return baseUrl ? util.resolveUrl(url, baseUrl) : url;
            })
            .then(get || util.getAndEncode)
            .then(function (data) {
                return util.dataAsUrl(data, util.mimeType(url));
            })
            .then(function (dataUrl) {
                return string.replace(urlAsRegex(url), "$1" + dataUrl + "$3");
            });

        function urlAsRegex(url) {
            return new RegExp("(url\\(['\"]?)(" + util.escape(url) + ")(['\"]?\\))", "g");
        }
    }

    function inlineAll(string, baseUrl, get) {
        if (nothingToInline()) return Promise.resolve(string);

        return Promise.resolve(string)
            .then(readUrls)
            .then(function (urls) {
                var done = Promise.resolve(string);
                urls.forEach(function (url) {
                    done = done.then(function (string) {
                        return inline(string, url, baseUrl, get);
                    });
                });
                return done;
            });

        function nothingToInline() {
            return !shouldProcess(string);
        }
    }
}

function newFontFaces() {
    return {
        resolveAll: resolveAll,
        impl: {
            readAll: readAll
        }
    };

    function resolveAll() {
        return readAll(document)
            .then(function (webFonts) {
                return Promise.all(
                    webFonts.map(function (webFont) {
                        return webFont.resolve();
                    })
                );
            })
            .then(function (cssStrings) {
                return cssStrings.join("\n");
            });
    }

    function readAll() {
        return Promise.resolve(util.asArray(document.styleSheets))
            .then(getCssRules)
            .then(selectWebFontRules)
            .then(function (rules) {
                return rules.map(newWebFont);
            });

        function selectWebFontRules(cssRules) {
            return cssRules
                .filter(function (rule) {
                    return rule.type === CSSRule.FONT_FACE_RULE;
                })
                .filter(function (rule) {
                    return inliner.shouldProcess(rule.style.getPropertyValue("src"));
                });
        }

        function getCssRules(styleSheets) {
            let cssRules = [];
            styleSheets.forEach(function (sheet) {
                if (sheet.cssRules) {
                    try {
                        util.asArray(sheet.cssRules || []).forEach(cssRules.push.bind(cssRules));
                    } catch (e) {
                        console.log(
                            "Error while reading CSS rules from " + sheet.href,
                            e.toString()
                        );
                    }
                }
            });
            return cssRules;
        }

        function newWebFont(webFontRule) {
            return {
                resolve: function resolve() {
                    var baseUrl = (webFontRule.parentStyleSheet || {}).href;
                    return inliner.inlineAll(webFontRule.cssText, baseUrl);
                },
                src: function () {
                    return webFontRule.style.getPropertyValue("src");
                }
            };
        }
    }
}

function newImages() {
    return {
        inlineAll: inlineAll,
        impl: { newImage }
    };

    function newImage(element) {
        return {
            inline: inline
        };

        function inline(get) {
            if (util.isDataUrl(element.src)) return Promise.resolve();

            return Promise.resolve(element.src)
                .then(get || util.getAndEncode)
                .then(function (data) {
                    return util.dataAsUrl(data, util.mimeType(element.src));
                })
                .then(function (dataUrl) {
                    element.removeAttribute("srcset");

                    return new Promise(function (resolve, reject) {
                        element.onload = resolve;
                        element.onerror = reject;
                        element.src = dataUrl;
                    });
                });
        }
    }

    function inlineAll(node) {
        if (!(node instanceof Element)) return Promise.resolve(node);

        return inlineBackground(node).then(function () {
            if (node instanceof HTMLImageElement) return newImage(node).inline();
            else
                return Promise.all(
                    util.asArray(node.childNodes).map(function (child) {
                        return inlineAll(child);
                    })
                );
        });

        function inlineBackground(node) {
            var background = node.style.getPropertyValue("background");

            if (!background) return Promise.resolve(node);

            return inliner
                .inlineAll(background)
                .then(function (inlined) {
                    node.style.setProperty(
                        "background",
                        inlined,
                        node.style.getPropertyPriority("background")
                    );
                })
                .then(function () {
                    return node;
                });
        }
    }
}
