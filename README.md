# sysmgr-httpd

simple web server for Wisconsin's system manager

This repository contains a stand-alone webserver and the static html/css/js files to provide a web-based interface for the system manager

Requirements:

- the web server is based on the microhttpd library. ON SLC6 the library is available via yum install libmicrohttpd-devel
- several boost libraries are used: yum install boost-devel
- for communication with the system manager the sysmgr library and the include file sysmgr.h from the sysmgr/clientapi are used


Running:

The web server can be run from the directory where it's created. Use the -h option to get a list of command line options to adjust the server to your needs.
The directory WebContent contains all the static files needed by the web interface. The communication with the system manager is based on AJAX requests.

The file knownCards.json contains the mapping from card names to pictures being shown. Adjust this file to your needs if your card names to not exactly match the names of our cards.


