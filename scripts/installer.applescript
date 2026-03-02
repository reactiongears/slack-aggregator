-- Slack Aggregator Installer
-- Self-locating: derives project directory from its own location.
-- All user interaction is through native macOS dialogs.

-- Derive project directory from the .app's location
set myPath to POSIX path of (path to me)
-- Strip trailing slash and remove the .app name to get the project root
set projectDir to do shell script "dirname " & quoted form of myPath
set stagingDir to "/tmp/slack-aggregator-install"

-- Use the app's own icon for all dialogs
set appIcon to (POSIX file (myPath & "Contents/Resources/applet.icns")) as alias

-- Environment setup: find node/npm regardless of version manager
set envSetup to "export PATH=/opt/homebrew/bin:/usr/local/bin:$HOME/.volta/bin:$PATH; export NVM_DIR=\"${NVM_DIR:-$HOME/.nvm}\"; if [ -d \"$NVM_DIR/versions/node\" ]; then NVM_NODE=$(ls -d \"$NVM_DIR/versions/node\"/v* 2>/dev/null | sort -V | tail -1); [ -n \"$NVM_NODE\" ] && export PATH=\"$NVM_NODE/bin:$PATH\"; fi; "

-- ============================================================
-- Welcome
-- ============================================================
try
    display dialog "Welcome to Slack Aggregator!" & return & return & "This will set up a unified notification feed for all your Slack workspaces." & return & return & "The installer will:" & return & "  • Check for Node.js" & return & "  • Install dependencies" & return & "  • Build the production app" & return & "  • Create the application" buttons {"Cancel", "Install"} default button "Install" with title "Slack Aggregator" with icon appIcon
on error
    return
end try

-- ============================================================
-- Step 1: Check Node.js
-- ============================================================
set nodeFound to false
set nodeVer to ""
try
    set nodeVer to do shell script envSetup & "node -v"
    set majorVer to do shell script "echo " & quoted form of nodeVer & " | sed 's/v//' | cut -d. -f1"
    if (majorVer as integer) ≥ 18 then
        set nodeFound to true
    else
        display dialog "Node.js " & nodeVer & " was found but version 18+ is required." & return & return & "Please upgrade Node.js and try again." buttons {"OK"} default button 1 with title "Slack Aggregator" with icon appIcon
        return
    end if
on error
    -- Node not found
end try

if not nodeFound then
    set brewFound to false
    try
        do shell script envSetup & "command -v brew"
        set brewFound to true
    end try

    if brewFound then
        try
            display dialog "Node.js is required but not installed." & return & return & "Homebrew was detected. Install Node.js via Homebrew?" buttons {"Cancel", "Install Node.js"} default button "Install Node.js" with title "Slack Aggregator" with icon appIcon
        on error
            return
        end try
        display notification "Installing Node.js via Homebrew..." with title "Slack Aggregator"
        try
            do shell script envSetup & "brew install node"
        on error errMsg
            display dialog "Failed to install Node.js:" & return & return & errMsg buttons {"OK"} default button 1 with title "Slack Aggregator" with icon appIcon
            return
        end try
    else
        try
            display dialog "Node.js is required but not installed, and Homebrew was not found." & return & return & "Would you like to install both Homebrew and Node.js?" & return & return & "(This is the recommended way to manage developer tools on macOS.)" buttons {"Cancel", "Install Both"} default button "Install Both" with title "Slack Aggregator" with icon appIcon
        on error
            return
        end try
        display notification "Installing Homebrew..." with title "Slack Aggregator"
        try
            do shell script "/bin/bash -c \"$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        on error errMsg
            display dialog "Failed to install Homebrew:" & return & return & errMsg buttons {"OK"} default button 1 with title "Slack Aggregator" with icon appIcon
            return
        end try
        display notification "Installing Node.js..." with title "Slack Aggregator"
        try
            do shell script envSetup & "brew install node"
        on error errMsg
            display dialog "Failed to install Node.js:" & return & return & errMsg buttons {"OK"} default button 1 with title "Slack Aggregator" with icon appIcon
            return
        end try
    end if

    try
        set nodeVer to do shell script envSetup & "node -v"
    on error
        display dialog "Node.js installation may have succeeded but it can't be found." & return & return & "Please open Terminal and run:" & return & "  bash install.sh" buttons {"OK"} default button 1 with title "Slack Aggregator" with icon appIcon
        return
    end try
end if

-- Stop any running server so the fresh build is served
try
    do shell script envSetup & "cd " & quoted form of projectDir & " && bash scripts/launch.sh stop 2>&1"
end try

-- ============================================================
-- Step 2: Install dependencies
-- ============================================================
display notification "Installing dependencies... This may take a minute." with title "Slack Aggregator"
try
    do shell script envSetup & "cd " & quoted form of projectDir & " && npm install 2>&1"
on error errMsg
    display dialog "Failed to install dependencies:" & return & return & errMsg buttons {"OK"} default button 1 with title "Slack Aggregator" with icon appIcon
    return
end try

-- ============================================================
-- Step 3: Build production app
-- ============================================================
display notification "Building production app... This may take a minute." with title "Slack Aggregator"
try
    do shell script envSetup & "cd " & quoted form of projectDir & " && npm run build 2>&1"
on error errMsg
    display dialog "Build failed:" & return & return & errMsg buttons {"OK"} default button 1 with title "Slack Aggregator" with icon appIcon
    return
end try

-- ============================================================
-- Step 4: Create .app bundle in staging folder
-- ============================================================
display notification "Creating application..." with title "Slack Aggregator"
try
    do shell script envSetup & "rm -rf " & quoted form of stagingDir & " && cd " & quoted form of projectDir & " && bash scripts/create-app.sh " & quoted form of stagingDir & " && ln -s /Applications " & quoted form of (stagingDir & "/Applications")
on error errMsg
    display dialog "Failed to create app:" & return & return & errMsg buttons {"OK"} default button 1 with title "Slack Aggregator" with icon appIcon
    return
end try

-- ============================================================
-- Step 5: Open drag-to-install window
-- ============================================================
tell application "Finder"
    set installFolder to POSIX file stagingDir as alias
    open installFolder

    -- Configure the window for drag-to-install
    set finderWindow to front Finder window
    set current view of finderWindow to icon view
    set toolbar visible of finderWindow to false
    set statusbar visible of finderWindow to false
    set bounds of finderWindow to {300, 200, 820, 480}

    set viewOpts to icon view options of finderWindow
    set icon size of viewOpts to 128
    set arrangement of viewOpts to not arranged
    set text size of viewOpts to 14

    -- Position: app on the left, Applications on the right
    try
        set position of item "Slack Aggregator.app" of installFolder to {120, 130}
        set position of item "Applications" of installFolder to {390, 130}
    end try

    activate
end tell

display dialog "Drag Slack Aggregator into Applications to install." & return & return & "Then you can:" & return & "  • Open it from Applications or Spotlight" & return & "  • Drag it to your Dock for quick access" & return & "  • Add it to Login Items for auto-start" buttons {"Done"} default button "Done" with title "Slack Aggregator" with icon appIcon
