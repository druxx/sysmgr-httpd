/*
 *
 *   sysmgr extended by Json
 *
 *
 * $Author$
 * $Rev$
 * $Date$
 *
 *
 *
 */


#ifndef _SYSMGRJSON_H
#define _SYSMGRJSON_H



//#include <boost/property_tree/ptree.hpp>
//#include <boost/property_tree/json_parser.hpp>
#include "json/json.h"
#include "sysmgr.h"

//using boost::property_tree::ptree;
//using boost::property_tree::json_parser::read_json;
//using boost::property_tree::json_parser::write_json;

namespace sysmgr {

	class JsonObject : public Json::Value {
		public:
			std::string toString();
	};

	class sysmgrJson : public sysmgr {
		public:
			sysmgrJson(std::string host) : sysmgr( host) {};
			sysmgrJson(std::string host, std::string password) : sysmgr( host, password ) {};
			sysmgrJson(std::string host, std::string password, uint16_t port) : sysmgr( host, password, port ) {};

			JsonObject getJsonReply( JsonObject request );

		protected:
			JsonObject getRequest(JsonObject &request );
			JsonObject getListCrates();
			JsonObject getListCards( int crate );
			JsonObject getListSensors( int crate, int fru );
			JsonObject getCrateInfo( int crate, std::string cmd );
			JsonObject getCardInfo( int crate, int fru, std::string cmd );
			JsonObject readSensor( int crate, int fru, std::string sensor, std::string cmd );
			JsonObject getSensorThresholds( int crate, int fru, std::string sensor, std::string cmd );
	};
};

#endif
