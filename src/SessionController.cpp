
#include <boost/foreach.hpp>
#include <boost/date_time/posix_time/posix_time.hpp>
#include <boost/date_time/local_time_adjustor.hpp>
#include <boost/date_time/c_local_time_adjustor.hpp>
#include "sysmgr.h"
#include "SessionController.h"

namespace sysmgr {

#define ONE_DAY 24 * 60 * 60

SessionController::SessionController() : allEvents( 10000 ) {
	using namespace std;
	using namespace boost::posix_time;
	using namespace boost::date_time;

	ptime now = from_time_t( time(NULL ) );
	cout << "SessionController created" << endl
		 << "UTC  : " << now << endl
		 << "local: " << to_simple_string( c_local_adjustor<ptime>::utc_to_local(now) ) << endl;
}

Json::Value event2json( TimeStampedEvent* e )
{
	using namespace boost::posix_time;
	using namespace boost::date_time;

	Json::Value event;
	event[ "crate"] = e->ev.crate;
	event[ "fru"] = e->ev.fru;
	event[ "card"] = e->ev.card;
	event[ "sensor"] = e->ev.sensor;
	event[ e->ev.assertion ? "Assertion" : "Deassertion" ] = true;
	event[ "offset"] = e->ev.offset;
	Json::Value when;
	when["secs"] = (int)(e->when);
	ptime t = from_time_t( e->when );
	when[ "str"] = to_simple_string( c_local_adjustor<ptime>::utc_to_local(t) );

	event["when"] = when;
	return event;
}

Json::Value SessionController::getEvents( int sessionI )
{
	boost::lock_guard<boost::mutex> guard(mtx_);
	Json::Value data;
	Json::Value array(Json::arrayValue);

	if ( sessionI == 0 ) {
		BOOST_FOREACH( eventPtr e, allEvents ) {
			array.append( event2json( e.get() ) );
		}
	} else {
		if ( activeSessions.find( sessionI ) == activeSessions.end() )
			activeSessions[sessionI] = Session( sessionI );

		Session& session = activeSessions[ sessionI ];
		data["from"] = (Json::Int64)session.lastRead;
		BOOST_FOREACH( eventPtr e, session.events ) {
			array.append( event2json( e.get() ) );
		}
		session.id = sessionI;
		session.events.clear();
		session.lastRead = time(NULL);
		data["to"] = (Json::Int64)session.lastRead;
	}
	data["list"] = array;
	return data;
}

void SessionController::storeEvent( const event& e )
{
	using namespace boost::posix_time;

	boost::lock_guard<boost::mutex> guard(mtx_);
	eventPtr ePtr( new TimeStampedEvent(e) );
	allEvents.push_back( ePtr );
	for ( SessionMap::iterator it = activeSessions.begin(); it != activeSessions.end(); ++it ) {
		Session& session = it->second;
		session.events.push_back( ePtr );
		time_t now = time(NULL);
		time_t dt = (now - session.lastRead) / ( 60 * 60 * 24 ); // in days
		if ( dt > 30 ) {
			std::cout << "session# " << session.id << " inactive for " << dt << " days, deleted"<< std::endl;
			activeSessions.erase( it );
		}
	}

}

Json::Value SessionController::getSessionList() {
	Json::Value array;
	BOOST_FOREACH( SessionMap::value_type p, activeSessions ) {
		Session& session = p.second;
		Json::Value j;
		j[ "id"] = session.id;
		j[ "lastRead"] = (Json::Int64)session.lastRead;
		j[ "events"] = (int)session.events.size();
		array.append( j );
	}
	return array;
}


}
