#!/usr/bin/env bash
# This script will copy this version of Meter to the
# $apps_root/meter directory.
# It is intended to be used by the Updater.
# https://github.com/sveasmart/updater
#

echo "Copying Meter to "$apps_root"/meter..."

mkdir -p $apps_root/meter

rm -rf $apps_root/src
rm -rf $apps_root/test

cp -R config $apps_root/meter/
cp -R src $apps_root/meter/
cp -R test $apps_root/meter/
cp README.md $apps_root/meter/
cp package.json $apps_root/meter/

echo "Done! Meter successfully updated!"

