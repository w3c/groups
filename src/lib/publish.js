import fs from "fs/promises";
import path from 'path';
import config from "./config.js";
import github from "./github.js";
import { getRepoPage } from "./utils.js";

/* Create a directory if needed */
let DIRS = {}; // remember which directory you created
async function mkdir(param_path) {
  if (DIRS[param_path]) {
    return Promise.resolve(param_path);
  } else {
    return fs.mkdir(param_path, { "recursive": true }).catch(err => {
      DIRS[param_path] = true;
      return param_path;
    });
  }
};

/**
 * Do we need to save a data?
 *
 * @param {String} filename Absolute file system path
 * @param {String} data JSON.stringify JS object
 * @returns
 */
async function needsSave(filename, data, format) {
  // first read the file
  let current = await fs.readFile(filename)
    .then(raw=>(format==="json")?JSON.parse(raw):raw).catch(e => undefined);

  if (current) {
    const value = (format==="json")?JSON.stringify(current):current;
    if (value === data) {
      return false;
    } else {
      return true;
    }
  } else {
    return true;
  }
}

/**
 * Save a JS object in the file system and GitHub based on the relative path
 *
 * @param {String} relative_path relative file system path
 * @param {Object} data Object to be saved
 * @returns true if the object needed to be saved, false otherwise
 */
export
async function saveData(relative_path, data) {
  const filepath = path.resolve(config.destination, relative_path);
  let format = "text";
  if (typeof data === "object") {
    data = JSON.stringify(data);
    format = "json";
  }

  // this will write to GitHub then to the local disk
  async function _writeData(filepath, data) {
    if (config.debug) {
      console.log("save " + filepath);
    } else {
      await github.createContent(relative_path, "Update from upstream", data, "main").then(data => {
        if (data.status !== 200) {
          throw data;
        }
      });
    }
    return mkdir(path.dirname(filepath)).then(() => fs.writeFile(filepath, data));
  }

  if (await needsSave(filepath, data, format)) {
    return _writeData(filepath, data).then(() => true);
  } else {
    return false;
  }
}

/**
 * Save group information in the file system and in GitHub
 *
 * @param {Object} group The Group from the W3C API
 * @param {Array} repos The repositories from the GitHub API directly owned by the Group
 * @param {Array} others The repositories from the GitHub API indirectly owned by the Group (e.g. task forces)
 * @returns true if the information needed to be saved, false otherwise
 */
export
async function saveGroupRepositories(group, repos, others) {
  let changed = await saveData(`${group.identifier}/data-group.json`, group);
  if (repos.length > 0) {
    changed |= await saveData(`${group.identifier}/data-repositories.json`, repos);
  }
  if (others.length > 0) {
    changed |= await saveData(`${group.identifier}/data-others.json`, others);
  }
  if (changed) {
    let html = await getRepoPage(group, repos, others);
    await saveData(`${group.identifier}/repositories.html`,html);
  }
  return true;
}

/**
 * used for debugging purpose only
 * @param {*} relative file system path
 * @returns {Object} the object
 */
export
async function getData(fs_path) {

  const filepath = path.resolve(config.destination, fs_path);

  // first read the file
  return fs.readFile(filepath).then(JSON.parse).catch(e => undefined);
}
