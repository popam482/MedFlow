# MedFlow developer commands

Requirements: Python 3.10+, Node.js >= 22.14, npm, Git, and access to all private
repositories. `Make.py` is a Python standard-library launcher; orchestration stays
in TypeScript and shares the existing YAML parser. No pip packages are required.

## First setup and local run

```sh
git clone --recurse-submodules https://github.com/popam482/MedFlow.git
cd MedFlow
python Make.py install
python Make.py env
python Make.py doctor
python Make.py run
```

`install` installs root dependencies, initializes missing submodules at their Git
pins and installs module dependencies from lockfiles. Existing module checkouts
are preserved. `install --branches` additionally selects and updates the configured
branches; it requires clean modules. `env` creates optional local environment
files from examples without overwriting existing files. No credentials are needed
for local startup: the UI displays a setup message until Supabase is configured.
Only a publishable key belongs in frontend configuration; never a service-role key.

Local services:

- Frontend: use Vite's printed URL, normally `http://localhost:5173`.
- Backend: `http://127.0.0.1:3001/health` (HOST/PORT configurable in Backend/.env).

`run` starts all modules with a `dev` script specified in `externals.yaml`.
Ctrl+C stops the service process trees. If a service exits, the other services
are stopped too. To start one service use `python Make.py run Frontend` or
`python Make.py run Backend`. AI and Database have no long-running processes yet.
The UI currently checks Supabase directly; the new Backend health route verifies
only that the server runs, not an end-to-end patient workflow.

## Per-module branches

Each module has its own `branch` in `externals.yaml`, for example:

```yaml
  Frontend:
    path: Frontend
    repository: https://github.com/AlexM-058/MedFlow-Frontend.git
    branch: feat/patient-ui
    dev: dev
    dependsOn: [Backend]
    build: build
```

Selecting and switching a branch:

```sh
python Make.py branches Frontend
python Make.py branch Frontend feat/patient-ui --create
python Make.py branch Backend main
python Make.py status
```

`branch --create` creates a LOCAL branch from the current commit; it is not
published automatically. Without `--create`, an existing local branch is selected,
or origin is fetched and a tracking branch is created. Selection is saved to YAML
only after a successful checkout. New branches must be pushed before teammates
can fetch/update them. You can also edit `branch` in YAML directly, then `update`.

```sh
# Fetch and fast-forward only Frontend's selected branch.
python Make.py update Frontend

# Fetch/update all configured branches.
python Make.py update

# Restore versions committed in MedFlow, instead of latest branch tips.
python Make.py sync
```

Update/sync/branch refuse tracked or untracked local work; commit or stash it in
the affected modules first. No command uses force checkout, reset, or force push.
An update refuses divergent histories instead of dropping local commits. A batch
is not transactional: if a later module fails, earlier successful updates remain.
An update does not reinstall packages: rerun `install` if lockfiles changed.

`branch` is a development preference; Git submodule pins remain the reproducible
integration versions. Changing YAML does not automatically change checkouts or
pins. Build/run use the current working trees. Share branch preferences by
committing `externals.yaml`, and share exact integration versions by publishing
module commits first and then committing their paths in MedFlow.

`update` affects modules only. To update MedFlow itself, save root changes and run
`git pull --ff-only` in the superproject. Known branch listings may be stale until
origin is fetched. `status` shows selected/current branches, HEADs, pins and dirt.

## Build and checks

```sh
python Make.py plan
python Make.py build --install
python Make.py build Backend
python Make.py build Backend --affected
python Make.py test
```

See [BUILD.md](BUILD.md) for dependency ordering and artifacts.

## Android

Capacitor packages the existing React application into an Android app. It does
not package the Node backend, PostgreSQL, or cloud AI inside the APK. Mobile
features must connect to deployed services; `localhost` on a phone is the phone.

The app ID is initially `ro.medflow.app`; confirm this identifier before publishing
to a store. Android Studio and the corresponding SDK/build-tools are required for
native compilation. Set `JAVA_HOME` to a JDK 21+ and `ANDROID_HOME` to the SDK.
The tool also detects common Android Studio bundled-JDK and SDK locations.
Use Android Studio's SDK Manager to install the versions in
`Frontend/android/variables.gradle` and accept SDK licenses yourself.

```sh
# Build web assets and sync native project, without needing Java/Android SDK.
python Make.py android --prepare

# Check native toolchain; nonzero exit if JDK/SDK are missing.
python Make.py doctor --android

# Compile a debug-signed, installable test APK.
python Make.py android

# Compile an UNSIGNED release AAB for a separate signing/distribution process.
python Make.py android --bundle

# Prepare and open the native project in Android Studio.
python Make.py android --open
```

Outputs are copied into ignored `artifacts/android/`:

- `medflow-debug.apk`: test installation, not a production release.
- `medflow-release-unsigned.aab`: requires signing; not directly installable.

Use `adb install -r artifacts/android/medflow-debug.apk` with a connected device
or emulator to install the test APK. Keep keystores/passwords out of Git and YAML.
No command creates a production signing identity or publishes to Google Play.

Reference: [Capacitor environment setup](https://capacitorjs.com/docs/getting-started/environment-setup)
and [Android platform workflow](https://capacitorjs.com/docs/android).
