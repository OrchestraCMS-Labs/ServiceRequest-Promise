/* @preserve serviceRequest.min.js • v1.0 • a promised-based alternative API to OrchestraCMS’s doServiceRequest() */
/**
 *  This small library provides a promised-based alternative API to OrchestraCMS’s doServiceRequest() method.
 *  Instead of providing a single callback function, it uses the promise programming model to handle the request’s response.
 *
 *  For more detail and examples, see the accompanying ReadMe file.
 */

(function createServiceRequester (namespace, $) {

    /**
     * _createServiceRequestAs need never be called directly by the developer; instead, they invoke one of two wrapping functions
     * that inherently provide the appropriate first parameter, promiseType.
     *
     * @param promiseType - 'promise' to use the JS Promise model, or 'deferred' to use the jQuery promise model
     *
     * @param defaultParams - JS object
     *                          - expected to include the 'service' property
     *                          - typically provides the default 'action' property - can be overridden when invoking the returned function
     * @param defaultWrite - Boolean or String, where a string that includes 'write' (any case) is the same as passing true;
     *                       defaults to false (read-only), which means passing true as doServiceRequest()’s readonly option
     * @return a function that when invoked will initiate the specified service request and return either a native JS Promise or a jQuery Promise
     *
     * This interface intentionally does not support synchronous service requests.
     * This interface also does not yet support a handler complete callback function, and likely never will.
     *
     * The callback function passed to doServiceRequest as 'cb' is called both for AJAX success and AJAX error (in the
     * rare cases where the latter occurs). It receives two parameters:
     *
     * @param response - typically a JSON string, but that’s at the discretion of the endpoint’s action handler; expected to
     *                   be null in the case of an error callback
     * @param event - JS object - for success: {status: true; type: 'rpc'}
     *                          - for error:   {status: false; type: 'exception'; message: '<error message information>'}
     *                          - this event object simulates the Vf Remoting event object described at
     *                            https://developer.salesforce.com/docs/atlas.en-us.pages.meta/pages/pages_js_remoting_handling_response.htm
     *
     */
    _createServiceRequestAs = function (promiseType, defaultParams, defaultWrite) {
        // ReadOnly is the meaning of the parameter which will be passed to doServiceRequest, but the methods provided
        // by this library provide an optional parameter whose sense is ReadWrite which defaults to false.
        function resolveReadOnly (needWriteData, defaultWrite) {
            if (typeof needWriteData === 'undefined') {
                needWriteData = defaultWrite;
            }
            if (typeof needWriteData === 'string') {
                if (needWriteData.toLowerCase().indexOf('write') >= 0) {
                    needWriteData = true;
                } else {
                    // let a default ReadWrite change to ReadOnly if so specified
                    if (needWriteData.toLowerCase().indexOf('readonly') >= 0) {
                        needWriteData = false;
                    } else {
                        needWriteData = false;
                    }
                }
            }

            return !needWriteData;
        }   // resolveReadOnly

        function completedRequest (textStatus, xhr) {
            if (textStatus !== 'success') {
                console && console.warn('• Unsuccessful service request', textStatus, xhr);
            }
        }

        // --- begin createServiceRequestAs ---

        console && console.assert(promiseType === 'promise' || promiseType === 'deferred', 'unsupported promiseType specified');
        if (typeof defaultParams === 'string') {
            defaultParams = {service: defaultParams};
        }
        if (typeof defaultWrite === 'undefined') {
            defaultWrite = false;                         // different default than doServiceRequest()!
        }

        var srFunction;

        if (promiseType === 'promise') {
            srFunction = function (requestParams, needWriteData) {
                return new Promise(function _executor(resolve, reject) {
                    if (typeof requestParams === 'string') {
                        requestParams = {action: requestParams};
                    }
                    requestParams = $.extend({}, defaultParams, requestParams);
                    doServiceRequest(requestParams, {
                        cb: function __promiseCallback(response, event) {
                            // the event.status boolean speaks to the AJAXian nature of the request, not its execution logic
                            if (event.status) {
                                try {
                                    var parsedResponse = JSON.parse(response);
                                    resolve(parsedResponse);
                                } catch (ex) {
                                    resolve(response);
                                }
                            } else {
                                reject(event.message);
                            }
                        },
                        cbHandlerOnComplete: completedRequest,
                        readonly: resolveReadOnly(needWriteData, defaultWrite)
                    });
                });
            };
        } else {    // jQuery Deferred
            srFunction = function (requestParams, needWriteData) {
                var deferredRequest = $.Deferred();

                if (typeof requestParams === 'string') {
                    requestParams = {action: requestParams};
                }
                requestParams = $.extend({}, defaultParams, requestParams);
                doServiceRequest(requestParams, {
                    cb: function __deferredCallback(response, event) {
                        // the event.status boolean speaks to the AJAXian nature of the request, not its execution logic
                        if (event.status) {
                            try {
                                var parsedResponse = JSON.parse(response);
                                deferredRequest.resolve(parsedResponse);
                            } catch (ex) {
                                deferredRequest.resolve(response);
                            }
                        } else {
                            deferredRequest.reject(event.message);
                        }
                    },
                    cbHandlerOnComplete: completedRequest,
                    readonly: resolveReadOnly(needWriteData, defaultWrite)
                });

                return deferredRequest.promise();
            };
        }

        return srFunction;
    };  // createServiceRequestAs

    // call createServiceRequestAsPromise or createServiceRequestAsDeferred to get a function that is
    // subsequently called to perform service requests and that returns either a Promise or jQuery promise
    namespace.createServiceRequestAsPromise = _createServiceRequestAs.bind(namespace, 'promise');
    namespace.createServiceRequestAsDeferred = _createServiceRequestAs.bind(namespace, 'deferred');

    // call doServiceRequestAsPromise or doServiceRequestAsDeferred to immediately perform a service
    // request and get a Promise (or jQuery promise) in return
    namespace.doServiceRequestAsPromise = function (serviceClass, defaultParams, defaultWrite) {
        return namespace.createServiceRequestAsPromise(serviceClass, defaultParams, defaultWrite)();
    };

    namespace.doServiceRequestAsDeferred = function (serviceClass, defaultParams, defaultWrite) {
        return namespace.createServiceRequestAsDeferred(serviceClass, defaultParams, defaultWrite)();
    };
})(window, jQuery);