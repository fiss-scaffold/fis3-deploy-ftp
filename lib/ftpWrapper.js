var ftp = require('ftp');
var path = require('path');

function ftpWrapper(opts) {
    var client;
    opts.remoteDir = opts.remoteDir.replace(/^\/+/, '');

    function initClient(cb) {
        client = new ftp();
        client.on('ready', cb);
        client.on('error', function(err, info) {
            var message = err.message;
            console.log('init ftp: error ' + message);
            client.destroy();
        });
        client.connect(opts.connect);
    }

    function consoleinfo(info) {
        if (opts.console) {
            console.info(info);
        }
    }

    function getRemoteName(filename) {
        return path.join(opts.remoteDir, filename).replace(/\\/g, '/');
    }


    function addFile(filename, remoteName, source, callback) {
        if (!client) {
            initClient(addFile.bind(null, filename, remoteName, source, callback));
            return;
        }
        remoteName = getRemoteName(remoteName) || getRemoteName(filename);
        consoleinfo("Uploading " + filename + " as " + remoteName + ".");
        client.put(source || filename, remoteName, function(err) {
            consoleinfo(err ? "Couldn't upload " + filename + ":\n" + err : filename + ' uploaded.');
            callback(err);
        });
    }

    function addDir(filename, callback) {
        if (!client) {
            initClient(addDir.bind(null, filename, callback));
            return;
        }
        var remoteName = getRemoteName(filename);
        consoleinfo("Adding  " + remoteName + ".");
        client.mkdir(remoteName, true, function(err) {
            consoleinfo(err ? "Couldn't add " + filename + ":\n" + err : filename + ' added.');
            callback(err);
        });
    }

    function removeFile(filename, callback) {
        if (!client) {
            initClient(removeFile.bind(null, filename, callback));
            return;
        }
        var remoteName = getRemoteName(filename);
        consoleinfo("Deleting  " + remoteName + ".");
        client.delete(remoteName, function(err) {
            consoleinfo(err ? "Couldn't delete " + filename + ":\n" + err : filename + ' deleted.');
            callback(err);
        });
    }



    function removeDir(filename, callback) {
        if (!client) {
            initClient(removeDir.bind(null, filename, callback));
            return;
        }

        var remoteName = getRemoteName(filename);
        consoleinfo("Deleting  " + remoteName + ".");
        client.rmdir(remoteName, function(err) {
            consoleinfo(err ? "Couldn't delete " + filename + ":\n" + err : filename + ' deleted.');
            callback(err);
        });
    }

    function listFiles(dirname, callback) {
        if (!client) {
            initClient(listFiles.bind(null, dirname, callback));
            return;
        }
        var remoteName = getRemoteName(dirname);
        consoleinfo("Listing  " + remoteName + ".");

        // some bs to deal with this callback possibly being called multiple times.
        // the result we want is not always the first or last one called.
        var result = [],
            resultTimer;
        client.list(remoteName, function(err, list) {
            if (err) {
                result = true;
                consoleinfo("Couldn't list " + dirname + ":\n" + err);
                return callback(err, list);
            }
            if (result === true || result.length) return;

            if (list && list.length) {
                result = list;
            }
            if (resultTimer) return;
            resultTimer = setTimeout(function() {
                consoleinfo(dirname + ' listed.');
                callback(null, result);
            }, 100);
        });
    }

    function checkDir(dirname, callback) {
        if (!client) {
            initClient(checkDir.bind(null, dirname, callback));
            return;
        }
        var remoteName = getRemoteName(dirname);
        consoleinfo("checkDirExists  [" + remoteName + "]");
        var existed = false;
        client.list(remoteName, function(err, list) {
            if (err) {
                throw new Error(err);
            }

            if (!list || list.length == 0) {
                consoleinfo('[' + dirname + '] is not existed.');
                return callback(null, existed);
            } else {
                existed = true;
                consoleinfo(dirname + ' existed.');
                callback(null, existed);
            }

        });
    }


    function end() {
        client.end();
    }

    return {
        addFile: addFile,
        removeFile: removeFile,
        addDir: addDir,
        removeDir: removeDir,
        listFiles: listFiles,
        checkDir: checkDir,
        end: end
    };
}

module.exports = ftpWrapper;