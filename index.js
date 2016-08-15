/* global console, process, require */

var fs = require("fs");
var glob = require("glob");
var path = require("path");
var yaml = require("yamljs");
var minimatch = require("minimatch");

var sasslint = require("sass-lint");

var CWD = process.cwd();
var MAIN_DIR = "/code";
var SASS_CONFIG_FILE = ".sass-lint.yml";
var sass_config = path.join(MAIN_DIR, SASS_CONFIG_FILE);

function buildFiles(paths) {
  return paths.reduce(function(files, filepath) {
    files.push.apply(files, glob.sync(path.join(MAIN_DIR, filepath, "**")));
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
  var allFiles = glob.sync(path.join(MAIN_DIR, "**", "**"));
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

function constructFileInfo(filepath) {
  return {
    text: fs.readFileSync(filepath, "utf8"),
    filename: filepath,
    format: "scss" // TODO determine whether it's sass or scss
  };
}

function processFile(filepath) {
  var filename = path.relative(CWD, filepath); // this working?
  var fileInfo = constructFileInfo(filepath);
  var more_sass_options = {options:{
  }};
  var result = sasslint.lintFileText(fileInfo, more_sass_options, sass_config);
  if (result && result.messages && result.messages.length) {
    result.messages.forEach(function(message) {
      console.log(formatIssue(message, filename));
    });
  }
}

function determineAnalysisFiles() {
  if (fs.existsSync("/config.json")) {
    var engineConfig = JSON.parse(fs.readFileSync("/config.json"));
    if (engineConfig.hasOwnProperty("include_paths")) {
      return buildFilesWithInclusions(engineConfig.include_paths);
    }
    if (engineConfig.hasOwnProperty("exclude_paths")) {
      return buildFilesWithExclusions(engineConfig.exclude_paths);
    }
  }
  return [];
}

function run() {
  var analysisFiles = filterFiles(determineAnalysisFiles());

  var sass_config_text = fs.readFileSync(path.relative(CWD, sass_config), "utf8");
  var includeGlobs = yaml.parse(sass_config_text).files.include;
  if (includeGlobs) {
    if (!Array.isArray(includeGlobs)) {
      includeGlobs = [includeGlobs];
    }
    analysisFiles = analysisFiles.filter(function(file) {
      return !!includeGlobs.find(function(includeGlob) {
        return minimatch(file, includeGlob);
      });
    });
  }

  analysisFiles.forEach(function(filepath) {
    processFile(filepath); // will print any results to stdout... json chunks separated by a null byte
  });
}

run();
