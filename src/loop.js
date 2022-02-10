import github from "./lib/github.js";
import w3c from "./lib/w3c.js";
import publish from "./lib/publish.js";
import * as monitor from "./lib/monitor.js";
import config from "./lib/config.js";
import fetch from 'node-fetch';

export function nudge() {
  cycle.catch(monitor.error);
}

let __settings;
export async function settings() {
  return __settings
    || (__settings = await fetch("https://w3c.github.io/groups/settings.json").then(res => res.json()));
}

async function cycle() {
  monitor.log("Starting a cycle");
  const timestamp = { "start" : new Date().toISOString()};
  const groups = await w3cgroups();
  monitor.log(`loaded ${groups.length} groups`)
  const allrepos = await repositories();
  monitor.log(`loaded ${allrepos.length} repositories`)
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
    publish.saveData(`${group.identifier}/group.json`, group);
    if (repos.length > 0) {
      publish.saveData(`${group.identifier}/repositories.json`, repos);
    }
    if (others.length > 0) {
      //others = others.map(o => Object.assign({"attachedGroup"}, o))
      publish.saveData(`${group.identifier}/others.json`, others);
    }
  }
  for (const entry of Object.entries(subgroups)) {
    publish.saveData(`${entry[0]}/groups.json`, entry[1]);
  }
  timestamp.end = new Date().toISOString();
  timestamp.refreshCycle = config.refreshCycle;
  publish.saveData('last-run.json', timestamp);
  monitor.log("Cycle completed");
}

async function w3cgroups() {
  let groups;
  if (config.debug) {
    groups = await publish.getData("groups.json");
  }
  if (!groups) {
    groups = [];
    for await (const group of w3c.listGroups()) {
      groups.push(group);
    }
    publish.saveData("groups.json", groups);
  }
  const identifiers = groups.map(g => { return {"id":g.id,"identifier":g.identifier};});
  publish.saveData("identifiers.json", identifiers);
  return groups;
}

async function repositories() {
  let repos;
  if (config.debug) {
    repos = await publish.getData("repositories.json");
  }
  if (!repos) {
    const w3c = await settings();
    repos = [];
    for (const [ org, default_id ] of Object.entries(w3c.owners)) {
      for await (const repo of github.listRepos(org)) {
        if (!repo.isPrivate) {
          delete repo.isPrivate; // we don't need this property
          if (!repo.w3c && !repo.w3c.group && default_id.length) {
            if (!repo.w3c) repo.w3c = {};
            repo.w3c.group = default_id;
          }
          if (config.debug) monitor.log(`found ${org}/${repo.name}`)
          repos.push(repo);
        }
      }
    }
    publish.saveData("repositories.json", repos);
  }
  return repos;
}

export
function init() {
  if (config.debug) {
    // abort
    monitor.warn(`refresh cycle not starting (debug mode)`);
    return;
  }
  function loop() {
    cycle().catch(err => {
      monitor.error(`refresh loop crashed\n ${JSON.stringify(err)}`);
    });
    setTimeout(loop, 1000 * 60 * 60 * config.refreshCycle);
  }
  loop();
}