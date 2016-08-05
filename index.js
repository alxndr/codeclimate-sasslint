/* global console, process, require */

var exec = require("child_process").exec;
var path = require("path");
var fs = require("fs");
// var package = require("./package.json");
// var arg = require("commander");
// arg
//   .version(package.version)
//   .option("-c, --config_file_path [path]", "directory which contains config file (config.json)")
//   .option("-d, --workspace_path [path]", "directory to analyze?")
//   .parse(process.argv);

// // Use the config_file_path parameter to find and parse a file named config.json, and store its keys and values in a data structure
// if (!arg.config_file_path) {
// 	console.error("Missing config_file_path!");
// 	process.exit(1);
// }
// var config_file_path = path.join(arg.config_file_path, "config.json");
// var config_file;
// try {
//   config_file = fs.readFileSync(config_file_path, "utf8");
// } catch (err) {
//   console.error(err);
//   console.error("…");
//   console.error("Could not find config file:", config_file_path);
//   process.exit(2);
// }
// var parsed_config;
// try {
//   parsed_config = JSON.parse(config_file);
// } catch (err) {
//   console.error(err);
//   console.error("…");
//   console.error("Could not parse JSON in config file:", config_file_path);
//   process.exit(3);
// }

// if (!parsed_config.include_paths) {
//   console.error("Missing key \"include_paths\" in config.json!");
//   process.exit(4);
// }




// Create a list of files to analyze using the include_paths key from the parsed config.json file and the workspace_path parameter

// Invoke the tool your engine is wrapping with the list of files to analyze


// Output issues that have been found in JSON format to STDOUT

var sasslint = require("sass-lint");





var glob = require('glob');

var buildFiles = function(paths) {
	// Returns all the file paths in the main directory that match the given pattern
  var files = [];

  paths.forEach(function(path) {
    var pattern = "/code/" + path + "**";
    files.push.apply(files, glob.sync(pattern, {}));
  });

	// console.error("\n\nfiles............", files, "\n\n");
  return files;
};


var diff = function(a1, a2) {
	// Returns an array of unique array values not included in the other provided array
  var result = [];

  for (var i = 0; i < a1.length; i++) {
    if (a2.indexOf(a1[i]) === -1) {
      result.push(a1[i]);
    }

  }
  return result;
};


var buildFilesWithExclusions = function(exclusions) {
	// Returns file paths based on the exclude_paths values in config file
  var allFiles = glob.sync("/code/**/**", {});
  var excludedFiles = buildFiles(exclusions);

  return diff(allFiles, excludedFiles);
};


var buildFilesWithInclusions = function(inclusions) {
	// Returns file paths based on the include_paths values in config file
  return buildFiles(inclusions);
};


// var filterFiles = require("src/filter_files");
var filterFiles = function(files) {
	// Filters the directory paths out
  return files.filter(function(file) {
    return !fs.lstatSync(file).isDirectory();
  });
};



var processFile = function(filepath) {
  // Prepare the grep string for execution (uses BusyBox grep)
	// console.error("tryna analyze...", filepath);
	var text = fs.readFileSync(filepath, "utf8");
	// console.error("text?", text);
	var filename = path.relative(process.cwd(), filepath);
	// console.error("filename?", filename);

	var result = sasslint.lintFileText({
		text: text,
		filename: filename
	}, {}, "/.sass-lint.yml");

	if (result && result.messages && result.messages.length) {
		result.messages.forEach(function(message) {
			console.error("sass lint message:", message);
			console.log(JSON.stringify({
				type: "issue",
				check_name: "something or other",
				description: message.message,
				categories: ["Bug Risk"],
				location:{
					path: filename,
					lines: {
						begin: message.line,
						end: message.line
					}
				}
			}) + "\0"); // eeach (?) issue must be followed by a null byte
		});
	}

	return;

  // Execute grep with the FIXME patterns
  exec("grep -inHwoE '(FIXME|TODO|HACK|XXX|BUG)' " + file, function (error, stdout) {
    var results = stdout.toString();

    if (results !== ""){
      // Parses grep output
      var lines = results.split("\n");

      lines.forEach(function(line, index, array){
        // grep spits out an extra line that we can ignore
        if(index < (array.length-1)){
          // Grep output is colon delimited
          var cols = line.split(":");

          // Remove remnants of container paths for external display
          var fileName = cols[0].split("/code/")[1];
          var lineNum = cols[1];
          var matchedString = cols[2];

          if (matchedString !== undefined){
            printIssue(fileName, parseInt(lineNum), matchedString);
          }
        }
      });
    }
  });
};


function run() {

	var analysisFiles = [];

	if (fs.existsSync("/config.json")) {
		var engineConfig = JSON.parse(fs.readFileSync("/config.json"));
		// console.error("got a config!", engineConfig);

		if (engineConfig.hasOwnProperty("include_paths")) {
			analysisFiles = buildFilesWithInclusions(engineConfig.include_paths);
		} else if (engineConfig.hasOwnProperty("exclude_paths")) {
			analysisFiles = buildFilesWithExclusions(engineConfig.exclude_paths);
		}
	}

	analysisFiles = filterFiles(analysisFiles);
	// Execute main loop and find fixmes in valid files
	analysisFiles.forEach(function(f){
		processFile(f); // will print any results to stdout... json chunks separated by a null byte
	});
}

run();
