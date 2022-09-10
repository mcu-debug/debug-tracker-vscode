# debug-tracker-vscode README

This extension is an API extension to help other extension track debug sessions. Other extensions can subscribe to get notifications on events occurring on debuggers they are interested in.

## Usage

See an example extension @ https://github.com/mcu-debug/debug-tracker-client

Until we publish official typings via `npm`, you can see the API @ [./dist/extension.d.ts](./dist/extension.d.ts)

We have created a sample/demo @ https://github.com/mcu-debug/debug-tracker-client but you will need to finish the `Build` instructions shown below

## Build and Debug

Pre-requisites are that you have NodeJS (`npm`) and `vsce` already installed and setup for debug sessions in VSCode. Having the command-line interface in your path for `code` is a plus.

1. Clone this repo and change directory into it
2. Run the following commands
   ```bash
   rm -f *.vsix
   npm install
   npm run compile
   vsce package
   npm pack
   ```
4. The above should generate a `vsix` files and a `tgz` file. The `tgz` file can be used to add the typings you any other extension. You will need this method until we have published everything. We are not there yet. You will need the `tgz` file if you are running the sample/demo from https://github.com/mcu-debug/debug-tracker-client
5. If you have `code` available on your command line, run the following
   ```
   code --install-extension *.vsix 
   ```
Of course you can debug this extension by launching a debug session and then running the command `Activate Debug Tracker` from the `Command Palette` in the in the "Extension Development Host". Once it is activated, start any debug session and observe the Debug Console of the original window.
