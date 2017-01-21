#!/usr/bin/env bash
# This script will copy this version of Meter to the
# $apps_root/meter directory.
# It is intended to be used by the Updater.
# https://github.com/sveasmart/updater
#

echo "Copying Meter from "$update_root" to "$apps_root"/meter..."
ls .

mkdir -p $apps_root/meter

rm -rf $apps_root/src
rm -rf $apps_root/test

cp -R $update_root/config $apps_root/meter/
cp -R $update_root/src $apps_root/meter/
cp -R $update_root/test $apps_root/meter/
cp $update_root/README.md $apps_root/meter/
cp $update_root/package.json $apps_root/meter/
cp $update_root/install/start.sh $apps_root/meter/

echo "Installing/restarting the systemd service..."
cp $update_root/install/meter.service /lib/systemd/system
systemctl enable meter.service
systemctl restart meter.service

echo "Done! Meter successfully updated!"

