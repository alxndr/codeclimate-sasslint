/* global console, process, require */

var fs = require("fs");
var glob = require('glob');
var path = require("path");

var sasslint = require("sass-lint");

var SASS_LINT_FILE = "/.sass-lint.yml";

function buildFiles(paths) {
  return paths.reduce(function(files, path) {
    files.push.apply(files, glob.sync("/code/" + path + "**", {}));
    return files;
  }, []);
}

function diff(a1, a2) {
  // Returns an array of unique array values not included in the other provided array
  var result = [];
  for (var i = 0; i < a1.length; i++) {
    if (a2.indexOf(a1[i]) === -1) {
      result.push(a1[i]);
    }
  }
  return result;
}

function buildFilesWithExclusions(exclusions) {
  // Returns file paths based on the exclude_paths values in config file
  var allFiles = glob.sync("/code/**/**", {});
  var excludedFiles = buildFiles(exclusions);
  return diff(allFiles, excludedFiles);
}

function buildFilesWithInclusions(inclusions) {
  // Returns file paths based on the include_paths values in config file
  return buildFiles(inclusions);
}

function filterFiles(files) {
  // Filters the directory paths out
  return files.filter(function(file) {
    return !fs.lstatSync(file).isDirectory();
  });
}

function formatIssue(message, filename) {
  var description = message.message;
  if (message.column !== 1) {
    description += " (at column: " + message.column + ")";
  }
  return JSON.stringify({
    type: "issue",
    check_name: message.ruleId,
    description: description,
    categories: ["Bug Risk"],
    location:{
      path: filename,
      lines: {
        begin: message.line,
        end: message.line
      }
    }
  }) + "\0"; // each (?) issue must be followed by a null byte
}

function processFile(filepath) {
  var text = fs.readFileSync(filepath, "utf8");
  var filename = path.relative(process.cwd(), filepath);
  var result = sasslint.lintFileText({
    text: text,
    filename: filename
  }, {}, SASS_LINT_FILE);
  if (result && result.messages && result.messages.length) {
    result.messages.forEach(function(message) {
      console.error("sass lint message:", message);
      console.log(formatIssue(message, filename));
    });
  }
}

function run() {
  var analysisFiles = [];
  if (fs.existsSync("/config.json")) {
    var engineConfig = JSON.parse(fs.readFileSync("/config.json"));
    if (engineConfig.hasOwnProperty("include_paths")) {
      analysisFiles = buildFilesWithInclusions(engineConfig.include_paths);
    } else if (engineConfig.hasOwnProperty("exclude_paths")) {
      analysisFiles = buildFilesWithExclusions(engineConfig.exclude_paths);
    }
  }

  filterFiles(analysisFiles).forEach(function(filepath) {
    processFile(filepath); // will print any results to stdout... json chunks separated by a null byte
  });
}

run();
