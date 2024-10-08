/*@license
Fullscreen Image Zoom and Pan with Jquery
version @VERSION@

Original version by Samil Hazir (https://github.com/saplumbaga)
later versions by JM Alarcon (https://github.com/jmalarcon/)

https://github.com/saplumbaga/jquery.pan
https://github.com/jmalarcon/jquery.pan
 */

(function ($) {

    var init = true;    //Private var to flag the first time the method is called
    var pageOptions;    //The options stablished for the plugin in the page on initialization

    //Thottle function that wraps an event handler and prevents too many calls per scond to certain events
    function throttle(func, limit) {
        let lastFunc;
        let lastRan;

        return function() {
            const context = this;
            const args = arguments;

            if (!lastRan) {
                func.apply(context, args);
                lastRan = Date.now();
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(function() {
                    if ((Date.now() - lastRan) >= limit) {
                        func.apply(context, args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        };
    }


    $.fn.extend({

        pan: function (options) {   //, init = true, addImage = true

            if (init) {
                init = false;   //After the first call is not an initialization of the plugin

                //Default options
                var defOptions = {
                    showRotationControls : true,    //If the rotation controls should be shown
                    minLoadingTime: 0, //The minimum amount of time in ms the loading animation should be shown (by default it shows the images immediately)
                    wheelZoomSpeed: 100,    //The speed of the zoom in and out with the mouse wheel (in ms)
                };

                //To keep backwards compatibility (until version 4.x it has just one boolean option to show the rotation controls)
                //check if the parameter is a boolean instead of an object and convert it to a new options object
                if (typeof options === "boolean") {
                    options = { showRotationControls: options};
                }

                //Extend options with defaults
                pageOptions = $.extend(defOptions, options);

                var panWrapper = document.createElement('div');
                var $panWrapper = $(panWrapper);
                $panWrapper.addClass("panWrapper");

                var panImg = document.createElement('img');
                $(panImg).addClass("i").css("position", "absolute");

                var loadingImg = document.createElement('div');
                $(loadingImg).attr('id', 'loading').addClass("loading");
                $panWrapper.append(loadingImg);

                var buttonsWrapper = document.createElement('div');
                $(buttonsWrapper).addClass("buttonsWrapper");

                var zi = document.createElement('a');
                $(zi).addClass("controls in");

                var zo = document.createElement('a');
                $(zo).addClass("controls out");

                //Check if the rotation controls must be shown or not
                if (pageOptions.showRotationControls) {
                    var rc = document.createElement('a');
                    $(rc).addClass("controls rc");

                    var ra = document.createElement('a');
                    $(ra).addClass("controls ra");
                }

                //Add a hidden link button to navigate to
                var link = document.createElement('a');
                $(link).addClass("controls link");

                var close = document.createElement('a');
                $(close).addClass("controls close");
                $panWrapper.append(close);

                //Add buttons to the buttons wrapper in the right order
                $(buttonsWrapper).append(zi); //Zoom in
                if (pageOptions.showRotationControls) {
                    $(buttonsWrapper).append(rc);   //Rotate clockwise
                }
                $(buttonsWrapper).append(link); //Link
                if (pageOptions.showRotationControls) {
                    $(buttonsWrapper).append(ra);   //Rotation anti-clockwise
                }
                $(buttonsWrapper).append(zo); //Zoom out

                $panWrapper.append(panImg);   //Zoomed image container
                $panWrapper.append(buttonsWrapper);   //Buttons container
                $("body").append(panWrapper);

                $(zi).on('click', function (e) {
                    var panImg = $(".panWrapper img.i");
                    panImg.css("width", parseInt(parseInt(panImg.css("width")) * 1.2));
                    panInit(e);
                });

                $(zo).on('click', function (e) {
                    var panImg = $(".panWrapper img.i");
                    panImg.css("width", parseInt(parseInt(panImg.css("width")) / 1.2) + 1);
                    panInit(e);
                });

                if (pageOptions.showRotationControls) {
                    $(rc).on('click', function (e) {
                        var panImg = $(".panWrapper img.i").first();
                        var angle = parseInt((panImg.data('rotAngle'))) || 0;
                        angle = (angle + 90) % 360
                        panImg.css({ 'transform': 'rotate(' + angle + 'deg)' });
                        panImg.data('rotAngle', angle);
                        panInit(e);
                    });

                    $(ra).on('click', function (e) {
                        var panImg = $(".panWrapper img.i").first();
                        var angle = (panImg.data('rotAngle')) || 0;
                        angle = (angle - 90) % 360
                        panImg.css({ 'transform': 'rotate(' + angle + 'deg)' });
                        panImg.data('rotAngle', angle);
                        panInit(e);
                    });
                }

                $(close).on('click', function (e) {
                    $(".panWrapper").fadeOut("slow", function () {
                        var panImg = $(".panWrapper img.i").first();
                        panImg.data('rotAngle', 0);
                        panImg.css({ 'transform': 'rotate(0)' });
                        //Remove possible links
                        $(link).removeAttr("href").removeAttr("target");
                        //Show the body scroll again
                        window.document.body.classList.remove('no-scroll');
                    });
                });

                $(panImg).on('click', function () {
                    $(close).trigger('click');
                });

                $panWrapper.on('mousemove', function (e) {
                    panInit(e);
                });

                //To make it passive (and enhance the CLS metric) I use the JS event directly
                panWrapper.addEventListener('touchmove', throttle(function (e) {
                        panInit(e);
                    }, pageOptions.wheelZoomSpeed),    //One call per wheelZoomSpeed
                    { passive: true }
                );

                $("body").on('keydown', function (e) {
                    if (e.keyCode == 27) {
                        $(close).trigger('click');
                    }
                });

                //Passive wheel event to zoom in and out
                panWrapper.addEventListener('wheel', throttle(function (wheelEvent) {
                        if (wheelEvent.deltaY > 0)
                            $(zo).trigger('click');
                        else
                            $(zi).trigger('click');

                        panInit(wheelEvent);
                    }, pageOptions.wheelZoomSpeed),
                    { passive: true }
                );
            }

            //Finds the image elements in the element passed as argument, or one of its descendants.
            //Always returns an array
            function __getImgElts(root) {
                //If the element is already an image, return it
                if (root.tagName == "IMG") return [root];
                //If it's not an image, find the first image in its descendants
                var imgElts = $(root).find("img");
                if (imgElts.length > 0) {
                    return imgElts.get();
                }
                else return null;
            }

            //Checks if one image is smaller that its natural size
            //or if it has a data-big attribute
            //The parameter is always an image element
            function __imgNeedsZoom(imgElt) {
                if (imgElt) {
                    if (imgElt.getAttribute('data-big'))
                        return true;

                    //If it's an image or contains one, check if it's already in its natural size
                    var nW = imgElt.naturalWidth || 0,
                        nH = imgElt.naturalHeight || 0,
                        w = $(imgElt).outerWidth(),
                        h = $(imgElt).outerHeight();
                    return (nW > w || nH > h);
                }
                else {
                    //If it doesn't have a data-big attribute or is not smaller thant it's natural dimensions, can't zoom it
                    return false;
                }
            }

            //The next function encapsulates the whole logic of getting the pointer position in every case
            function __getPointerPos(event, prop) {
                var pos = event[prop];  //Normal mousemove event
                if (pos == undefined) {
                    pos = 0;    //Default value if the next conditionals don't work
                    if (event.touches)  //jQuery for touch pointer move. Not available in jQuery 1.x
                        pos = event.touches[0][prop];
                    else if (event.originalEvent) { //original window event
                        if (event.originalEvent.touches)
                            pos = event.originalEvent.touches[0][prop];
                    }
                }
                return pos;
            }
            function __getPointerPosX(event) {
                return __getPointerPos(event, 'pageX');
            }
            function __getPointerPosY(event) {
                return __getPointerPos(event, 'pageY');
            }

            function panInit(event) {
                //CAN'T USE event.preventDefault(); BECAUSE IT'S A PASSIVE HANDLER FOR SOME EVENTS!! (wheel & touchmove)
                //That's because of CLS metrics in Google Lighthouse that affect performance and SEO
                var panImg = $(".panWrapper img.i");
                var panWrapper = $(".panWrapper");

                var w = parseInt(panImg.css("width"));  //Image width
                var h = parseInt(panImg.css("height")); //Image height
                var vpW = panWrapper.width();   //Viewport width
                var vpH = panWrapper.height();   //Viewport height

                //Swap dimensions if image is rotated from the original angle (0)
                var angle = parseInt((panImg.data('rotAngle'))) || 0;
                var rotated = angle % 180 != 0;
                if (rotated) {
                    w = [h, h = w][0];    //for old browsers that don't support destructuration
                }

                /*Margin on the left (difference between the width of the container and the image width).
                If the image is wider than the container, it's negative (the image goes outside the viewport),
                if the image is less wide than the container, it's positive (it's the ammount of margin on the left to center the image) */
                var ml = -(w - vpW);
                //Idem with the height
                var mt = -(h - vpH);
                //The amount of scroll from the top in the current page, to correct for pointer position
                var scrollHOffset = window.pageXOffset || document.documentElement.scrollLeft,
                    scrollVOffset = window.pageYOffset || document.documentElement.scrollTop;

                //Left position of the pointer in page (first, try mouse, then try jQuery touch, default case native event touch for old jQuery versions), and in Viewport (substracting the scroll from left)
                var posOfPointerInPageX = __getPointerPosX(event),
                    posOfPointerInViewportX = posOfPointerInPageX - scrollHOffset,
                    vpW = panWrapper.width();   //Viewport width
                if (posOfPointerInViewportX < 0) posOfPointerInViewportX = 0; //In touch devices this can be slightly outside the viewport boundaries
                if (posOfPointerInViewportX > vpW) posOfPointerInViewportX = vpW;

                //Top position of the pointer in page (first, try mouse, then try jQuery touch, default case native event touch for old jQuery versions), and in Viewport (substracting the scroll from top)
                var posOfPointerInPageY = __getPointerPosY(event),
                    posOfPointerInViewportY = posOfPointerInPageY - scrollVOffset,
                    vpH = panWrapper.height();   //Viewport height
                if (posOfPointerInViewportY < 0) posOfPointerInViewportY = 0; //In touch devices this can be slightly outside the viewport boundaries
                if (posOfPointerInViewportY > vpH) posOfPointerInViewportY = vpH;

                //New left: the new amount we need to move from the left to show other parts of the image depending on the current mouse position
                var nl = Math.floor((ml * posOfPointerInViewportX) / vpW);

                //New top: the new amount we need to move from the top to show other parts of the image depending on the current mouse position
                var nt = Math.floor(mt * posOfPointerInViewportY / vpH);

                var leftWhenCentered = (vpW - w) / 2;
                var topWhencentered = (vpH - h) / 2;

                if (vpW > w && vpH > h) {   //If the image is smaller than the available viewport, center it in both directions
                    nl = leftWhenCentered;
                    nt = topWhencentered;
                }
                else if (vpW > w) { //If the image width is less than the viewport, center it horizontally
                    nl = leftWhenCentered;
                }
                else if (vpH > h) { //If the image height is less than the viewport height, center it vertically
                    nt = topWhencentered;
                }

                //Position image in viewport as calculated
                var tX = 0, tY = 0;
                switch (angle % 360) {
                    case 0:
                        tX = nl;
                        tY = nt;
                        break;
                    case 90:
                    case -270:
                        tX = nt;
                        tY = -(w + nl);
                        break;
                    case 180:
                    case -180:
                        tX = -(w + nl)
                        tY = -(h + nt);
                        break;
                    case 270:
                    case -90:
                        tX = -h - nt;
                        tY = nl;
                        break;
                }
                panImg.css('transform', 'rotate(' + angle + 'deg) translate(' + tX + 'px,' + tY + 'px)');

            }

            //if (addImage) {
                //Remove from set those elements that don't contain images smaller than their natural size (they don't need zoom at all)
                //or elements that don't have a data-big attribute (they don't have a big image to zoom to)
                var finalSet = $(this).filter(function() {
                    if ($(this).attr('data-big'))
                        return true;

                    //Get all the images inside the element to check for zoom needed
                    var imgElts = __getImgElts(this);
                    //Check each image to see if it needs zoom
                    if (imgElts.length > 0) {
                        for (var i = 0; i < imgElts.length; i++) {
                            //if any of them needs zoom, include the element in the final set
                            if (__imgNeedsZoom(imgElts[i])) {
                                return true;
                            }
                        }
                        //If no image needs zoom, don't include the element in the final set
                        return false;
                    }
                    else {
                        return false;
                    }
                });

                finalSet.css('cursor', 'zoom-in');

                finalSet.on('click', function(e) {
                    var t = $(this);
                    /*
                    Check the data-big attribute of the element.
                    Sometimes the element to initiate the zoom is not an image
                    (maybe it has a background or we just want to use it as a zoom trigger)
                    */
                    var big = t.attr("data-big");
                    //If there's no data-big attribute, use the data-big or src of the image inside the element that fired the event
                    if (big == undefined) {
                        //Check if the element that fired the event is an image
                        if (e.target.tagName == "IMG") {
                            big = e.target.getAttribute('data-big') || e.target.src;
                        }
                        else {
                            //This shouldn't happen, but just in case (don't do anything)
                            return;
                        }
                    }

                    //See if the current element is a link and has a href attribute
                    var href = t.attr("href");
                    var linkElt = t;
                    //If the element is not a link, find the first parent that is a link
                    if (!href) {
                        var parents = t.parents("a");
                        if (parents.length > 0) {
                            linkElt = $(parents[0]);
                            href = linkElt.attr("href");
                        }
                    }
                    //In case it has a link, add the href to the link button (and the specified target, and the title (if available) or the URL)
                    if (href) $(link).attr("href", href).attr("target", linkElt.attr("target")).attr("title", linkElt.attr("title") ? linkElt.attr("title") : href);

                    //Show the loader
                    $('#loading').addClass('loading');
                    //Hide the previous image if any
                    var imgViewer = $('.panWrapper img.i').css('display', 'none').attr('src', '');

                    //Prevent body scroll because of the wheel event using the .no-scroll CSS class in the body
                    //Can't use the preventDefault in the wheel event because it's passive
                    window.document.body.classList.add('no-scroll');

                    //Show the viewer
                    $(".panWrapper").show();
                    imgViewer.css("width", "auto").attr("src", big).on('load', function () {
                        var target = this;
                        var showImage = function () {
                            $('#loading').removeClass('loading');
                            target.style.display = "";
                        };

                        if (pageOptions.minLoadingTime > 0) {
                            panInit(e);
                            setTimeout(
                                    function () {
                                        showImage();
                                    }, pageOptions.minLoadingTime
                                );
                            }
                            else {
                                panInit(e);
                               showImage();
                            }
                    });
                    return false;
                });

                return finalSet;
            //}
        }
    });

})(jQuery);
