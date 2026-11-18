#!/bin/bash
# Double-click this file to preview the website on your Mac.
# Photos you drop into the photos/ folders show up when you refresh the page.
# Close this window to stop the preview.
cd "$(dirname "$0")"
echo "Close this window when you're done."
( sleep 1; open "http://localhost:8765" ) &
python3 preview_server.py
