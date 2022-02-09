import fs from "fs/promises";
import path from 'path';
import config from "./config.js";

// export
const publish = {}

/* Create a directory if needed */
let DIRS = { }; // remember which directory you created
async function mkdir(param_path) {
  if (DIRS[param_path]) {
    return Promise.resolve(param_path);
  } else {
    return fs.mkdir(param_path, {"recursive": true}).catch(err => {
      DIRS[param_path] = true;
      return param_path;
    });
  }
};

async function saveData(fs_path, data) {
  async function _writeData(filepath, data) {
    if (config.debug) console.log("save " + filepath);
    await mkdir(path.dirname(filepath));
    return fs.writeFile(filepath, data);
  }

  const filepath = path.resolve(config.dest_directory, fs_path);

  data = JSON.stringify(data);

  // first read the file
  let current = await fs.readFile(filepath).then(JSON.parse).catch(e=>undefined);

  if (current) {

    if (JSON.stringify(current) === data) {
      return {"status": "done", "details": "no need to save it"};
    } else {
      return _writeData(filepath, data);
    }
  } else {
    return _writeData(filepath, data);
  }
}
publish.saveData = saveData;

// used for debugging purpose
async function getData(fs_path) {

  const filepath = path.resolve(config.dest_directory, fs_path);

  // first read the file
  return fs.readFile(filepath).then(JSON.parse).catch(e=>undefined);
}
publish.getData = getData;

export default publish;
