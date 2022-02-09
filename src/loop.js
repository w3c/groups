import github from "./lib/github.js";
import w3c from "./lib/w3c.js";
import publish from "./lib/publish.js";
import * as monitor from "./lib/monitor.js";
import config from "./lib/config.js";
import fetch from 'node-fetch';
import { REPL_MODE_SLOPPY } from "repl";

export function nudge() {
  return 0;
}

let __settings;
export async function settings() {
  return __settings
    || (__settings = await fetch("https://w3c.github.io/groups/settings.json").then(res => res.json()));
}



export async function init() {
  monitor.log("init");
  const groups = await w3cgroups();
  console.log(`loaded ${groups.length} groups`)
  const allrepos = await repositories();
  console.log(`loaded ${allrepos.length} repositories`)
  function getRepos(id) {
    return allrepos.filter(r => r.w3c && r.w3c.group && r.w3c.group.includes(id));
  }
  const subgroups = {};
  for (const group of groups) {
    const repos = getRepos(group.id);
    let others = [];
    const other_ids = groups.filter(g => g.members && g.members.filter(m => m.id === group.id).length > 0);
    for (const other of other_ids) {
      others = others.concat(getRepos(other.id));
    }
    const category = group.identifier.split('/')[0];
    if (!subgroups[category]) subgroups[category] = [];
    subgroups[category].push(group);
    publish.saveData(`groups/${group.identifier}/group.json`, group);
    if (repos.length > 0) {
      publish.saveData(`groups/${group.identifier}/repositories.json`, repos);
    }
    if (others.length > 0) {
      //others = others.map(o => Object.assign({"attachedGroup"}, o))
      publish.saveData(`groups/${group.identifier}/others.json`, others);
    }
  }
  for (const entry of Object.entries(subgroups)) {
    publish.saveData(`groups/${entry[0]}/groups.json`, entry[1]);
  }
}

async function w3cgroups() {
  let groups;
  if (config.debug) {
    groups = await publish.getData("groups/groups.json");
  }
  if (!groups) {
    groups = [];
    for await (const group of w3c.listGroups()) {
      groups.push(group);
    }
    publish.saveData("groups/groups.json", groups);
  }
  const identifiers = groups.map(g => { return {"id":g.id,"identifier":g.identifier};});
  publish.saveData("groups/identifiers.json", identifiers);
  return groups;
}

async function repositories() {
  let repos;
  if (config.debug) {
    repos = await publish.getData("groups/repositories.json");
  }
  if (!repos) {
    const w3c = await settings();
    const orgs_n = w3c.owners;
    const orgs = [
      "w3c",
      "w3ctag",
      "webassembly",
      "immersive-web",
      "wicg",
      "webaudio",
      "webgpu",
      "webmachinelearning",
      "w3cping",
      "privacycg"
    ]
    repos = [];
    for (const org of orgs) {
      for await (const repo of github.listRepos(org)) {
        if (!repo.isPrivate) {
          console.log(repo);
          repos.push(repo);
        }
      }
    }
    publish.saveData("groups/repositories.json", repos);
  }
  return repos;
}

init();