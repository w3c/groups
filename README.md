# Group repositories for /groups

This repository holds the list of GitHub repositories used on `w3.org/groups/*/*/tools/` pages, such as the [CSS WG tools](https://www.w3.org/groups/wg/css/tools/) page.

The following files are automatically generated by the server:

* [`repositories.json`](https://w3c.github.io/groups/repositories.json) contains all public repositories owned by a W3C group known to the W3C API `/groups`, such as [WICG](https://www.w3.org/groups/cg/wicg/tools/) or
    [VC](https://www.w3.org/groups/wg/vc/tools/), with their associated *sanitized* [`w3c.json` files](https://w3c.github.io/w3c.json.html).
* [`all-repositories.json`](https://w3c.github.io/groups/all-repositories.json) contains all public repositories of the W3C GitHub organization and other related organizations (as defined in [https://github.com/w3c/groups/blob/main/settings.json](settings.json).
* [`identifiers.json`](https://w3c.github.io/identifiers.json) contains a mapping
between group IDs and group shortnames.

## Server

The list of repositories is generated by the code in [w3c/groups-server](https://github.com/w3c/groups-server/)

[`settings.json`](https://w3c.github.io/groups/settings.json) contains configuration settings used by the server. It may be edited manually. The current setting options are:

* `refreshCycle` : how many hours between each refresh cycle from GitHub
* `owners` : an Array of the GitHub owner objects, as follows:
* * `login` : a string, identifying a GitHub owner, eg. `w3c`
* * `group` : an array of zero or more group string identifiers, eg `"cg/wicg"`. If a repository owned by the GitHub owner does not contain a `w3c.json` file, those group identifiers will be used to associate the repository with a W3C Group.

Note: the server code is currently running within labs.w3.org.

## Others

[`repositories-schema.json`](https://github.com/w3c/groups/blob/main/repositories-schema.json) and [`validator.js`](https://github.com/w3c/groups/blob/main/validator.js) are used to guarantee and check the validity of [`repositories.json`](https://github.com/w3c/groups/blob/main/repositories.json).

[`settings-schema.json`](https://github.com/w3c/groups/blob/main/settings-schema.json) is used to guarantee and check the validity of [`settings.json`](https://github.com/w3c/groups/blob/main/settings.json).

## Sanitized `w3c.json`

Defined in [./lib/utils.js](https://github.com/w3c/groups-server/blob/main/lib/utils.js#L67), it will process the raw `w3c.json` files, by omitting any property not listed in [`w3c.json` documentation](https://w3c.github.io/w3c.json.html) and normalizing the valid properties.
