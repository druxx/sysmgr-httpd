
/*
 *
 * 	sysmgr-httpd.cpp
 *
 * 	web server for the sysmgr
 *
 * $Revision$
 * $Date$
 * $Author$
 *
 *
 *
 */


#include <iostream>
#include <sstream>
#include <iomanip>
#include <boost/program_options.hpp>
#include <boost/date_time/posix_time/posix_time.hpp>
#include <boost/date_time/gregorian/gregorian.hpp>
#include <stdio.h>
#include <microhttpd.h>
#include <fcntl.h>
#include <sys/stat.h>
#include "SessionController.h"
#include "sysmgrJson.h"

#define PAGE_FILE_NOT_FOUND "<html><head><title>File not found</title></head><body>File not found</body></html>"
#define NOT_SUPPORTED "<html><head><title>Not Supported</title></head><body>The method you are trying to use is not supported by this server</body></html>"
#define DEFAULT_PAGE "index.html"

namespace sysmgr {

std::string sysMgrHost;

	class WebServer {
		public:
		    WebServer() : m_running( false ), m_daemon( NULL ), sysMgr( NULL), port( 8080 ), verbose( false )  {};
			bool parseOptions( int argc, char* argv[] );
		    void start();
			void stop();
			static const char* createMimeTypeFromExtension(const char *ext);

			friend void parseOptions( int argc, char* argv[] );


		protected:
			struct MHD_Daemon* startMHD( int port );
			int createStaticFileResponse( struct MHD_Connection *connection, std::string url );
			int createJsonResponse( struct MHD_Connection *connection, std::string url );

			static int createErrorResponse( struct MHD_Connection *connection, int responseType, std::string method );
			static int answerToConnection( void *cls, struct MHD_Connection *connection,
										   const char *url, const char *method,
										   const char *version, const char *upload_data,
										   size_t *upload_data_size, void **con_cls );
			static int getParams (void *cls, enum MHD_ValueKind , const char *key, const char *data);

			bool m_running;
			struct MHD_Daemon* m_daemon;
			sysmgrJson* sysMgr;

			JsonObject request;

			int port;
			std::string rootStaticContent;
			bool verbose;

	};

	namespace options = boost::program_options;

	bool WebServer::parseOptions( int argc, char* argv[] )
	{
		options::options_description desc("Options");
		desc.add_options()
				( "port,p", options::value<int>(&port)->default_value(8080), "http port" )
				( "root,r", options::value<std::string>(&rootStaticContent)->default_value("WebContent"), "root folder for static content")
				( "host,H", options::value<std::string>(&sysMgrHost)->default_value("localhost"), "computer where sysmgr is running")
				( "verbose,v", options::bool_switch(&verbose), "show more info")
				( "help,h", "produce help message");
		options::variables_map vm;
		options::store( options::parse_command_line(argc,argv,desc), vm );
		options::notify(vm);

		if (vm.count("help")) {
			std::cout << desc << "\n";
			return false;
		}
		return true;
	}

	void WebServer::stop()
	{
		if (m_running)
		{
			MHD_stop_daemon(m_daemon);
			m_running = false;
		}
	}

	struct MHD_Daemon* WebServer::startMHD( int port)
	{
		return MHD_start_daemon( MHD_USE_SELECT_INTERNALLY, port, NULL, NULL,
				&WebServer::answerToConnection, this, MHD_OPTION_END);
	}


	void WebServer::start()
	{
		m_daemon = startMHD( port );
		m_running = m_daemon != NULL;
		if ( m_running )
			std::cout << "web server at port " << port << " with static content from folder " << rootStaticContent << " started" << std::endl;
		sysMgr = NULL;
	}

	int WebServer::answerToConnection( 	void *cls, struct MHD_Connection *connection,
												const char *c_url, const char *c_method,
												const char *version, const char *upload_data,
												size_t *upload_data_size, void **con_cls)
	{
		WebServer *server = (WebServer *)cls;
		std::string url = c_url;
		std::string method = c_method;
		if ( method != "GET" )
			return createErrorResponse( connection, MHD_HTTP_NOT_IMPLEMENTED, method );

		if ( url == "/status" )
		{
			const char *page = "<html><body>Hello, browser!</body></html>";
			struct MHD_Response *response = MHD_create_response_from_buffer (strlen (page), (void *) page,
			                                   MHD_RESPMEM_PERSISTENT );
			int ret = MHD_queue_response (connection, MHD_HTTP_OK, response);
			MHD_destroy_response (response);
			return ret;
		}

		if ( url == "/" )
			url += DEFAULT_PAGE;

		if ( url != "/json" )
			return server->createStaticFileResponse( connection, url );

		return server->createJsonResponse( connection, url );
	}

	int WebServer::createJsonResponse( struct MHD_Connection *connection, std::string url )
	{
		int ret = MHD_NO;
		request.clear();
		MHD_get_connection_values( connection, MHD_GET_ARGUMENT_KIND, WebServer::getParams, this );
		if ( verbose )
			std::cout << "json: " << request << std::endl;
		JsonObject reply;

		if ( !sysMgr )
			sysMgr = new sysmgrJson( sysMgrHost, "raw", 4685 );
		try {
			if ( !sysMgr->connected() )
				sysMgr->connect();
			if ( verbose )
				std::cout << "calling getJsonReply" << std::endl;
			reply = sysMgr->getJsonReply( request );
			std::string session = request.get( "session", "" ).asString();
			if ( !session.empty() ) {
				if ( session == "list" )
					reply[ "sessionList"] = SessionController::instance().getSessionList();
				else
					reply[ "events"] = SessionController::instance().getEvents( atoi( session.c_str() ) );
			}
		}
		catch (sysmgr_exception &e) {
			reply["error"] = "sysmgr_exception";
			reply["message"] = e.message;
		}
		catch ( std::exception& e2 ) {
			reply["error"] = "exception";
			reply["message"] = e2.what();
		}

		reply["request"] = request;
		std::string out = reply.toString();
		if ( verbose )
			std::cout << "reponse: " << out << std::endl;
		struct MHD_Response* response = MHD_create_response_from_buffer( out.length(), (void*)out.c_str(), MHD_RESPMEM_MUST_COPY );
		MHD_add_response_header(response, "Content-Type", "text/plain" );
		ret = MHD_queue_response (connection, MHD_HTTP_OK, response);
		MHD_destroy_response (response);
		return ret;
	}

	int WebServer::getParams (void *cls, enum MHD_ValueKind , const char *key, const char *data)
	{
		WebServer *server = (WebServer *)cls;
		server->request[key] = data ? std::string(data) : "";
		return MHD_YES;
	}

	int WebServer::createStaticFileResponse( struct MHD_Connection *connection, std::string url )
	{
		int ret = MHD_NO;

		std::string filename = rootStaticContent + url;
		int fd = open( filename.c_str(), O_RDONLY);
		size_t file_size;

		if ( fd != -1 )
		{
			struct stat buf;
			if ( fstat( fd, &buf) )
			{
				close(fd);
				fd = -1;
			} else
				file_size = buf.st_size;
		}

		if (fd == -1)
			return createErrorResponse(connection, MHD_HTTP_NOT_FOUND, "GET"); /* GET Assumed Temporarily */

		struct MHD_Response *response = MHD_create_response_from_fd( file_size, fd );

		size_t pos = filename.rfind( "." );
		if ( pos != std::string::npos )
		{
			std::string ext = filename.substr( pos + 1 );
			const char *mime = createMimeTypeFromExtension( ext.c_str() );
			if (mime)
				MHD_add_response_header(response, "Content-Type", mime);
		}
		ret = MHD_queue_response(connection, MHD_HTTP_OK, response);
		MHD_destroy_response(response);
		if ( verbose )
			std::cout << "GET " << filename << " (" << file_size << " bytes)" << std::endl;
		return ret;
	}

	int WebServer::createErrorResponse( struct MHD_Connection *connection, int responseType, std::string method )
	{
		int ret = MHD_NO;
		size_t payloadSize = 0;
		void *payload = NULL;
		if (method != "HEAD")
		{
			switch (responseType)
			{
				case MHD_HTTP_NOT_FOUND:
					payloadSize = strlen(PAGE_FILE_NOT_FOUND);
					payload = (void *)PAGE_FILE_NOT_FOUND;
					break;
				case MHD_HTTP_NOT_IMPLEMENTED:
					payloadSize = strlen(NOT_SUPPORTED);
					payload = (void *)NOT_SUPPORTED;
					break;
			}
		}
		struct MHD_Response *response = MHD_create_response_from_data (payloadSize, payload, MHD_NO, MHD_NO);
		ret = MHD_queue_response (connection, MHD_HTTP_NOT_FOUND, response);
		MHD_destroy_response (response);
		return ret;
	}

	const char *WebServer::createMimeTypeFromExtension(const char *ext)
	{
		if (strcmp(ext, ".aif") == 0) return "audio/aiff";
		if (strcmp(ext, ".aiff") == 0) return "audio/aiff";
		if (strcmp(ext, ".asf") == 0) return "video/x-ms-asf";
		if (strcmp(ext, ".asx") == 0) return "video/x-ms-asf";
		if (strcmp(ext, ".avi") == 0) return "video/avi";
		if (strcmp(ext, ".avs") == 0) return "video/avs-video";
		if (strcmp(ext, ".bin") == 0) return "application/octet-stream";
		if (strcmp(ext, ".bmp") == 0) return "image/bmp";
		if (strcmp(ext, ".dv") == 0) return "video/x-dv";
		if (strcmp(ext, ".fli") == 0) return "video/fli";
		if (strcmp(ext, ".gif") == 0) return "image/gif";
		if (strcmp(ext, ".htm") == 0) return "text/html";
		if (strcmp(ext, ".html") == 0) return "text/html";
		if (strcmp(ext, ".htmls") == 0) return "text/html";
		if (strcmp(ext, ".ico") == 0) return "image/x-icon";
		if (strcmp(ext, ".it") == 0) return "audio/it";
		if (strcmp(ext, ".jpeg") == 0) return "image/jpeg";
		if (strcmp(ext, ".jpg") == 0) return "image/jpeg";
		if (strcmp(ext, ".json") == 0) return "application/json";
		if (strcmp(ext, ".kar") == 0) return "audio/midi";
		if (strcmp(ext, ".list") == 0) return "text/plain";
		if (strcmp(ext, ".log") == 0) return "text/plain";
		if (strcmp(ext, ".lst") == 0) return "text/plain";
		if (strcmp(ext, ".m2v") == 0) return "video/mpeg";
		if (strcmp(ext, ".m3u") == 0) return "audio/x-mpequrl";
		if (strcmp(ext, ".mid") == 0) return "audio/midi";
		if (strcmp(ext, ".midi") == 0) return "audio/midi";
		if (strcmp(ext, ".mod") == 0) return "audio/mod";
		if (strcmp(ext, ".mov") == 0) return "video/quicktime";
		if (strcmp(ext, ".mp2") == 0) return "audio/mpeg";
		if (strcmp(ext, ".mp3") == 0) return "audio/mpeg3";
		if (strcmp(ext, ".mpa") == 0) return "audio/mpeg";
		if (strcmp(ext, ".mpeg") == 0) return "video/mpeg";
		if (strcmp(ext, ".mpg") == 0) return "video/mpeg";
		if (strcmp(ext, ".mpga") == 0) return "audio/mpeg";
		if (strcmp(ext, ".pcx") == 0) return "image/x-pcx";
		if (strcmp(ext, ".png") == 0) return "image/png";
		if (strcmp(ext, ".rm") == 0) return "audio/x-pn-realaudio";
		if (strcmp(ext, ".s3m") == 0) return "audio/s3m";
		if (strcmp(ext, ".sid") == 0) return "audio/x-psid";
		if (strcmp(ext, ".tif") == 0) return "image/tiff";
		if (strcmp(ext, ".tiff") == 0) return "image/tiff";
		if (strcmp(ext, ".txt") == 0) return "text/plain";
		if (strcmp(ext, ".uni") == 0) return "text/uri-list";
		if (strcmp(ext, ".viv") == 0) return "video/vivo";
		if (strcmp(ext, ".wav") == 0) return "audio/wav";
		if (strcmp(ext, ".xm") == 0) return "audio/xm";
		if (strcmp(ext, ".xml") == 0) return "text/xml";
		if (strcmp(ext, ".zip") == 0) return "application/zip";
		if (strcmp(ext, ".tbn") == 0) return "image/jpeg";
		if (strcmp(ext, ".js") == 0) return "application/javascript";
		if (strcmp(ext, ".css") == 0) return "text/css";
		return NULL;
	}
};

using namespace std;


void event_print(const sysmgr::event& e) {
	using namespace boost::posix_time;
	using namespace boost::gregorian;

	ptime now = second_clock::local_time();
	cout << to_simple_string(now) << ": Event!" << endl;
	printf("\tFilter:\t%u\n\tCrate:\t%hhu\n\tFRU:\t%hhu\n\tCard:\t%s\n\tSensor:\t%s\n\tType:\t%s\n\tOffset:\t%hhu\n\n",
			e.filterid,
			e.crate,
			e.fru,
			e.card.c_str(),
			e.sensor.c_str(),
			(e.assertion ? "Assertion" : "Deassertion"),
			e.offset);
}

void eventCallback( const sysmgr::event& e ) {
	event_print( e );
	sysmgr::SessionController::instance().storeEvent( e );
}


int main(int argc, char *argv[])
{
	sysmgr::WebServer webServer;
	if ( !webServer.parseOptions( argc, argv ) )
		return 1;


	webServer.start();
	while ( true ) {
		sysmgr::sysmgr eventhandler( sysmgr::sysMgrHost, "raw", 4685 );
		try {
			if ( !eventhandler.connected() ) {
				eventhandler.connect();
				cerr << "eventhandler connected" << endl;
			}
			eventhandler.register_event_filter(0xff, 0xff, "", "", 0x7fff, 0x7fff, eventCallback);
#if NOISY
			eventhandler.register_event_filter(1, 0xff, "", "", 0x7fff, 0x7fff, eventCallback);
			eventhandler.register_event_filter(2, 0xff, "", "", 0x7fff, 0x7fff, eventCallback);
			for (int i = 1; i < 13; i++)
				eventhandler.register_event_filter(0xff, i, "", "", 0x7fff, 0x7fff, eventCallback);
#endif

			eventhandler.process_events( NULL );
		}
		catch (sysmgr::sysmgr_exception &e) {
			cerr << "ERROR: " << e.message << endl;
			sleep( 5 );
		}
	}

	webServer.stop();

}


