#!/usr/bin/env python3
"""Portable entry point. Project/build logic is implemented in TypeScript."""

import argparse
import os
import pathlib
import shutil
import signal
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent
COMMANDS = (
    "install", "update", "sync", "branch", "branches", "status", "doctor",
    "env", "plan", "build", "run", "android", "test",
)


def main():
    parser = argparse.ArgumentParser(
        description="MedFlow workspace: install, select branches, run, build, Android.",
        epilog="Examples: python Make.py install | branch Frontend feat/ui --create | "
               "update Frontend | run | build Backend --affected | android --prepare",
    )
    parser.add_argument("command", choices=COMMANDS)
    parser.add_argument("arguments", nargs=argparse.REMAINDER)
    args = parser.parse_args()
    npm = shutil.which("npm.cmd" if sys.platform == "win32" else "npm")
    node = shutil.which("node")
    if not npm or not node:
        parser.error("npm not found. Install Node.js >= 22.14 first.")
    npm_path = pathlib.Path(npm).resolve()
    candidates = [npm_path] if npm_path.suffix == ".js" else [
        npm_path.parent / "node_modules/npm/bin/npm-cli.js",
        npm_path.parent / "npm-cli.js",
    ]
    npm_cli = next((path for path in candidates if path.is_file()), None)
    if npm_cli is None:
        parser.error("Cannot locate npm-cli.js beside npm. Use a standard Node.js installation.")
    if args.command == "install" and "--help" not in args.arguments:
        subprocess.run([node, str(npm_cli), "ci", "--include=dev", "--no-audit", "--no-fund"], cwd=ROOT, check=True)
    if not (ROOT / "node_modules/yaml").is_dir():
        parser.error("Root dependencies are missing. Run: python Make.py install")
    env = {**os.environ, "npm_execpath": str(npm_cli)}
    child = subprocess.Popen(
        [node, "--experimental-strip-types", str(ROOT / "scripts/workspace.ts"), args.command, *args.arguments],
        cwd=ROOT, env=env,
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0,
        start_new_session=sys.platform != "win32",
    )
    try:
        return child.wait()
    except KeyboardInterrupt:
        if sys.platform == "win32":
            child.send_signal(signal.CTRL_BREAK_EVENT)
        else:
            os.killpg(child.pid, signal.SIGINT)
        try:
            child.wait(timeout=10)
        except subprocess.TimeoutExpired:
            if sys.platform == "win32":
                subprocess.run(["taskkill", "/pid", str(child.pid), "/T", "/F"], timeout=5, check=False)
            else:
                os.killpg(child.pid, signal.SIGKILL)
            child.kill()
            child.wait()
        return 130


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        sys.exit(130)
    except subprocess.CalledProcessError as error:
        sys.exit(error.returncode)
