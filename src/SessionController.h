/*
 *
 *   session controller for the sysmgr web interface
 *
 *
 * $Author$
 * $Rev$
 * $Date$
 *
 *
 *
 */


#ifndef _SESSIONCONTROLLER_H
#define _SESSIONCONTROLLER_H

#include <boost/smart_ptr.hpp>
#include <boost/circular_buffer.hpp>
#include <boost/thread/mutex.hpp>
#include <boost/date_time/posix_time/posix_time.hpp>
#include "json/json.h"
#include "sysmgr.h"


namespace sysmgr {

class TimeStampedEvent {
	public:
		TimeStampedEvent( event e ) : ev(e) {
			when = time(NULL);
		};
		event ev;
		time_t when;
};

typedef boost::shared_ptr<TimeStampedEvent> eventPtr;

class Session {
	friend class SessionController;
	public:
		Session( int counter = -1 ) {
			time( &lastRead );
			id = counter;
		};
	protected:
		int id;
		std::vector<eventPtr> events;
		time_t lastRead;
};

typedef std::map<int,Session> SessionMap;

class SessionController {
	private:
		SessionController();

	public:
		static SessionController& instance() {
				static SessionController INSTANCE;
				return INSTANCE;
		}

		Json::Value getEvents( int session );
		void storeEvent( const event& e );
		Json::Value getSessionList();

	protected:

		boost::circular_buffer<eventPtr> allEvents;
		SessionMap activeSessions;

		boost::mutex mtx_;
};

};
#endif
