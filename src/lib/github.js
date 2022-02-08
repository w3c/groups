import config from './config.js';
import { Octokit as OCore } from "@octokit/core";
import { throttling } from "@octokit/plugin-throttling";
import * as monitor from "./monitor.js";

const Octokit = OCore.plugin(throttling);

const MAX_RETRIES = 3;

const octokit = new Octokit({
  auth: config.ghToken,
  throttle: {
    onRateLimit: (retryAfter, options) => {
      if (options.request.retryCount < MAX_RETRIES) {
        monitor.warn(`Rate limit exceeded, retrying after ${retryAfter} seconds`)
        return true;
      } else {
        monitor.error(`Rate limit exceeded, giving up after ${MAX_RETRIES} retries`);
        return false;
      }
    },
    onAbuseLimit: (retryAfter, options) => {
      if (options.request.retryCount < MAX_RETRIES) {
        monitor.warn(`Abuse detection triggered, retrying after ${retryAfter} seconds`)
        return true;
      } else {
        monitor.error(`Abuse detection triggered, giving up after ${MAX_RETRIES} retries`);
        return false;
      }
    }
  }
});

// encoding is https://nodejs.org/dist/latest/docs/api/buffer.html#buffer_buffers_and_character_encodings
// decoder is "json" or "text"
function decode(content, encoding, decoder = "text") {
  if (encoding) {
    content = Buffer.from(content, encoding).toString();
  }
  switch (decoder) {
  case "json":
    try {
      return JSON.parse(content);
    } catch (e) {
      return undefined;
    }
  default:
    return content;
  }
}

function transformContent(ghObject, encoding) {
  try {
    if (ghObject.type && ghObject.type === 'file') {
      return decode(ghObject.content, ghObject.encoding, encoding);
    }
  } catch (e) {
    //otherwise ignore
    console.log(e);
  }
  return (encoding == "json") ? {} : "";
}

octokit.getContent = async (repo, path, encoding) => {
  try {
    const response = await octokit.request(`GET /repos/${repo}/contents/${path}`);
    return transformContent(response.data, encoding);
  } catch (e) {
    if (e.status === 304) {
      monitor.error(`compounded requests aren't allowed to return 304`);
    }
    //otherwise ignore
  }
  return (encoding == "json") ? {} : "";
}

octokit.getW3C = async (repo) => {
  function getNumber(identifier) {
    if (typeof identifier === "string" && identifier.match(/^[0-9]+$/)) {
      identifier = Number.parseInt(identifier);
    }
    return identifier;
  }
  try {
    const w3c = await octokit.getContent(repo, "w3c.json", "json");
    let groups = [];
    if (Array.isArray(w3c.group)) {
      w3c.group = w3c.group.map(getNumber);
    } else if (w3c.group !== undefined) {
      w3c.group = [getNumber(w3c.group)];
    }
    return w3c;
  } catch (e) {
    return undefined;
  }
}

export default octokit;
