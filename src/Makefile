DEPOPTS = -MMD -MF .$@.dep -MP
CCOPTS = $(DEPOPTS) -ggdb -Wall -pthread -fPIC


all: sysmgr-httpd
	echo 'done'

sysmgr-httpd: sysmgr-httpd.cpp sysmgrJson.cpp SessionController.cpp
	g++ $(CCOPTS) -I../include -I. -lmicrohttpd -lboost_program_options -lboost_date_time -L../lib -lsysmgr  -o $@ SessionController.cpp sysmgrJson.cpp jsoncpp.cpp sysmgr-httpd.cpp

#sysmgr.cgi: sysmgr.cgi.cpp  jsoncpp.cpp
#	g++ $(CCOPTS) -I. -lsysmgr -lcurl -o $@ jsoncpp.cpp sysmgr.cgi.cpp

tags: *.cpp *.h
	ctags -R . 2>/dev/null || true

distclean: clean
	rm -f .*.dep tags

clean:
	rm -f uTCA-http

.PHONY: distclean clean all

-include $(wildcard .*.dep)
