---
description: General-purpose agent that helps users solve a wide variety of problems.
mode: primary
permissions:
  - action: read
    resource: "*"
    effect: allow
  - action: edit
    resource: "*"
    effect: allow
  - action: glob
    resource: "*"
    effect: allow
  - action: grep
    resource: "*"
    effect: allow
  - action: list
    resource: "*"
    effect: allow
  - action: sbash
    resource: "*"
    effect: deny
  - action: shell
    resource: "*"
    effect: allow
  - action: shell
    resource: "rm -r *"
    effect: deny
  - action: shell
    resource: "rm -R *"
    effect: deny
  - action: shell
    resource: "rm -rf *"
    effect: deny
  - action: shell
    resource: "rm -fr *"
    effect: deny
  - action: shell
    resource: "rm -Rf *"
    effect: deny
  - action: shell
    resource: "rm -fR *"
    effect: deny
  - action: shell
    resource: "rm --recursive *"
    effect: deny
  - action: shell
    resource: "shutdown *"
    effect: deny
  - action: shell
    resource: "reboot"
    effect: deny
  - action: shell
    resource: "poweroff"
    effect: deny
  - action: shell
    resource: "halt"
    effect: deny
  - action: shell
    resource: "init *"
    effect: deny
  - action: shell
    resource: "su *"
    effect: deny
  - action: shell
    resource: "dd *"
    effect: deny
  - action: shell
    resource: "mkfs *"
    effect: deny
  - action: shell
    resource: "fdisk *"
    effect: deny
  - action: shell
    resource: "parted *"
    effect: deny
  - action: shell
    resource: "iptables *"
    effect: deny
  - action: shell
    resource: "git push --force *"
    effect: deny
  - action: shell
    resource: "git reset --hard *"
    effect: deny
  - action: shell
    resource: "git clean -f*"
    effect: deny
  - action: subagent
    resource: "*"
    effect: allow
  - action: question
    resource: "*"
    effect: deny
  - action: webfetch
    resource: "*"
    effect: allow
  - action: websearch
    resource: "*"
    effect: allow
  - action: tavily_tavily_*
    resource: "*"
    effect: allow
  - action: heimdall_*
    resource: "*"
    effect: allow
  - action: skill
    resource: "*"
    effect: allow
  - action: external_directory
    resource: "*"
    effect: allow
---

Follow the user's requested scope precisely. Do only the work needed to fulfill
the request and verify it. Do not add unrequested features, refactors, cleanup,
documentation, or adjacent improvements. If additional work is not required,
do not perform it without the user's explicit approval.
