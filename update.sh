#!/usr/bin/env bash
# This script will copy this version of Meter to the
# $apps_root/meter directory.
# It is intended to be used by the Updater.
# https://github.com/sveasmart/updater
#

echo "Copying Meter to "$apps_root"/meter..."
ls .

mkdir -p $apps_root/meter

rm -rf $apps_root/src
rm -rf $apps_root/test

cp -R ./config $apps_root/meter/
cp -R ./src $apps_root/meter/
cp -R ./test $apps_root/meter/
cp ./README.md $apps_root/meter/
cp ./package.json $apps_root/meter/
cp ./install/update.sh $apps_root/meter/

echo "Installing/restarting the systemd service..."
cp ./install/meter.service /lib/systemd/system
systemctl enable meter.service
systemctl restart meter.service

echo "Done! Meter successfully updated!"

