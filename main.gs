var prop = PropertiesService.getScriptProperties().getProperties();
const REFERENCE_CALENDAR_ID = prop.REFERENCE_CALENDAR_ID;
const SYNC_CALENDAR_ID = prop.SYNC_CALENDAR_ID;
const LINE_NOTIFY_TOKEN = prop.LINE_NOTIFY_TOKEN;
const LAST_NAME = prop.LAST_NAME;

function main() {
  logSyncedEvents(false);
  judgeIfNeedsToRemoved();
}

// test function
function deleteAllEvents() {
  const calendarId = prop.testCalendarId; // test
  const SYNC_CALENDAR_ID = prop.SYNC_CALENDAR_ID; // バイト
  var options = {
    maxResults: 500
  }
  while(true) {
    var events = Calendar.Events.list(SYNC_CALENDAR_ID, options);
    if(events.items && events.items.length > 0) {
      for(let i=0; i<events.items.length; i++) {
        var event = events.items[i];
        Calendar.Events.remove(SYNC_CALENDAR_ID, event.id);
      }
    } else {
      Logger.log("削除するイベントがありませんでした。");
      break;
    }
  }
}

function deleteToken() {
  var properties = PropertiesService.getUserProperties();
  properties.deleteProperty('syncToken');
}

/**
 * Helper function to get a new Date object relative to the current date.
 * @param {number} daysOffset The number of days in the future for the new date.
 * @param {number} hour The hour of the day for the new date, in the time zone
 *     of the script.
 * @return {Date} The new date.
 */
function getRelativeDate(daysOffset, hour) {
  var date = new Date();
  date.setDate(date.getDate() + daysOffset);
  date.setHours(hour);
  date.setMinutes(0);
  date.setSeconds(0);
  date.setMilliseconds(0);
  return date;
}

function patchEvent(patchedEvent, patchingEvent) {
  if(patchingEvent.summary == patchedEvent.summary &&
     patchingEvent.description == patchedEvent.description &&
     patchingEvent.start.dateTime == patchingEvent.start.dateTime &&
     patchingEvent.end.dateTime == patchingEvent.end.dateTime) {
       Logger.log("同一のイベントが存在しています。");
       return;
     }

  var resource = {
        summary: patchedEvent.summary,
        location: patchedEvent.location,
        description: patchedEvent.description,
        start: {
          dateTime: patchedEvent.start.dateTime
        },
        end: {
          dateTime: patchedEvent.end.dateTime
        }
      };

  try {
    let formerEvent = patchingEvent;
    let event = Calendar.Events.patch(resource, SYNC_CALENDAR_ID, patchingEvent.id);
    sendLINENotificationWhenPatched(formerEvent, event, LINE_NOTIFY_TOKEN);
    Logger.log("イベントが更新されました。");
  } catch(error) {
    console.error(error);
  }
}

/**
 * @param {object} 参照するイベント
 * @param {string} 同期するカレンダーのID
 */
function insertEvent(event) {
  var resource = {
    summary: event.summary,
    location: event.location,
    description: event.description,
    start: {
      date: event.start.date,
      dateTime: event.start.dateTime,
      timeZone: event.start.timeZone
    },
    end: {
      date: event.end.date,
      dateTime: event.end.dateTime,
      timeZone: event.end.timeZone
    }
  };

  try {
    event = Calendar.Events.insert(resource, SYNC_CALENDAR_ID);
    Logger.log("イベントが追加されました。");
    console.log('%s (%s)', event.summary, event.start.dateTime.toLocaleString());
    sendLINENotificationWhenInserted(event, LINE_NOTIFY_TOKEN);
  } catch(error) {
    console.error(error);
  }
}

// このままではonedayイベントが削除できないが、必要ないはず
function removeEvent(formerEvent, syncCalEvents) { // event:コピー元のイベント calendar API のeventsであることに注意
  try {
    // 条件に当てはまるイベントを１つだけ取り出す
    let removingEvent = syncCalEvents.items.find(Evt => Evt.summary == formerEvent.summary &&
                                                        Evt.description == formerEvent.description &&
                                                        Evt.start.dateTime == formerEvent.start.dateTime);

    if(removingEvent) {
      Calendar.Events.remove(SYNC_CALENDAR_ID, removingEvent.id);
      Logger.log("イベントが削除されました。");
      sendLINENotificationWhenRemoved(removingEvent, LINE_NOTIFY_TOKEN);
    } else {
      Logger.log("削除するイベントがありませんでした。");
    }
  } catch(error) {
    console.error(error);
  }
}

function judgeIfNeedsToRemoved() {
  let options = {
    maxResults: 1000,
    singleEvents: true,
    timeZone: "Asia/Tokyo",
    timeMin: getRelativeDate(-90, 0).toISOString(),
    timeMax: getRelativeDate(90, 0).toISOString()
  }
  let syncCalEvents = Calendar.Events.list(SYNC_CALENDAR_ID, options);
  let referenceCalEvents = Calendar.Events.list(REFERENCE_CALENDAR_ID, options);

  if(syncCalEvents.items && syncCalEvents.items.length > 0) {
    for(var i = 0; i < syncCalEvents.items.length; i++) {
      var syncCalEvent = syncCalEvents.items[i];
      var event = referenceCalEvents.items.find(Evt => Evt.summary == syncCalEvent.summary &&
                                                       Evt.description == syncCalEvent.description &&
                                                       Evt.start.dateTime == syncCalEvent.start.dateTime &&
                                                       Evt.end.dateTime == syncCalEvent.end.dateTime)
      if(event == null) {
        try {
          Calendar.Events.remove(SYNC_CALENDAR_ID, syncCalEvent.id);
          sendLINENotificationWhenRemoved(syncCalEvent, LINE_NOTIFY_TOKEN);
          Logger.log("必要のないイベントが削除されました。");
        } catch(error) {
          console.error(error);
        }
      }    
    }
  }
}

/**
 * Retrieve and log events from the given calendar that have been modified
 * since the last sync. If the sync token is missing or invalid, log all
 * events from up to a month ago (a full sync).
 *
 * @param {string} REFERENCE_CALENDAR_ID The ID of the calender to retrieve events from.
 * @param {boolean} fullSync If true, throw out any existing sync token and
 *        perform a full sync; if false, use the existing sync token if possible.
 */
function logSyncedEvents(fullSync) {
  var properties = PropertiesService.getUserProperties();
  var options = {
    maxResults: 500,
    singleEvents: true,
    timeZone: "Asia/Tokyo",
    showDeleted: true,
  };
  var syncToken = properties.getProperty('syncToken');
  if (syncToken && !fullSync) {
    options.syncToken = syncToken;
  } else {
    Logger.log("fullSyncを行います。");
    properties.deleteProperty('syncToken');

    options.timeMin = getRelativeDate(-7, 0).toISOString();
    options.timeMax = getRelativeDate(90, 0).toISOString();
  }

  // Retrieve events one page at a time.
  var events;
  var syncCalEvents;
  var pageToken;
  var optionsForSyncCal = {
    maxResults: 500,
    singleEvents: true,
    timeZone: "Asia/Tokyo",
    timeMin: getRelativeDate(-7, 0).toISOString(),
    timeMax: getRelativeDate(90, 0).toISOString()
  }

  do {
    try {
      options.pageToken = pageToken;
      events = Calendar.Events.list(REFERENCE_CALENDAR_ID, options);
    } catch {
      // Check to see if the sync token was invalidated by the server;
      // if so, perform a full sync instead.  
      logSyncedEvents(true); // syncTokenの期限が切れた場合
      return;
    }

    try {
      syncCalEvents = Calendar.Events.list(SYNC_CALENDAR_ID, optionsForSyncCal);
    } catch {
      Logger.log("同期先のカレンダーからイベントを取得できませんでした。");
    }

    let eventsItems = events.items.filter(Evt => Evt.description?.includes(LAST_NAME));

    if (eventsItems && eventsItems.length > 0) {
      for (var i = 0; i < eventsItems.length; i++) {
         var event = eventsItems[i];
         if (event.status === 'cancelled') {
           console.log('Event id %s was cancelled.', event.id);
           removeEvent(event, syncCalEvents);
         } else {
           let patchingEvent = syncCalEvents.items.find(Evt => Evt.start.dateTime == event.start.dateTime &&
                                                               Evt.end.dateTime == event.end.dateTime);
           if(patchingEvent) {
             patchEvent(event, patchingEvent);
           } else {
             insertEvent(event);
           }
         }
      }
    } else {
      console.log('No events found.');
    }

    pageToken = events.nextPageToken;
  } while (pageToken);

  properties.setProperty('syncToken', events.nextSyncToken);
}

