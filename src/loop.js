import github from "./lib/github.js";
import * as monitor from "./lib/monitor.js";

export function nudge() {
  return 0;
}

export function init() {
  monitor.log("init");
  github.getW3C("w3c/hr-time")
    .then(w3c => {
      console.log(w3c);
    })
}