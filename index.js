var _ = fis.util;
var fs = require('fs');
var path = require('path');
var ftpWrapper = require('./lib/ftpWrapper');
var ftpClient;
var deliver;

function getDeliver(options) {
    ftpClient = ftpWrapper(options);
    var dirMap = {};
    return function(localfile, remoteFile, content, cb) {
        //console.log('deliver %s==>%s', localfile, remoteFile);
        var dirname = path.dirname(remoteFile);
        if (dirname === '.') {
            dirMap[dirname] = true;
        }
        if (dirMap[dirname]) {
            ftpClient.addFile(localfile, remoteFile, content, cb);
        } else {
            ftpClient.checkDir(dirname, function(err, result) {
                if (err) {
                    console.error(err);
                    ftpClient.end();
                    return;
                }
                //result = true/false
                if (!result) {
                    //不存在
                    ftpClient.addDir(dirname, function(err) {
                        if (err) {
                            console.error(err);
                            ftpClient.end();
                            return;
                        }
                        dirMap[dirname] = true;
                        ftpClient.addFile(localfile, remoteFile, content, cb);
                    });
                } else {
                    dirMap[dirname] = true;
                    ftpClient.addFile(localfile, remoteFile, content, cb);
                }
            });
        }
    }
}

function releaseDeliver(){
    ftpClient.end();
    ftpClient = null;
    deliver = null;
}

function upload(options, release, content, file, callback) {
    if (!deliver) {
        deliver = getDeliver(options);
    }
    var filename = release;
    var destDir = options.dest;
    var localFile = destDir + filename;
    var remoteDir = options.remoteDir;
    var remoteFile = filename.replace(/^\//, '');

    deliver(localFile, remoteFile, content, function(err, res) {
        if (err) {
            console.error(err);
            return callback(err);
            //error
        } else {
            var time = '[' + fis.log.now(true) + ']';
            process.stdout.write(
                ' - '.green.bold +
                time.grey + ' ' +
                filename.replace(/^\//, '') +
                ' >> '.yellow.bold +
                remoteDir + remoteFile +
                '\n'
            );
             callback();
        }
    });
}

module.exports = function(options, modified, total, callback) {
    fis.log.info('now begin ftp upload ...');
    if (!options.remoteDir) {
        throw new Error('options.remoteDir is required!');
    } else if (!options.connect) {
        throw new Error('options.connect is required!');
    }
    var steps = [];
    var exclude = options.exclude || [];
    var include = options.include || [];

    function isExcluded(filename) {
        if (!exclude.length) {
            return false;
        }
        return exclude.filter(function(excludedPath) {
            return filename.indexOf(excludedPath) === 0;
        }).length > 0;
    }

    function isIncluded(filename) {
        if (!include.length) {
            return true;
        }
        return include.filter(function(includedPath) {
            return filename.indexOf(includedPath) === 0;
        }).length > 0;
    }


    modified.forEach(function(file) {
        var reTryCount = options.retry;
        var fileTo = file.getHashRelease();
        if (!isIncluded(fileTo) || isExcluded(fileTo)) {
            return;
        }
        steps.push(function(next) {
            var _upload = arguments.callee;
            upload(options, fileTo, file.getContent(), file, function(error) {
                if (error) {
                    if (!--reTryCount) {
                        throw new Error(error);
                    } else {
                        fis.log.warn('**---retry upload---')
                        _upload();
                    }
                } else {
                    next();
                }
            });
        });
    });

    //清理ftp
    steps.push(function(next) {
       releaseDeliver();
       next();
    })

    _.reduceRight(steps, function(next, current) {
        return function() {
            current(next);
        };
    }, callback)();
};

module.exports.options = {
    // 允许重试两次。
    retry: 2
};

