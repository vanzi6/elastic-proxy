module.exports = {
    start: function () {
        // Config
        var config = require('./config');

        // Config check
        if (!config.proxyPort || !config.elasticUrl) {
            console.log('Fill proxy port number, elasticsearch url beafore start');
            return;
        }

        // Imports
        var http = require('http'),
            httpProxy = require('http-proxy'),
            XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

        // Start proxy
        var proxy = httpProxy.createProxyServer({}),        
            server = http.createServer(function(req, res) {

                var dataReq = new Buffer('');
                req.on('data', function (data) {
                    dataReq = Buffer.concat([dataReq, data]);
                });

                req.on('end', function () {
                    try {
                        req.extraQuery = JSON.parse(dataReq.toString());
                    } catch (e) {
                        console.error(e.message);
                    }
                }).on('error', (e) => {
                    console.error(e.message);
                });

                proxy.web(req, res, config.proxyOptions);
            }).listen(config.proxyPort, function() {
                console.log('Elastic proxy started -> port: ' + config.proxyPort);
            });

        // Listen for the `error` event on proxy.
        proxy.on('error', function (err, req, res) {
            res.writeHead(500, {
                'Content-Type': 'text/plain'
            });
            res.end('Elastic not responding.' + err);
        });

        // Restream parsed body before proxying back
        proxy.on('proxyRes', function (proxyRes, req, res) {
            var body = new Buffer('');
            proxyRes.on('data', function (data) {
                body = Buffer.concat([body, data]);
            });
            proxyRes.on('end', function () {
                try {
                    // Elastic join
                    if (req.extraQuery && req.extraQuery.query) {
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
                            xhr.open('POST', config.elasticUrl, false);
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
                                for (var i = 0; i < len; i++) {
                                    excludeById.push(readyResponse.hits.hits[i]._id);
                                }
                                queryObj.query.bool.must_not.terms._id = excludeById;
                            }
                            // Choose query fields
                            queryObj.query.bool.must.simple_query_string.fields = [element];
                            xhr.send(JSON.stringify(queryObj));
                        };
                        // Pagination
                        var len = Object.keys(readyResponse.hits.hits).length,
                            out = [],
                            j = 0;
                        for (var i = from; i < size; i++) {
                            if (!readyResponse.hits.hits[i]) {
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
                        const t = Buffer.from(resString);
                        proxyRes.headers['content-length'] = t.length;
                        res.writeHead(200, proxyRes.headers);
                        res.end(t.toString());
                    }
                    // No query response
                    res.writeHead(200, proxyRes.headers);
                    res.end(body.toString());
                } catch (e) {
                    console.error(e.message);
                }
            });
        });

    }
}
