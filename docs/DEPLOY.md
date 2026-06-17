# Deploying to the Flipper cabinet

> **Who this is for:** students deploying their pinball apps onto the shared
> Flipper cabinet. It covers getting onto the network, getting your code, and
> pushing an app onto the cabinet's screens.
>
> **You never need to change the cabinet's configuration.** Building and
> deploying an app only touches *your own* git repository and two buttons in
> the dashboard. See the warning at the bottom of this page.

## What you'll do

1. Join the cabinet's private network (Tailscale).
2. Install git and get a copy of the example app.
3. Open the dashboard.
4. Register your app's git repository and load it.

Deploying is done entirely from a web dashboard — there is no manual copying of
files onto the cabinet.

## 1. Join the cabinet's network

The cabinet is not on the public internet. It lives on a private Tailscale
network, and you join that network once.

1. Open this invite link and accept it:

   <https://login.tailscale.com/admin/invite/zULHNSE1WVQFmrN9iaN521>

2. Sign in when prompted (Google, GitHub, or Microsoft account).
3. Install the Tailscale client on your computer from
   <https://tailscale.com/download>, then sign in with the same account.
4. Leave Tailscale running. While it is connected, your computer can reach the
   cabinet.

> You only do this once per computer.

## 2. Install git

Your app is a git repository, and the cabinet deploys it straight from git.

- **Windows:** install from <https://git-scm.com/download/win>
- **macOS:** run `xcode-select --install`, or install from
  <https://git-scm.com/download/mac>
- **Linux:** `sudo apt install git`

Check it works:

```sh
git --version
```

## 3. Get a copy of the example app

Start from the example app rather than a blank folder — it already has the
correct structure.

```sh
git clone https://github.com/PANDORMedia/fliphetic-test-2.git
cd fliphetic-test-2
```

Use it as a template for your own app: change the screens, the content, the
firmware. What each file means is explained in **`STUDENT_GUIDE.md`**.

When your app is ready, push it to **your own** public GitHub repository.

## 4. Open the dashboard

With Tailscale connected, open the cabinet dashboard in your browser:

```
http://100.125.185.88:8080
```

Log in. If you do not have an account, register on the login page when
registration is open, or ask your instructor to create one for you.

## 5. Deploy your app

From the dashboard:

1. Click **+ Register** and paste the git URL of your app's repository.
2. The cabinet clones your repo and checks it. If the manifest is invalid, the
   dashboard tells you what to fix.
3. Your app appears in the **Apps** list. Click **Load** to run it — the
   cabinet stops the previous app, flashes any ESP32 firmware, starts your
   Docker services, and points the three screens at your app.

To ship a change later: commit and push to GitHub. Within about a minute the
dashboard shows an **update** badge on your app — click **Load** again to
switch the cabinet to the new version. The cabinet never loads a new version on
its own.

## SSH access (rarely needed)

Deploying does **not** require SSH — everything above is done from the
dashboard. If you are specifically asked to open a terminal on the cabinet:

```sh
ssh flipper@100.125.185.88
```

Password: `dauphin67`

> Use this only when asked to. A terminal on the cabinet makes it easy to break
> things for the whole class — see the warning below.

## On site: the cabinet Wi-Fi

When you are physically next to the cabinet, it also broadcasts its own Wi-Fi:

- **Network:** `FLIPHETIC_CAB0`
- **Password:** `dauphin67`

This is mainly for ESP32 boards and phones. Your normal deploy workflow uses
Tailscale, not this Wi-Fi.

## Do NOT change the cabinet configuration

**This is the one rule that matters.** The cabinet is shared by the whole
class. Its configuration — the config files, the **System** page (screens,
ESP32 devices, users), the network settings — is set up once and used by
everyone.

- **You never need to touch it.** Building and deploying an app only ever
  involves your own git repository and the **Register** / **Load** buttons.
- Changing a setting to fix *your* app can break the cabinet for *everyone
  else's* app.
- If the cabinet itself looks misconfigured or broken, **tell your instructor**
  — do not try to fix it yourself.

Stay inside your own repository and the dashboard's Apps page, and you cannot
break anything for anyone.
