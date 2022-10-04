#!/usr/bin/env bash
rm -fr src node_modules dist out
npm version --allow-same-version $(grep version ../package.json | grep -o '[0-9][^"]*')
mkdir src
cp -r ../src/*.ts src
cp ../README.md ../CHANGELOG.md ../LICENSE .
npm install
npm run compile
npm pack
ls -lrt ./*.tgz

echo "You can use 'npm publish' to publish the package if everything went well"
