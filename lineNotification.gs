function sendLINENotificationWhenInserted(event) {
  let messageText = `
  イベントが追加されました。
  ${event.start.dateTime}
  タイトル: ${event.summary}
  場所: ${event.location}
  説明: ${event.description.replace('\n', ' ')}`
 
  // LINEから取得したトークン
  let token = LINE_NOTIFY_TOKEN;
  let options = {
    "method" : "post",
    "headers" : {
      "Authorization" : "Bearer "+ token
    },
    "payload" : {
      "message" : messageText
    }
  }

  let url  = "https://notify-api.line.me/api/notify"
  UrlFetchApp.fetch(url, options)
}

function sendLINENotificationWhenPatched(formerEvent, patchedEvent) {
  let messageText = `
  イベントが更新されました。
  ${formerEvent.start.dateTime}
  タイトル: ${formerEvent.summary}
        → ${patchedEvent.summary}
  場所: ${formerEvent.location}
     → ${patchedEvent.location}
  説明: ${formerEvent.description.replace('\n', ' ')}
     → ${patchedEvent.description.replace('\n', ' ')}`
 
  // LINEから取得したトークン
  let token = LINE_NOTIFY_TOKEN;
  let options = {
    "method" : "post",
    "headers" : {
      "Authorization" : "Bearer "+ token
    },
    "payload" : {
      "message" : messageText
    }
  }

  let url  = "https://notify-api.line.me/api/notify"
  UrlFetchApp.fetch(url, options)
}

function sendLINENotificationWhenRemoved(event) {
  let messageText = `
  イベントが削除されました。
  ${event.start.dateTime}
  タイトル: ${event.summary}
  場所: ${event.location}
  説明: ${event.description.replace('\n', ' ')}`
 
  // LINEから取得したトークン
  let token = LINE_NOTIFY_TOKEN;
  let options = {
    "method" : "post",
    "headers" : {
      "Authorization" : "Bearer "+ token
    },
    "payload" : {
      "message" : messageText
    }
  }

  let url  = "https://notify-api.line.me/api/notify"
  UrlFetchApp.fetch(url, options)
}

