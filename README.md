# sysmgr-httpd

simple web server for Wisconsin's system manager

This repository contains a stand-alone webserver and the static html/css/js files to provide a web-based interface for the system manager

Requirements:

- the web server is based on the microhttpd library. ON SLC6 the library is available via yum install libmicrohttpd-devel

- for JSON handling the boost property_tree package is needed. Unfortunately this package is not included in the default boost version on SLC5. 
 However if you have not already installed a newer version there is also a version 1.41 available in the standard repositories: yum install boost141-devel
 The included Makefile uses this version of boost.
 
- for communication with the system manager the sysmgr library and the include file sysmgr.h from the sysmgr/clientapi are used


Running:

The web server can be run from the directory where it's created. Use the -h option to get a list of command line options to adjust the server to your needs.
The directory WebContent contains all the static files needed by the web interface. The communication with the system manager is based on AJAX requests.

The file knownCards.json contains the mapping from card names to pictures being shown. Adjust this file to your needs if your card names to not exactly match the names of our cards.


