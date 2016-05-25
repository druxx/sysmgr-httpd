/*
 *
 *   code for sysmgr extended by Json
 *
 * $Author$
 * $Rev$
 * $Date$
 *
 */


#include <sstream>
#include <map>
#include "sysmgrJson.h"


namespace sysmgr {

struct CardPosition
{
	int fru;
   	int  sitenum;
  	int  sitetype;
   	int  slot;
   	int  tier;
   	std::string type;
};

CardPosition CardPositionArray[18] = {
		{3, 1, 10, 8, 2, "MCH"},
		{5, 1, 7, 2, 2, "AMC"},
		{6, 2, 7, 3, 2, "AMC"},
		{7, 3, 7, 4, 2, "AMC"},
		{8, 4, 7, 5, 2, "AMC"},
		{9, 5, 7, 6, 2, "AMC"},
		{10, 6, 7, 7, 2, "AMC"},
		{11, 7, 7, 9, 2, "AMC"},
		{12, 8, 7, 10, 2, "AMC"},
		{13, 9, 7, 11, 2, "AMC"},
		{14, 10, 7, 12, 2, "AMC"},
		{15, 11, 7, 13, 2, "AMC"},
		{16, 12, 7, 14, 2, "AMC"},
		{30, 2, 10, 8, 3, "MCH"},
		{40, 1, 4, 0, 1, "CU"},
		{41, 2, 4, 0, 4, "CU"},
		{50, 1, 11, 1, 2, "PM"},
		{51, 2, 11, 1, 3, "PM"}
};

std::map<int, CardPosition> fru2position;

void fillFru2position()
{
	CardPosition* p = CardPositionArray;
	while ( p->fru <= 51 ) {
		int fru = p->fru;
		fru2position[fru] = *p;
		p += 1;
	}

}


std::string JsonObject::toString() {
	Json::FastWriter writer;
	return writer.write( *this );
}

JsonObject sysmgrJson::getJsonReply( JsonObject request )
{
		JsonObject reply;
		std::string cmd = request.get( "cmd", "" ).asString();
		std::string session = request.get( "session", "" ).asString();

		if ( cmd.empty() )
		{
			reply["error"] = "no command given, implemented: LIST_CRATES, LIST_CARDS, LIST_SENSORS, GET_CRATE_INFO, GET_CARD_INFO, READ_SENSOR, GET_SENSOR_THRESHOLDS";
			return reply;
		}

		try
		{
			if ( cmd == "LIST_CRATES")
				return getListCrates();
			std::string crate = request.get( "crate", "" ).asString();
			if ( crate.empty() )
			{
				reply["error"] = request.get("cmd","").asString() + ": no crate given";
				return reply;
			}
			int crateNr = atoi(crate.c_str() );
			if ( cmd == "LIST_CARDS")
				return getListCards( crateNr );
			if ( cmd == "xGET_CRATE_INFO")
				return getCrateInfo( crateNr, cmd );


			std::string fru = request.get( "fru", "" ).asString();
			if ( fru.empty() )
			{
				reply["error"] = request.get( "cmd", "?").asString() + ": no fru given";
				return reply;
			}
			int fruNr = atoi(fru.c_str() );
			if ( cmd == "LIST_SENSORS")
				return getListSensors( crateNr, fruNr );
			if ( cmd == "xGET_CARD_INFO")
				return getCardInfo( crateNr, fruNr, cmd );


			std::string sensor = request.get( "sensor", "" ).asString();
			if ( sensor.empty() )
			{
				reply["error"] = request.get( "cmd", "?" ).asString() + ": no sensor given";
				return reply;
			}
			if ( cmd == "READ_SENSOR")
				return readSensor( crateNr, fruNr, sensor, cmd );
			if ( cmd == "GET_SENSOR_THRESHOLDS")
				return getSensorThresholds( crateNr, fruNr, sensor, cmd );
		} catch (sysmgr_exception &e) {
			reply["error"] = "sysmgr_exception";
			reply["message"] = e.message;
			return reply;
		}

		reply["error"] = "unknown command";
		return reply;
	}


JsonObject sysmgrJson::getListCrates()
{
	JsonObject reply;
	std::vector<crate_info> crates = list_crates();
	Json::Value array;
	for (std::vector<crate_info>::iterator it = crates.begin(); it != crates.end(); it++)
	{
		JsonObject crate;
		if (it->connected )
			crate["connected"] = true;
		else
			crate["connected"] = false;
		crate["crateno"] = it->crateno;
		crate["description"] = it->description;
		crate["mch"] = it->mch;
		array.append( crate );
	}
	reply["data"] = array;
	return reply;
}

JsonObject sysmgrJson::getListCards( int crate )
{
	if ( fru2position.empty() )
		fillFru2position();
	JsonObject reply;
	std::vector<card_info> cards = list_cards( crate );
	JsonObject array;
	for (std::vector<card_info>::iterator it = cards.begin(); it != cards.end(); it++)
	{
		JsonObject card;
		int fru = it->fru;
		card["fru"] = fru;
		card["mstate"] = it->mstate;
		card["name"] = it->name;
		std::map<int,CardPosition>::iterator f2p = fru2position.find( fru );
		if ( f2p != fru2position.end() ) {
			std::string type = f2p->second.type;
 			card["type"] = type;
			card["slot" ] = f2p->second.sitenum;
		} else {
 			card["type"] = "UnknownType";
			card["slot" ] = -1;
		}
		array.append( card );
	}
	reply["data"] = array;
	return reply;
}



JsonObject sysmgrJson::getListSensors( int crate, int fru )
{
	JsonObject reply;
	std::vector<sensor_info> sensors = list_sensors( crate,  fru);
	JsonObject array;
	for (std::vector<sensor_info>::iterator it = sensors.begin(); it != sensors.end(); it++)
	{
		JsonObject sensor;
		sensor["name"] = it->name;
		std::string type = "";
		type += it->type;
		sensor["type"] = type;
		if ( type == "T" )
		{
			sensor["longunits"] = it->longunits;
			sensor["shortunits"] = it->shortunits;
		}
		array.append( sensor );
	}
	reply["data"] = array;
	return reply;
}



JsonObject sysmgrJson::getCrateInfo( int crateNr, std::string cmd )
{
	JsonObject reply;

	std::vector<crate_info> crates = list_crates();
	JsonObject crate;
	for (std::vector<crate_info>::iterator it = crates.begin(); it != crates.end(); it++)
	{
		if ( crateNr == it->crateno )
		{
			if (it->connected )
				crate["connected"] = true;
			else
				crate["connected"] = false;
			crate["crateno"] = it->crateno;
			crate["description"] = it->description;
			crate["mch"] = it->mch;
			break;
		}
	}

	if ( crate.get( "crateno", "" ).empty() )
	{
		reply[ "error"] = cmd + ": Crate not found";
		return reply;
	}
	reply["data"] = crate;
	return reply;
}


JsonObject sysmgrJson::getCardInfo( int crate, int fru, std::string cmd )
{
	JsonObject reply;
	std::vector<card_info> cards = list_cards( crate );
	JsonObject card;
	card["crate"] = crate;
	for (std::vector<card_info>::iterator it = cards.begin(); it != cards.end(); it++)
	{
		if ( fru == it->fru )
		{
			card["fru"] = it->fru;
			card["mstate"] = it->mstate;
			card["name"] = it->name;
			break;
		}
	}

	if ( !card["fru"] )
	{
		reply["error"] = cmd + ": Card not found";
		return reply;
	}

	for ( int i = 0; i < 18; i++ )
	{
		if ( fru == CardPositionArray[i].fru )
		{
			JsonObject position;
			position["sitenum"] = CardPositionArray[i].sitenum;
			position["sitetype"] = CardPositionArray[i].sitetype;
			position["slot"] = CardPositionArray[i].slot;
			position["tier"] = CardPositionArray[i].tier;
			position["type"] = CardPositionArray[i].type;
			card["position"] = position;
			break;
		}
	}
	reply["data"] = card;
	return reply;
}


JsonObject sysmgrJson::readSensor( int crate, int fru, std::string sensorName, std::string cmd )
{
	JsonObject reply;
	sensor_reading reading = sensor_read( crate, fru, sensorName );
	JsonObject sensor;
	sensor["crate"] = crate;
	sensor["fru"] =  fru;
	std::vector<sensor_info> sensors = list_sensors( crate, fru );
	std::string type = "";
	for (std::vector<sensor_info>::iterator it = sensors.begin(); it != sensors.end(); it++)
	{
		if( sensorName == it->name )
		{
			sensor["name"] = it->name;
			type += it->type;
			if (type == "T")
			{
				sensor["type"] = "Threshold";
				sensor["longunits"] = it->longunits;
				sensor["shortunits"] = it->shortunits;
			}
			break;
		}
	}
	if ( !sensor["name"] )
	{
		reply["error"] = cmd + ": Sensor not found";
		return reply;
	}
	if (type == "D")
		sensor["type"] = "Discrete";
	if (type == "O")
		sensor["type"] = "OEM";
	if (type == "E")
		sensor["type"] = "Event Only";
	sensor["raw"] = reading.raw;
	if (reading.threshold_set)
		sensor["value"] = reading.threshold;
	reply["data"]= sensor;
	return reply;
}



JsonObject sysmgrJson::getSensorThresholds( int crate, int fru, std::string sensor, std::string cmd )
{
	JsonObject reply;
	std::vector<sensor_info> sensors = list_sensors( crate, fru );
	std::string type = "";
	for (std::vector<sensor_info>::iterator it = sensors.begin(); it != sensors.end(); it++)
	{
		if( sensor == it->name)
		{
			type += it->type;
			break;
		}
	}

	if (type == "")
	{
		reply["error"] = cmd + ": Sensor not found";
		return reply;
	}
	if (type == "D" || type == "O" || type == "E")
	{
		reply["error"] = cmd + ": " + type + " is an invalid sensor type";
		return reply;
	}
	if (type == "T")
	{
		JsonObject threshold;
		sensor_thresholds thr = get_sensor_thresholds( crate, fru, sensor );
		if (thr.lnc_set)
			threshold["lnc"] = thr.lnc;
		if (thr.lc_set)
			threshold["lc"] = thr.lc;
		if (thr.lnr_set)
			threshold["lnr"] = thr.lnr;
		if (thr.unc_set)
			threshold["unc"] = thr.unc;
		if (thr.uc_set)
			threshold["uc"] = thr.uc;
		if (thr.unr_set)
			threshold["unr"] = thr.unr;
		reply["data"] = threshold;
	}
	return reply;
}

}





