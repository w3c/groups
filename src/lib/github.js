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

const repoQuery = `
  query ($org: String!, $cursor: String) {
    organization(login: $org) {
      repositories(first: 10, after: $cursor) {
        nodes {
          name
          homepageUrl
          description
          isArchived
          isPrivate
          w3cjson: object(expression: "HEAD:w3c.json") {
            ... on Blob {
              text
            }
          }
        }
        pageInfo {
          endCursor
          hasNextPage
        }
      }
    }
  }
`;

// Sanitize w3c.json files
function sanitizeW3CJSON(text) {
  function toNumber(identifier) {
    if (typeof identifier === "string") {
      if (identifier.match(/^[0-9]+$/)) {
        identifier = Number.parseInt(identifier);
      } else if (identifier.match(new RegExp("^[-\w]+/[-\w]+$"))) {
        monitor.error(`found a w3c.json using ${identifier}`);
      }
    }
    return identifier;
  }
  let w3c = {};
  try {
    w3c = JSON.parse(text);
  } catch (e) {
    w3c["repo-type"] = "invalid/json"
  }; // ignore
  if (w3c && Array.isArray(w3c.group)) {
    w3c.group = w3c.group.map(toNumber);
  } else if (w3c && w3c.group) {
    w3c.group = [toNumber(w3c.group)];
  }
  return w3c;
}

async function *listRepos(org) {

  for (let cursor = null; ;) {
    const res = await octokit.graphql(repoQuery, {org, cursor});
    for (const repo of res.organization.repositories.nodes) {
      repo.owner = { "login" : org };
      if (repo.w3cjson && repo.w3cjson.text) {
        repo.w3c = sanitizeW3CJSON(repo.w3cjson.text);
        delete repo.w3cjson;
      } else {
        repo.w3c = { "repo-type": "invalid/notfound" };
      }
      yield repo;
    }
    if (res.organization.repositories.pageInfo.hasNextPage) {
      cursor = res.organization.repositories.pageInfo.endCursor;
    } else {
      break;
    }
  }
}
octokit.listRepos = listRepos; // export

async function createContent(path, message, content, branch) {
  const file = await octokit.request("GET /repos/:repo/contents/:path", {
    repo: this.full_name,
    path: path
  });

  let sha;
  if (file.status === 200) {
    if (file.data.type !== "file") {
      throw new Error(`${path} isn't a file to be updated. it's ${file.data.type}.`);
    }
    // we're about to update the file
    sha = file.data.sha;
  } else if (file.status === 404) {
    // we're about to create the file
  } else {
    throw file;
  }
  content = Buffer.from(content, "utf-8").toString('base64');
  return octokit.request("PUT /repos/:repo/contents/:path", {
    repo: this.full_name,
    path: path,
    message: message,
    content: content,
    sha: sha,
    branch: branch
  });
}
octokit.createContent = createContent;

export default octokit;
