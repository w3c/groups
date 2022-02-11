import github from "./lib/github.js";
import w3c from "./lib/w3c.js";
import * as publish from "./lib/publish.js";
import * as monitor from "./lib/monitor.js";
import config from "./lib/config.js";
import fetch from 'node-fetch';

export function nudge() {
  cycle.catch(monitor.error);
}

// set in init()
let settings = {};

async function cycle() {
  monitor.log("Starting a cycle");
  const start = new Date().toISOString();
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
    await publish.saveGroupRepositories(group, repos, others);
  }
  for (const entry of Object.entries(subgroups)) {
    await publish.saveData(`${entry[0]}/groups.json`, entry[1]);
  }
  const end = new Date().toISOString();
  monitor.loopTimestamp({start, end});
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
    repos = [];
    for (const [ org, default_ids ] of Object.entries(settings.owners)) {
      for await (const repo of github.listRepos(org)) {
        if (!repo.isPrivate) {
          delete repo.isPrivate; // we don't need this property
          if ((!repo.w3c || !repo.w3c.group) && default_ids.length) {
            if (!repo.w3c) repo.w3c = {};
            repo.w3c.group = default_ids;
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
  let doCycle = true;
  if (config.debug) {
    // abort
    monitor.warn(`refresh cycle not starting (debug mode)`);
    doCycle = false;
  }
  function loop() {
    fetch("https://w3c.github.io/groups/settings.json").then(res => res.json())
     .then(_settings => {
       settings = _settings; // save
     }).then(cycle).then(() => {
       setTimeout(loop, 1000 * 60 * 60 * settings.refreshCycle);
     }).catch(err => {
       console.log(err);
       monitor.error(`refresh loop crashed - ${err}`);
     });
  }
  loop();
}