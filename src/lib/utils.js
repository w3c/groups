import jsdom from "jsdom";
const { JSDOM } = jsdom;

/**
 * Get the HTML Repository page for the Group
 *
 * @param {Object} group the group from the W3C API (with group.identifier)
 * @param {Array} repos Repositories from the GH API directly owned by the Group
 * @param {Array} others Repositories from the GH API indirectly owned by the Group
 * @returns {String} the HTML document
 */
export
async function getRepoPage(group, repos, others) {

  // remove archived repositories
  repos  = repos.filter(r => !r.isArchived);
  others = others.filter(r => !r.isArchived);

  // For each group, we fetch its tools page and tweak the HTML as needed
  // this enables some robustness with the tools page changed
  const dom = await JSDOM.fromURL(`https://www.w3.org/groups/${group.identifier}/tools`);
  const doc = dom.window.document;
  const title = `${group.name} - Repositories`;

  doc.querySelector("title").textContent = title;
  doc.querySelector("#main h1").textContent = title;

  const dl = doc.querySelector("#nav-tools dl");
  const tdt = dl.querySelector("dt");
  const tdd = dl.querySelector("dd");
  dl.textContent = "";
  let oneOwner = true;
  if (repos.length > 0) {
    let previous_login = repos[0].owner.login;
    oneOwner = repos.reduce((a, r) => a && (r.owner.login === previous_login), true);
  }
  for (const repo of repos) {
    const dt = tdt.cloneNode(true);
    const dd = tdd.cloneNode(true);
    // tweak the DT
    dt.querySelector("span").setAttribute("class", "fas fa-github");
    dt.lastChild.textContent = ` ${repo.name}`
    // tweak the DD
    const anchor = dd.querySelector("a");
    anchor.setAttribute("href", `https://github.com/${repo.owner.login}/${repo.name}`);
    if (oneOwner) {
      anchor.textContent = `${repo.name}`;
    } else {
      anchor.textContent = `${repo.owner.login}/${repo.name}`;
    }
    dd.appendChild(doc.createTextNode(`- ${repo.description}`));

    dl.appendChild(dt);
    dl.appendChild(dd);
  }
  const p = doc.createElement("p");
  p.append("For repositories configuration, see the ")
  const a = doc.createElement("a");
  a.href = "https://w3c.github.io/w3c.json.html";
  a.textContent = "w3c.json documentation";
  p.append(a);
  p.append(" (the numeric ID of this group is ");
  const code = doc.createElement("code");
  code.textContent = group.id;
  p.append(code);
  p.append(".");
  dl.after(p);
  // @@ we do nothing with ${others} for now

  // we're done: serialize and return the String
  return dom.serialize();
}


const SAMPLE =
{"id":35422,"name":"Accessibility Guidelines Working Group"
,"is_closed":false
,"description":"The mission of the Accessibility Guidelines Working Group (AG WG) is to develop specifications to make content on the Web accessible for people with disabilities and to participate in the development and maintenance of implementation support materials for the Web Content Accessibility Guidelines."
,"shortname":"ag"
,"discr":"w3cgroup"
,"type":"working group"
,"start-date":"1997-10-06"
,"end-date":"2022-10-31"
,"_links":
{"self":{"href":"https://api.w3.org/groups/wg/ag"}
,"homepage":{"href":"https://www.w3.org/WAI/GL/"}
,"users":{"href":"https://api.w3.org/groups/wg/ag/users"}
,"services":{"href":"https://api.w3.org/groups/wg/ag/services"}
,"specifications":{"href":"https://api.w3.org/groups/wg/ag/specifications"}
,"chairs":{"href":"https://api.w3.org/groups/wg/ag/chairs"}
,"team-contacts":{"href":"https://api.w3.org/groups/wg/ag/teamcontacts"}
,"charters":{"href":"https://api.w3.org/groups/wg/ag/charters"}
,"active-charter":{"href":"https://api.w3.org/groups/wg/ag/charters/387"}
,"join":{"href":"https://www.w3.org/groups/wg/ag/join"}
,"pp-status":{"href":"https://www.w3.org/groups/wg/ag/ipr"}
,"participations":{"href":"https://api.w3.org/groups/wg/ag/participations"}}
,"identifier": "wg/ag"
};
const REPOS = [
{"name":"wcag","homepageUrl":"https://w3c.github.io/wcag/guidelines/"
,"description":"Web Content Accessibility Guidelines"
,"isArchived":false,"owner":{"login":"w3c"}
,"w3c":{"group":[35422],"contacts":"michael-n-cooper","policy":"restricted","repo-type":["note","rec-track","tool"]}},

];
function test() {
  getRepoPage(SAMPLE, REPOS).then(dom => {
    return dom;
  }).then(console.log);
}

