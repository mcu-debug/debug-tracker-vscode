#!/usr/bin/env bash
rm -fr src node_modules dist
npm version --allow-same-version $(grep version ../package.json | grep -o '[0-9][^"]*')
mkdir src
cp -r ../src/*.ts src
npm install
npm run compile
npm pack

echo "You can use 'npm publish' to publish the package if everything went well"
