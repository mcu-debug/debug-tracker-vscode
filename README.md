# debug-tracker-vscode

## Introduction

This extension is an API extension to help other extension track debug sessions. Other extensions can subscribe to get notifications on events occurring on debuggers they are interested in.

There have been a proliferation of debug trackers (I counted four) running within various extensions. They all cause many more event handlers for each message passing between various clients and the debug adapter, and these are generally redundant. Instead, this extension creates a single point where messages are filtered looking for events like start, stop, running, etc. Other extensions can subscript to this extension that can create more precise events.

VSCode does not provide a full complement of events. It only has an event for starting and terminating. There are things that occur prior to starting and one has to look into the messages, responses and events passing between VSCode and the debug adapter to synthesize other events. And looking at the many such trackers, the logic is sometimes incomplete.

An extension can subscribe to all debug sessions of just the debug adapters that they are interested in. The selection of debug adapter is done via the `type` property used in a launch.json. For instance for `vscode-cpptools`, that would be `cppdbg`.

From a performance point of view, this extension can generate 3,000,000 events per second on a 2021 Macbook Pro.

If we missed an event or if there is an error in our logic when synthesizing events, please let us know by filing and Issue or creating a PR.

We have versioned this API and aim to keep compatibility for the long term. If we cannot we will increment the version and will not drop support for older versions although fixes may only be done in the most recent version.

## Usage

There are two ways you can use this API and both have the exact same interface. You can see the [sample API here](https://github.com/mcu-debug/debug-tracker-vscode/blob/master/dist/index.d.ts) (do not use this, please get it from npm install).

1. Use this extension as a dependency and call the extension api directly from your extension
   See an example extension @ https://github.com/mcu-debug/debug-tracker-client

    ```bash
    npm install debug-tracker-vscode --save-dev
    ```

    Advantage of this method is that you are sharing the tracking overhead with other extensions, improving the response time to the user. You are always up to date when this extension updates. Bad thing is if we release the extension with a bug, it will affect your users. We internally will be using this method for 3-4 extensions.

2. Use it in a library form and build it into your extension
    ```bash
    npm install debug-tracker-vscode
    ```
    The advantage is that you are independent of another extension you control if and when you want to move to a newer version via package.json. Disadvantage is that it does not help in reducing the number of trackers running concurrently.

## Build and Debug

Pre-requisites are that you have NodeJS (`npm`) and `vsce` already installed and setup for debug sessions in VSCode. Having the command-line interface in your path for `code` is a plus.

1. Clone this repo and change directory into it
2. Run the following commands
    ```bash
    rm -f *.vsix
    npm install
    npm run compile
    vsce package
    ```
3. The above should generate a `vsix` files and a `tgz` file. The `tgz` file can be used to add the typings you any other extension. You will need this method until we have published everything. We are not there yet. You will need the `tgz` file if you are running the sample/demo from https://github.com/mcu-debug/debug-tracker-client
4. If you have `code` available on your command line, run the following
    ```
    code --install-extension *.vsix
    ```
    Of course you can debug this extension by launching a debug session and then running the command `Activate Debug Tracker` from the `Command Palette` in the in the "Extension Development Host". Once it is activated, start any debug session and observe the Debug Console of the original window.
