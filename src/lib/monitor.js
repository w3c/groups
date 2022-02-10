/* eslint-env node */
"use strict";

// const monitor  = require('./monitor.js');
// let app = express();
// monitor.setName("MyService");
// monitor.install(app, [options]);
//
// options.path - HTTP root path for the monitor, default is /monitor
// options.entries - max number of entries to return in the log
//
// This will expose the following resources
// /monitor/logs
// /monitor/ping
// /monitor/usage

// if you want server HTTP header, add the following before send
//   res.sendServerTiming();
// if you want server timing logged, add the following after all router/middleware
//   monitor.stats(app);
// and don't forget to use next() in between for each router/middleware
// you'll then see those time info added to the log

import config from "./config.js";
import email from "./email.js";
import github from "./github.js";
import {performance} from "perf_hooks";
import v8 from "v8";
import os from "os";

let name = "Generic Express Monitor";

const buffers = {
  logs: [],
  gh_logs: [],
  error_logs: [],
}

let MAX_ENTRIES = 500;

function add(logger, msg) {
  let buffer = buffers[logger];
  if (buffer.length === (MAX_ENTRIES * 2)) {
    // reset the buffer to only contain the max number of entries
    buffers[logger] = buffer = buffer.slice(MAX_ENTRIES);
  }
  buffer.push(msg);
  if (config.debug) {
    console.log(msg);
  } else {
    process.nextTick(() => {
      console.log(msg);
    });
  }
}

function log_add(msg) {
  add("logs", msg);
}

function gh_add(msg) {
  add("gh_logs", msg);
}

function error_add(msg) {
  if (!config.debug) email(msg);
  add("error_logs", msg);
}

function getDate(msg) {
  if (config.debug) {
    return msg;
  }
  return "[" + (new Date()).toISOString() + "] " + msg;
}

const logStat = (msg) => {
  const args = "[stat] " + msg;
  log_add(args);
};

export function setName(newName) {
  name = newName;
}

export function log(msg) {
  const args = "[log] " + getDate(msg);
  log_add(args);
};

export function warn(msg) {
  const args = "[warn] " + getDate(msg);
  log_add(args);
};

export function error(msg) {
  const args = "[err] " + getDate(msg);
  log_add(args);
  error_add(args);
};

let timeStamp = {};

export function loopTimestamp(timings) {
  timeStamp = Object.assign({}, timings);
}

let ALLOW_ORIGINS = ["http://localhost:8080"];
export function install(app, options) {
  let path = "/monitor";
  if (options !== undefined) {
    if (options.path !== undefined) {
      path = options.path;
    }
    if (options.entries !== undefined) {
      MAX_ENTRIES = options.entries;
    }
    if (options.allowOrigins !== undefined) {
      ALLOW_ORIGINS = options.allowOrigins;
    }
  }

  // monitor all methods
  app.use((req, res, next) => {
    let st_sent = false;
    if (config.debug) {
      log(`${req.method} ${req.originalUrl}`);
    }
    next();
  });

  app.use(path + "/*", (req, res, next) => {
    let origin = req.headers.origin;
    if (!ALLOW_ORIGINS.includes(origin)) {
      origin = (config.debug) ? "*" : "origin-denied";
    }
    origin = "*"; // deactivate origin control
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.set('X-Content-Type-Options', 'nosniff');
    next();
  });

  // grabs the logs easily
  app.get(path + "/logs", (req, res, next) => {
    process.nextTick(() => {
      console.warn("[monitor] " + getDate("/logs " + req.ips.join(", ")));
    });
    let output = "";
    let begin = buffers.logs.length - MAX_ENTRIES;
    const end = buffers.logs.length;
    if (begin < 0) {
      begin = 0;
    }
    output = buffers.logs[begin++];
    for (let index = begin; index < end; index++) {
      output += "\n" + buffers.logs[index];
    }
    res.set("Content-Type", "text/plain");
    res.send(output);
    next();
  });

  // grabs the error logs easily
  app.get(path + "/error_logs", (req, res, next) => {
    process.nextTick(() => {
      console.warn("[monitor] " + getDate("/error_logs " + req.ips.join(", ")));
    });
    let output = "";
    let begin = buffers.error_logs.length - MAX_ENTRIES;
    const end = buffers.error_logs.length;
    if (begin < 0) {
      begin = 0;
    }
    output = buffers.error_logs[begin++];
    for (let index = begin; index < end; index++) {
      output += "\n" + buffers.error_logs[index];
    }
    res.set("Content-Type", "text/plain");
    res.send(output);
    next();
  });

  // simple way to check if the server is alive
  app.get(path + "/ping", (req, res, next) => {
    res.set("Content-Type", "text/plain");
    res.send("pong");
    next();
  });

  // simple way to check if the server is alive
  app.get(path + "/usage", (req, res, next) => {
    const obj = process.memoryUsage();
    obj.status = "ok";
    obj.name = name;
    obj.uptime = process.uptime();
    obj.cpuUsage = process.cpuUsage();
    obj.os = {
      uptime: os.uptime(),
      totalmem: os.totalmem(),
      freemem: os.freemem(),
    };
    obj.v8 = {};
    obj.v8.getHeapSpaceStatistics = v8.getHeapSpaceStatistics();
    obj.v8.getHeapStatistics = v8.getHeapStatistics();
    obj.v8.getHeapCodeStatistics = v8.getHeapCodeStatistics();
    obj["last-run"] = timeStamp;
    octokit.request("GET /rate_limit").then(res => res.data)
      .then(limits => {
        obj.GitHub = limits;
        res.json(obj);
        next();
      }).catch(err => {
        obj.GitHub = {error: err};
        res.json(obj);
        next();
      });

  });

};

export function stats(app) {
  app.use((req, res, next) => {
    let log = req.method + " " + req.originalUrl;
    if (req.get("traceparent") !== undefined) {
      log = "[" + req.get("traceparent") + "] " + log;
    }
    logStat("[" + (performance.now()) + "ms] " + log);
    next();
  });
};
