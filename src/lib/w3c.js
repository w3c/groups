import config from "./config.js";
import fetch from 'node-fetch';
import * as monitor from './monitor.js';

// export default
const w3c = {};

function sanitizeGroups(group) {
  group.identifier = group._links.self.href.replace('https://api.w3.org/groups/','');
}

async function *listGroups() {
  if (config.debug) monitor.log("load groups");
  for (let link = "https://api.w3.org/groups"; ;) {
    let apiURL = new URL(link);
    apiURL.searchParams.set("apikey", config.w3capikey);
    apiURL.searchParams.set("embed", "1"); // grab everything
    let data = await fetch(apiURL).then(res => res.json());
    for (const group of data._embedded.groups) {
      sanitizeGroups(group);
      yield group;
    }
    if (data.pages && data.pages > 1 && data.page < data.pages) {
      link = data._links.next.href;
    } else {
      break;
    }
  }
}
w3c.listGroups = listGroups;



export default w3c;
