module.exports = {
    start: function () {
        // Config
        var configProxy = require('./config/proxy');

        // Config check
        if (!configProxy.proxyPort || !configProxy.elasticUrl) {
            console.log('Fill proxy port number, elasticsearch url beafore start');
            return;
        }

        // Imports
        var http = require('http'),
            httpProxy = require('http-proxy'),
            XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest
            logger = require('./logger');

        // Start proxy
        var proxy = httpProxy.createProxyServer({}),        
            server = http.createServer(function(req, res) {
                logger.info({
                    ip: req.connection.remoteAddress,
                    message: 'Connection open'
                });
                // Get POST body
                var dataReq = new Buffer('');
                req.on('data', function (data) {
                    dataReq = Buffer.concat([dataReq, data]);
                });
                // Save post body
                req.on('end', function () {
                    try {
                        req.extraQuery = JSON.parse(dataReq.toString());
                    } catch (e) {
                        logger.error({
                            message: e.message,
                            status: 500
                        });
                    }
                }).on('error', (e) => {
                    logger.error({
                        message: e.message,
                        status: 500
                    });
                });
                // Set proxy configuration
                proxy.web(req, res, configProxy.proxyOptions);
            }).listen(configProxy.proxyPort, function() {
                logger.info({
                    message: 'Elastic proxy started',
                    status: 'Start'
                });
            });

        // Listen for the `error` event on proxy.
        proxy.on('error', function (err, req, res) {
            var message = 'Elastic not responding.' + err;
            logger.error({
                message: message,
                status: 500
            });
            res.writeHead(500, {
                'Content-Type': 'text/plain'
            });
            res.end(message);
        });

        // Restream parsed body before proxying back
        proxy.on('proxyRes', function (proxyRes, req, res) {
            var body = new Buffer('');
            proxyRes.on('data', function (data) {
                body = Buffer.concat([body, data]);
            });
            proxyRes.on('end', function () {
                try {
                    // Elastic override query
                    if (req.extraQuery && req.extraQuery.query) {
                        logger.info({
                            ip: req.connection.remoteAddress,
                            message: 'Making extra queries'
                        });
                        // Main query response and new response
                        var mainQuery = JSON.parse(body.toString()),
                            readyResponse = null;

                        // Pagination vars
                        var from = req.extraQuery.from ? req.extraQuery.from : 0;
                            size = req.extraQuery.size + from,
                            realSize = req.extraQuery.size;

                        // Override pagination
                        var queryObj = req.extraQuery;
                        delete req.extraQuery;
                        delete queryObj.from;
                        queryObj.size = size;

                        // Extra queries
                        for (var element of queryObj.query.bool.must.simple_query_string.fields) {
                            var xhr = new XMLHttpRequest();
                            // Wait for response
                            xhr.open('POST', configProxy.elasticUrl, false);
                            xhr.onreadystatechange = function() {
                                if (xhr.readyState == 4 && xhr.status == 200) {
                                    // Make new response body
                                    var response = JSON.parse(xhr.responseText);
                                    if (readyResponse === null) {
                                        readyResponse = response;
                                    } else {
                                        readyResponse.hits.hits = readyResponse.hits.hits.concat(response.hits.hits);
                                    }
                                }
                            }
                            // Additional queries logic
                            if (readyResponse !== null) {
                                // Set exclusions by elastic _id
                                var excludeById = [];
                                var len = Object.keys(readyResponse.hits.hits).length;
                                // If no more extra info is needed
                                if (len >= size) {
                                    logger.info({
                                        ip: req.connection.remoteAddress,
                                        message: 'Stoping extra queryies loop! Requested size: ' + size + ', current size: ' + len
                                    });
                                    break;
                                };
                                for (var i = 0; i < len; i++) {
                                    excludeById.push(readyResponse.hits.hits[i]._id);
                                }
                                queryObj.query.bool.must_not.terms._id = excludeById;
                            }
                            // Choose query fields
                            queryObj.query.bool.must.simple_query_string.fields = [element];
                            xhr.send(JSON.stringify(queryObj));
                            logger.info({
                                ip: req.connection.remoteAddress,
                                message: `Extra queries for: [${element}]`
                            });
                        };
                        // Pagination
                        var out = [],
                            j = 0;
                        logger.info({
                            ip: req.connection.remoteAddress,
                            message: `Override pagination cut from: [${from}] to: [${size}]`
                        });
                        for (var i = from; i < size; i++) {
                            if (!readyResponse.hits.hits[i]) {
                                logger.info({
                                    ip: req.connection.remoteAddress,
                                    message: `Override pagination cut stoped at: [${i}], no more elements`
                                });
                                break;
                            }
                            out[j++] = readyResponse.hits.hits[i];
                        }
                        readyResponse.hits.hits = out;
                        out = null;
                        // Aggregations
                        readyResponse.aggregations = mainQuery.aggregations;
                        // Total hits
                        readyResponse.hits.total = mainQuery.hits.total;
                        // Form response
                        var resString = JSON.stringify(readyResponse);
                        const extraQuery = Buffer.from(resString);
                        proxyRes.headers['content-length'] = extraQuery.length;
                        res.writeHead(200, proxyRes.headers);
                        res.end(extraQuery.toString());
                    } else {
                        // No query response
                        res.writeHead(200, proxyRes.headers);
                        res.end(body.toString());
                    }
                    logger.info({
                        ip: req.connection.remoteAddress,
                        message: 'Responed successfully',
                        status: 200
                    });
                } catch (e) {
                    logger.error({
                        message: e.message,
                        status: 500
                    });
                }
            });
        });
    }
}
