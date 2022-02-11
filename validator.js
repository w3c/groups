// 'use strict';

const repositories = require('./repositories.json');
const fetch = require("node-fetch");

function findDuplicate(data) {
    const result = [];
    data.forEach((item) => {
        if (result.indexOf(item) === -1 && data.filter((i) => i.toLowerCase() === item.toLowerCase()).length > 1) {
            result.push(item);
        }
    });
    return result;
}

const apikey = process.env.W3CAPIKEY;
const fetchGroups = (url, page = 1, previousResponse = []) => {
    return fetch(`${url}&page=${page}`)
        .then(response => response.json())
        .then((response2) => {
            const response = [...previousResponse, ...response2._embedded['groups']];
            if (page < response2.pages) {
                return fetchGroups(url, page + 1, response);
            }
            return response;
        });
    };

(async function() {
    const W3CGroups = await fetchGroups(`https://api.w3.org/groups?apikey=${apikey}&embed=true`);
    let hasErrors = false;

    // check repository name uniqueness
    const duplicateRepositoryNames = findDuplicate(repositories.map((r) => `${r.owner.login}/${r.name}`));
    if (duplicateRepositoryNames.length > 0) {
        console.error(`* Duplicate repository names: ${duplicateRepositoryNames}`);
        hasErrors = true;
    }

    if (hasErrors) {
        process.exit(1);
    };

}());


